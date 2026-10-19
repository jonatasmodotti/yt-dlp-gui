//! IPC surface. Commands stay thin: validate, delegate, map errors.

use std::path::Path;

use serde::{Serialize, Serializer};
use tauri::{AppHandle, Emitter, Manager, State};
use ts_rs::TS;

use crate::binaries::{self, EngineStatus, Tool};
use crate::browsers::{self, BrowserInfo};
use crate::builder::{self, BuildError, BuiltCommand};
use crate::cookie_file::{self, CookieFileReport};
use crate::errors;
use crate::jobs::{self, JobEvent, JobManager, JobUpdate};
use crate::options::{CookieSource, DownloadRequest, EngineSettings};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error(transparent)]
    Build(#[from] BuildError),
    #[error("{0}")]
    Engine(String),
    #[error("{0}")]
    Invalid(String),
}

/// Errors reach the frontend as plain strings.
impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CommandPreview {
    pub program: String,
    pub args: Vec<String>,
    pub warnings: Vec<String>,
}

#[tauri::command]
pub async fn engine_status(engine: EngineSettings) -> EngineStatus {
    let (ytdlp, ffmpeg) = tokio::join!(
        binaries::probe(Tool::YtDlp, engine.ytdlp_path.as_deref()),
        binaries::probe(Tool::Ffmpeg, engine.ffmpeg_path.as_deref()),
    );
    EngineStatus { ytdlp, ffmpeg }
}

fn build(request: &DownloadRequest) -> Result<BuiltCommand, BuildError> {
    let ffmpeg = binaries::resolve(Tool::Ffmpeg, request.engine.ffmpeg_path.as_deref()).ok().map(|(p, _)| p);
    builder::build(request, ffmpeg.as_deref())
}

#[tauri::command]
pub fn preview_command(request: DownloadRequest) -> Result<CommandPreview, AppError> {
    let built = build(&request)?;
    let program = binaries::resolve(Tool::YtDlp, request.engine.ytdlp_path.as_deref())
        .map(|(p, _)| p.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "yt-dlp".into());
    Ok(CommandPreview { program, args: built.args, warnings: built.warnings })
}

#[tauri::command]
pub async fn start_download(app: AppHandle, mut request: DownloadRequest) -> Result<String, AppError> {
    if !Path::new(&request.output_dir).is_dir() {
        return Err(AppError::Invalid("The output folder doesn't exist.".into()));
    }
    let cookies = request.options.cookies.clone();
    // Lives until the job ends; yt-dlp only ever sees (and rewrites) the copy.
    let cookie_copy = private_cookie_copy(&mut request)?;
    let (program, _) =
        binaries::resolve(Tool::YtDlp, request.engine.ytdlp_path.as_deref()).map_err(AppError::Engine)?;
    let built = build(&request)?;

    let manager = app.state::<JobManager>();
    let (job_id, cancel) = manager.register();

    let mut argv = vec![program.to_string_lossy().into_owned()];
    argv.extend(built.args.iter().cloned());
    let emit = {
        let app = app.clone();
        let job_id = job_id.clone();
        move |update: JobUpdate| {
            let _ = app.emit(jobs::EVENT, JobEvent { job_id: job_id.clone(), update });
        }
    };
    emit(JobUpdate::Started { url: request.url.trim().to_string(), argv, warnings: built.warnings });

    let id = job_id.clone();
    tauri::async_runtime::spawn(async move {
        let spawn_app = app.clone();
        let spawn_id = id.clone();
        let mut outcome = jobs::run(
            program,
            built.args,
            cancel,
            move |pid| spawn_app.state::<JobManager>().set_pid(&spawn_id, pid),
            &emit,
        )
        .await;
        drop(cookie_copy);
        if let Some(error) = outcome.error.as_mut() {
            errors::refine_for_cookies(error, &cookies);
        }
        app.state::<JobManager>().finish(&id);
        emit(JobUpdate::Finished(outcome));
    });

    Ok(job_id)
}

/// yt-dlp writes the `--cookies` file back on exit, which would clobber the
/// user's file (or any path the webview names). Validate it, then point yt-dlp
/// at a private temporary copy instead.
fn private_cookie_copy(request: &mut DownloadRequest) -> Result<Option<tempfile::TempDir>, AppError> {
    let CookieSource::File { path } = &request.options.cookies else { return Ok(None) };
    let report = cookie_file::inspect(path);
    if !report.valid {
        let message = report.message.unwrap_or_else(|| "The cookies file isn't valid.".into());
        return Err(AppError::Invalid(message));
    }
    let failed = |e: std::io::Error| AppError::Invalid(format!("Couldn't read the cookies file: {e}"));
    let dir = tempfile::tempdir().map_err(failed)?;
    let copy = dir.path().join("cookies.txt");
    std::fs::copy(path, &copy).map_err(failed)?;
    request.options.cookies = CookieSource::File { path: copy.to_string_lossy().into_owned() };
    Ok(Some(dir))
}

#[tauri::command]
pub fn cancel_download(manager: State<'_, JobManager>, job_id: String) -> bool {
    manager.cancel(&job_id)
}

#[tauri::command]
pub fn detect_browsers() -> Vec<BrowserInfo> {
    browsers::detect()
}

// async: reads a file of up to 10 MB, so keep it off the main thread.
#[tauri::command]
pub async fn inspect_cookie_file(path: String) -> CookieFileReport {
    cookie_file::inspect(&path)
}
