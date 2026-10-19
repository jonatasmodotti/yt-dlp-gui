//! Runs yt-dlp jobs and streams their state to the UI as [`JobEvent`]s.

use std::collections::{HashMap, VecDeque};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};

use serde::Serialize;
use tokio::io::{AsyncBufReadExt, AsyncRead, BufReader};
use tokio::process::Command;
use tokio::sync::{mpsc, oneshot};
use ts_rs::TS;

use crate::errors::{self, JobError};
use crate::process;
use crate::progress::{self, Line, Meta, Progress, Tracker};

/// Tauri event name carrying [`JobEvent`] payloads.
pub const EVENT: &str = "ytdlp://job";

const PROGRESS_INTERVAL: Duration = Duration::from_millis(100);
const STDERR_KEEP: usize = 200;
/// Printed instead of an error because the builder passes `--ignore-errors`.
pub const SUBTITLE_FAILED: &str = "WARNING: Unable to download video subtitles";

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JobEvent {
    pub job_id: String,
    pub update: JobUpdate,
}

#[derive(Debug, Clone, PartialEq, Serialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum JobUpdate {
    Started {
        url: String,
        argv: Vec<String>,
        warnings: Vec<String>,
    },
    Meta(Meta),
    Progress(Progress),
    /// A yt-dlp postprocessor (Merger, EmbedThumbnail, ExtractAudio, …).
    PostProcess {
        name: String,
        status: String,
    },
    FileDone {
        path: String,
    },
    /// Something the user should know even though the job keeps going.
    Warning {
        message: String,
    },
    Log {
        stream: LogStream,
        line: String,
    },
    Finished(Outcome),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum LogStream {
    Stdout,
    Stderr,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum JobStatus {
    Completed,
    /// Some items (e.g. playlist entries) failed, others were saved.
    Partial,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Outcome {
    pub status: JobStatus,
    pub error: Option<JobError>,
    pub files: u32,
}

/// Tracks running jobs so they can be cancelled.
#[derive(Default)]
pub struct JobManager {
    next_id: AtomicU64,
    running: Mutex<HashMap<String, Running>>,
}

struct Running {
    pid: Option<u32>,
    cancel: Option<oneshot::Sender<()>>,
}

impl JobManager {
    pub fn register(&self) -> (String, oneshot::Receiver<()>) {
        let id = format!("job-{}", self.next_id.fetch_add(1, Ordering::Relaxed) + 1);
        let (tx, rx) = oneshot::channel();
        self.lock().insert(id.clone(), Running { pid: None, cancel: Some(tx) });
        (id, rx)
    }

    pub fn set_pid(&self, id: &str, pid: u32) {
        if let Some(job) = self.lock().get_mut(id) {
            job.pid = Some(pid);
        }
    }

    /// Returns false if the job isn't running.
    pub fn cancel(&self, id: &str) -> bool {
        match self.lock().get_mut(id).and_then(|j| j.cancel.take()) {
            Some(tx) => tx.send(()).is_ok(),
            None => false,
        }
    }

    pub fn finish(&self, id: &str) {
        self.lock().remove(id);
    }

    /// Hard-stop everything; used when the app exits.
    pub fn kill_all(&self) {
        for job in self.lock().values() {
            if let Some(pid) = job.pid {
                process::kill_tree(pid);
            }
        }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, HashMap<String, Running>> {
        self.running.lock().unwrap_or_else(|e| e.into_inner())
    }
}

/// Run one yt-dlp process to completion, reporting through `emit`.
pub async fn run(
    program: PathBuf,
    args: Vec<String>,
    mut cancel: oneshot::Receiver<()>,
    on_spawn: impl FnOnce(u32),
    mut emit: impl FnMut(JobUpdate),
) -> Outcome {
    let mut cmd = Command::new(&program);
    cmd.args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .env("PATH", crate::binaries::child_path(&program))
        .kill_on_drop(true);
    process::no_window(&mut cmd);
    process::own_process_group(&mut cmd);

    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(e) => {
            let message = format!("Couldn't start {}: {e}", program.display());
            let hint = "Check the yt-dlp path in Settings.".into();
            return failed(JobError { kind: errors::ErrorKind::Unknown, message, hint });
        }
    };
    let pid = child.id();
    if let Some(pid) = pid {
        on_spawn(pid);
    }

    let (tx, mut rx) = mpsc::channel::<(LogStream, String)>(512);
    if let Some(out) = child.stdout.take() {
        tokio::spawn(read_lines(out, LogStream::Stdout, tx.clone()));
    }
    if let Some(err) = child.stderr.take() {
        tokio::spawn(read_lines(err, LogStream::Stderr, tx.clone()));
    }
    drop(tx);

    let mut state = RunState::default();
    let mut cancel_seen = false;
    let mut cancelled = false;
    let mut kill_deadline: Option<tokio::time::Instant> = None;

    let exit = loop {
        let deadline = kill_deadline;
        tokio::select! {
            Some((stream, line)) = rx.recv() => state.handle(stream, line, &mut emit),
            status = child.wait() => break status,
            res = &mut cancel, if !cancel_seen => {
                cancel_seen = true;
                if res.is_ok() {
                    cancelled = true;
                    if let Some(pid) = pid { process::terminate_tree(pid); }
                    kill_deadline = Some(tokio::time::Instant::now() + Duration::from_secs(5));
                }
            }
            _ = sleep_until(deadline), if deadline.is_some() => {
                kill_deadline = None;
                match pid {
                    Some(pid) => process::kill_tree(pid),
                    None => { let _ = child.start_kill(); }
                }
            }
        }
    };
    // yt-dlp may exit on SIGTERM before its ffmpeg children do; the process
    // group outlives the leader, so this is safe. Unix only: Windows already
    // used `taskkill /T /F`, and a late second call could hit a reused PID.
    #[cfg(unix)]
    if cancelled && let Some(pid) = pid {
        process::kill_tree(pid);
    }

    // Drain output still buffered after exit. Bounded, because an orphaned
    // grandchild could keep the pipe open.
    let _ = tokio::time::timeout(Duration::from_secs(2), async {
        while let Some((stream, line)) = rx.recv().await {
            state.handle(stream, line, &mut emit);
        }
    })
    .await;

    let success = exit.map(|s| s.success()).unwrap_or(false);
    let files = state.files;
    // A clean exit wins over a cancel that raced with completion.
    if success {
        Outcome { status: JobStatus::Completed, error: None, files }
    } else if cancelled {
        Outcome { status: JobStatus::Cancelled, error: None, files }
    } else {
        let error = errors::classify(state.stderr.make_contiguous());
        let status = if files > 0 { JobStatus::Partial } else { JobStatus::Failed };
        Outcome { status, error: Some(error), files }
    }
}

fn failed(error: JobError) -> Outcome {
    Outcome { status: JobStatus::Failed, error: Some(error), files: 0 }
}

async fn sleep_until(deadline: Option<tokio::time::Instant>) {
    match deadline {
        Some(d) => tokio::time::sleep_until(d).await,
        None => std::future::pending().await,
    }
}

async fn read_lines(reader: impl AsyncRead + Unpin, stream: LogStream, tx: mpsc::Sender<(LogStream, String)>) {
    let mut reader = BufReader::new(reader);
    let mut buf = Vec::new();
    loop {
        buf.clear();
        match reader.read_until(b'\n', &mut buf).await {
            Ok(0) | Err(_) => break,
            Ok(_) => {
                // Lossy: Windows consoles can still emit non-UTF-8 bytes.
                let line = String::from_utf8_lossy(&buf).trim_end_matches(['\r', '\n']).to_string();
                if tx.send((stream, line)).await.is_err() {
                    break;
                }
            }
        }
    }
}

#[derive(Default)]
struct RunState {
    tracker: Tracker,
    last_progress: Option<Instant>,
    stderr: VecDeque<String>,
    files: u32,
    subtitle_warned: bool,
}

impl RunState {
    /// Protocol lines can arrive on either stream: download ticks and
    /// `--print` go to stdout, but postprocess progress goes to stderr.
    fn handle(&mut self, stream: LogStream, line: String, emit: &mut impl FnMut(JobUpdate)) {
        match progress::parse_line(&line) {
            Some(Line::Meta(meta)) => {
                self.tracker.on_meta(&meta);
                emit(JobUpdate::Meta(meta));
            }
            Some(Line::Download(tick)) => {
                let Some(p) = self.tracker.on_tick(&tick) else { return };
                let due = self.last_progress.is_none_or(|t| t.elapsed() >= PROGRESS_INTERVAL);
                if due || tick.finished {
                    self.last_progress = Some(Instant::now());
                    emit(JobUpdate::Progress(p));
                }
            }
            Some(Line::PostProcess { status, name }) => emit(JobUpdate::PostProcess { name, status }),
            Some(Line::Done { path }) => {
                self.files += 1;
                emit(JobUpdate::FileDone { path });
            }
            None => {
                // yt-dlp echoes malformed cookies.txt lines, values included.
                let line = if line.starts_with("WARNING: skipping cookie file entry") {
                    "WARNING: skipping cookie file entry (details redacted)".to_string()
                } else {
                    line
                };
                if line.starts_with(SUBTITLE_FAILED) && !self.subtitle_warned {
                    self.subtitle_warned = true;
                    emit(JobUpdate::Warning {
                        message: "Some subtitle tracks couldn't be downloaded. YouTube often refuses \
                            auto-translated captions; see the log for which ones."
                            .into(),
                    });
                }
                if stream == LogStream::Stderr {
                    if self.stderr.len() == STDERR_KEEP {
                        self.stderr.pop_front();
                    }
                    self.stderr.push_back(line.clone());
                }
                emit(JobUpdate::Log { stream, line });
            }
        }
    }
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;
    use std::path::Path;

    /// A fake yt-dlp that replays protocol lines, then exits with `code`.
    fn fake_ytdlp(dir: &std::path::Path, body: &str) -> PathBuf {
        let path = dir.join("yt-dlp");
        std::fs::write(&path, format!("#!/bin/sh\n{body}\n")).unwrap();
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
        path
    }

    async fn run_fake(body: &str, cancel_after: Option<Duration>) -> (Outcome, Vec<JobUpdate>) {
        let dir = tempfile::tempdir().unwrap();
        let program = fake_ytdlp(dir.path(), body);
        let (tx, rx) = oneshot::channel();
        if let Some(after) = cancel_after {
            tokio::spawn(async move {
                tokio::time::sleep(after).await;
                let _ = tx.send(());
            });
        } else {
            std::mem::forget(tx);
        }
        let mut events = Vec::new();
        let outcome = run(program, vec![], rx, |_| {}, |e| events.push(e)).await;
        (outcome, events)
    }

    #[tokio::test]
    async fn reports_progress_files_and_success() {
        let (outcome, events) = run_fake(
            r#"echo 'YTGUI|meta|abc|NA|NA|100|"Title"'
echo 'YTGUI|dl|finished|100|100|NA|50.0|0|NA|NA|abc|18'
echo 'YTGUI|pp|started|Merger|abc' >&2
echo 'YTGUI|done|abc|"/tmp/Title [abc].mp4"'
echo '[info] hello'"#,
            None,
        )
        .await;
        assert_eq!(outcome, Outcome { status: JobStatus::Completed, error: None, files: 1 });
        assert!(events.iter().any(|e| matches!(e, JobUpdate::Progress(p) if p.percent == Some(100.0))));
        assert!(events.contains(&JobUpdate::FileDone { path: "/tmp/Title [abc].mp4".into() }));
        assert!(events.contains(&JobUpdate::PostProcess { name: "Merger".into(), status: "started".into() }));
        assert!(events.contains(&JobUpdate::Log { stream: LogStream::Stdout, line: "[info] hello".into() }));
    }

    #[tokio::test]
    async fn classifies_failure_from_stderr() {
        let (outcome, _) = run_fake("echo 'ERROR: [youtube] x: Video unavailable' >&2; exit 1", None).await;
        assert_eq!(outcome.status, JobStatus::Failed);
        assert_eq!(outcome.error.unwrap().kind, errors::ErrorKind::Unavailable);
    }

    #[tokio::test]
    async fn surfaces_failed_subtitles_once_without_failing() {
        let (outcome, events) = run_fake(
            r#"echo "WARNING: Unable to download video subtitles for 'pt': HTTP Error 429: Too Many Requests" >&2
echo "WARNING: Unable to download video subtitles for 'es': HTTP Error 429: Too Many Requests" >&2
echo 'YTGUI|done|a|"/tmp/a.mp4"'"#,
            None,
        )
        .await;
        assert_eq!(outcome.status, JobStatus::Completed);
        assert_eq!(events.iter().filter(|e| matches!(e, JobUpdate::Warning { .. })).count(), 1);
    }

    #[tokio::test]
    async fn partial_when_some_files_saved() {
        let (outcome, _) = run_fake("echo 'YTGUI|done|a|\"/tmp/a.mp4\"'; echo 'ERROR: boom' >&2; exit 1", None).await;
        assert_eq!(outcome.status, JobStatus::Partial);
    }

    #[tokio::test]
    async fn cancel_stops_the_process_group() {
        // The child `sleep` stands in for an ffmpeg grandchild.
        let started = Instant::now();
        let (outcome, _) = run_fake("sleep 30 & wait", Some(Duration::from_millis(200))).await;
        assert_eq!(outcome.status, JobStatus::Cancelled);
        // If only `sh` died, the orphaned `sleep` would hold the pipe open
        // until the 2 s drain timeout; finishing well before proves the
        // whole group was killed.
        assert!(started.elapsed() < Duration::from_millis(1500), "took {:?}", started.elapsed());
    }

    /// End-to-end against the real yt-dlp + network:
    /// `cargo test -- --ignored live_download`
    #[tokio::test]
    #[ignore]
    async fn live_download() {
        use crate::binaries::{Tool, resolve};
        use crate::options::{DownloadOptions, DownloadRequest, EngineSettings, ThumbnailMode};

        let out = tempfile::tempdir().unwrap();
        let mut options = DownloadOptions { thumbnail: ThumbnailMode::Embed, ..Default::default() };
        options.subtitles.enabled = true;
        let request = DownloadRequest {
            url: "https://www.youtube.com/watch?v=jNQXAC9IVRw".into(),
            output_dir: out.path().to_string_lossy().into(),
            options,
            engine: EngineSettings::default(),
        };
        let (program, _) = resolve(Tool::YtDlp, None).expect("yt-dlp on PATH");
        let ffmpeg = resolve(Tool::Ffmpeg, None).ok().map(|(p, _)| p);
        let built = crate::builder::build(&request, ffmpeg.as_deref()).unwrap();

        let (_tx, rx) = oneshot::channel();
        let mut events = Vec::new();
        let outcome = run(program, built.args, rx, |_| {}, |e| events.push(e)).await;
        assert_eq!(outcome.status, JobStatus::Completed, "{outcome:?}\n{events:#?}");
        // Run under `env -i PATH=/usr/bin:/bin` to mimic a Finder launch: the
        // child PATH must still let yt-dlp find deno.
        assert!(
            !events.iter().any(|e| matches!(e, JobUpdate::Log { line, .. } if line.contains("JavaScript runtime"))),
            "yt-dlp couldn't find a JS runtime"
        );

        let percents: Vec<f64> =
            events.iter().filter_map(|e| if let JobUpdate::Progress(p) = e { p.percent } else { None }).collect();
        assert!(percents.windows(2).all(|w| w[1] >= w[0]), "progress must be monotonic: {percents:?}");
        assert_eq!(percents.last().copied(), Some(100.0));
        // Postprocess progress arrives on stderr; this guards the dual-stream parsing.
        assert!(events.iter().any(|e| matches!(e, JobUpdate::PostProcess { name, .. } if name == "Merger")));
        let Some(JobUpdate::FileDone { path }) = events.iter().find(|e| matches!(e, JobUpdate::FileDone { .. })) else {
            panic!("no file reported")
        };
        assert!(path.ends_with("Me at the zoo [jNQXAC9IVRw].mp4") && Path::new(path).is_file());
        assert!(out.path().join("Me at the zoo [jNQXAC9IVRw].en.srt").is_file());
    }

    #[test]
    fn manager_cancel_and_finish() {
        let m = JobManager::default();
        let (id, mut rx) = m.register();
        assert_eq!(id, "job-1");
        assert!(m.cancel(&id));
        assert!(rx.try_recv().is_ok());
        assert!(!m.cancel(&id), "second cancel is a no-op");
        m.finish(&id);
        assert!(!m.cancel(&id));
    }
}
