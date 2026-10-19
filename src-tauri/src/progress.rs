//! Machine-readable progress protocol between yt-dlp and the app.
//!
//! We ask yt-dlp (via `--progress-template` / `--print`) to emit lines prefixed
//! with [`PREFIX`]; everything else is human log output. The templates and the
//! parser live side by side so they cannot drift apart.

use serde::Serialize;
use ts_rs::TS;

pub const PREFIX: &str = "YTGUI|";

/// Args that make yt-dlp speak the protocol below.
pub fn protocol_args() -> Vec<String> {
    [
        "--newline",
        "--progress",
        "--no-simulate",
        "--progress-template",
        "download:YTGUI|dl|%(progress.status)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s|%(progress.fragment_index)s|%(progress.fragment_count)s|%(info.id)s|%(info.format_id)s",
        "--progress-template",
        "postprocess:YTGUI|pp|%(progress.status)s|%(progress.postprocessor)s|%(info.id)s",
        // Title and path are JSON-encoded and always last, so they may contain `|`.
        "--print",
        "video:YTGUI|meta|%(id)s|%(playlist_index)s|%(n_entries,playlist_count)s|%(filesize,filesize_approx)s|%(title)j",
        "--print",
        "after_move:YTGUI|done|%(id)s|%(filepath)j",
    ]
    .into_iter()
    .map(String::from)
    .collect()
}

#[derive(Debug, Clone, PartialEq)]
pub enum Line {
    Download(DownloadTick),
    PostProcess { status: String, name: String },
    Meta(Meta),
    Done { path: String },
}

#[derive(Debug, Clone, PartialEq)]
pub struct DownloadTick {
    pub finished: bool,
    pub downloaded: Option<u64>,
    pub total: Option<u64>,
    pub speed: Option<f64>,
    pub eta: Option<u64>,
    pub fragment_index: Option<u64>,
    pub fragment_count: Option<u64>,
    /// `None` for auxiliary downloads (subtitles, thumbnails).
    pub format_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Meta {
    pub video_id: String,
    pub title: String,
    pub playlist_index: Option<u32>,
    pub playlist_count: Option<u32>,
    #[ts(type = "number | null")]
    pub expected_bytes: Option<u64>,
}

/// yt-dlp renders missing template fields as `NA`.
fn field<T: std::str::FromStr>(s: &str) -> Option<T> {
    if s == "NA" || s.is_empty() {
        return None;
    }
    s.parse().ok()
}

/// Byte counts and ETAs sometimes arrive as floats (`1234.0`).
fn int_field(s: &str) -> Option<u64> {
    field::<u64>(s).or_else(|| field::<f64>(s).filter(|v| *v >= 0.0).map(|v| v as u64))
}

fn json_string(s: &str) -> Option<String> {
    serde_json::from_str::<String>(s).ok()
}

/// Parse one stdout line. Returns `None` for ordinary log lines.
pub fn parse_line(line: &str) -> Option<Line> {
    let rest = line.trim_end().strip_prefix(PREFIX)?;
    let (kind, rest) = rest.split_once('|')?;
    match kind {
        "dl" => {
            let f: Vec<&str> = rest.split('|').collect();
            if f.len() < 10 {
                return None;
            }
            Some(Line::Download(DownloadTick {
                finished: f[0] == "finished",
                downloaded: int_field(f[1]),
                total: int_field(f[2]).or_else(|| int_field(f[3])),
                speed: field(f[4]),
                eta: int_field(f[5]),
                fragment_index: int_field(f[6]),
                fragment_count: int_field(f[7]),
                format_id: field(f[9]),
            }))
        }
        "pp" => {
            let mut f = rest.split('|');
            Some(Line::PostProcess { status: f.next()?.to_string(), name: f.next()?.to_string() })
        }
        "meta" => {
            let f: Vec<&str> = rest.splitn(5, '|').collect();
            if f.len() < 5 {
                return None;
            }
            Some(Line::Meta(Meta {
                video_id: f[0].to_string(),
                playlist_index: field(f[1]),
                playlist_count: field(f[2]),
                expected_bytes: int_field(f[3]),
                title: json_string(f[4]).unwrap_or_else(|| f[4].to_string()),
            }))
        }
        "done" => {
            let (_id, path) = rest.split_once('|')?;
            Some(Line::Done { path: json_string(path)? })
        }
        _ => None,
    }
}

/// Snapshot sent to the UI.
#[derive(Debug, Clone, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Progress {
    /// 0–100 across all streams of the current item; `None` if unknown.
    pub percent: Option<f64>,
    #[ts(type = "number")]
    pub downloaded_bytes: u64,
    #[ts(type = "number | null")]
    pub total_bytes: Option<u64>,
    /// Bytes per second.
    pub speed: Option<f64>,
    /// Seconds remaining for the current stream.
    #[ts(type = "number | null")]
    pub eta: Option<u64>,
}

/// Turns per-stream ticks into one overall percentage per item, so a merged
/// video+audio download doesn't run 0→100% twice.
#[derive(Debug, Default)]
pub struct Tracker {
    video_id: Option<String>,
    expected: Option<u64>,
    completed: u64,
    /// Highest percent shown for this item; the bar never moves backwards.
    shown: f64,
}

impl Tracker {
    pub fn on_meta(&mut self, meta: &Meta) {
        if self.video_id.as_deref() == Some(meta.video_id.as_str()) {
            // "Download all" selects two formats of the same video; yt-dlp
            // announces each. Grow the total instead of starting over, and
            // let the bar step back once to the true share rather than sit at 100%.
            self.expected = self.expected.zip(meta.expected_bytes).map(|(a, b)| a + b);
            self.shown = 0.0;
            return;
        }
        *self = Tracker { video_id: Some(meta.video_id.clone()), expected: meta.expected_bytes, ..Default::default() };
    }

    /// Returns `None` for auxiliary downloads that shouldn't move the bar.
    pub fn on_tick(&mut self, t: &DownloadTick) -> Option<Progress> {
        t.format_id.as_ref()?;
        let downloaded = t.downloaded.unwrap_or(0);
        let done_so_far = self.completed + downloaded;
        // Only a known stream size may extend the denominator; otherwise an
        // unknown-size download would read as 100% from the first byte.
        let known = t.total.map(|total| self.completed + total);
        let denominator = match (self.expected, known) {
            (Some(e), Some(k)) => Some(e.max(k)),
            (e, k) => e.or(k),
        }
        .filter(|d| *d > 0);

        let percent = match (denominator, t.fragment_index, t.fragment_count) {
            (Some(d), _, _) => Some(done_so_far as f64 / d as f64 * 100.0),
            (None, Some(i), Some(n)) if n > 0 => Some(i as f64 / n as f64 * 100.0),
            _ => None,
        }
        .map(|p| {
            self.shown = p.clamp(0.0, 100.0).max(self.shown);
            self.shown
        });

        if t.finished {
            self.completed += t.total.unwrap_or(downloaded);
        }

        Some(Progress { percent, downloaded_bytes: done_so_far, total_bytes: denominator, speed: t.speed, eta: t.eta })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Lines captured from yt-dlp 2026.08.19 downloading jNQXAC9IVRw.
    const META: &str = r#"YTGUI|meta|jNQXAC9IVRw|NA|NA|533067|"Me at the zoo""#;
    const SUB_TICK: &str = "YTGUI|dl|finished|416|416|NA|1922.06|NA|NA|NA|NA|NA";
    const VIDEO_TICK: &str = "YTGUI|dl|downloading|111889|223779|NA|1894953.8|0|NA|NA|jNQXAC9IVRw|395";
    const VIDEO_DONE: &str = "YTGUI|dl|finished|223779|223779|NA|1894953.8|NA|NA|NA|jNQXAC9IVRw|395";
    const AUDIO_TICK: &str = "YTGUI|dl|downloading|261120|309288|NA|33740500.9|0|NA|NA|jNQXAC9IVRw|140";

    #[test]
    fn ignores_log_lines() {
        assert_eq!(parse_line("[youtube] Extracting URL"), None);
        assert_eq!(parse_line("YTGUI|bogus|x"), None);
    }

    #[test]
    fn parses_meta_with_json_title() {
        let Some(Line::Meta(m)) = parse_line(META) else { panic!() };
        assert_eq!(m.video_id, "jNQXAC9IVRw");
        assert_eq!(m.title, "Me at the zoo");
        assert_eq!(m.expected_bytes, Some(533067));
        assert_eq!(m.playlist_index, None);

        let Some(Line::Meta(m)) = parse_line(r#"YTGUI|meta|x|3|12|NA|"a | b \"c\"""#) else { panic!() };
        assert_eq!(m.title, r#"a | b "c""#);
        assert_eq!((m.playlist_index, m.playlist_count), (Some(3), Some(12)));
    }

    #[test]
    fn parses_postprocess_and_done() {
        assert_eq!(
            parse_line("YTGUI|pp|started|Merger|jNQXAC9IVRw"),
            Some(Line::PostProcess { status: "started".into(), name: "Merger".into() })
        );
        assert_eq!(parse_line(r#"YTGUI|done|id|"/tmp/a|b.mp4""#), Some(Line::Done { path: "/tmp/a|b.mp4".into() }));
    }

    #[test]
    fn overall_percent_spans_merged_streams() {
        let mut t = Tracker::default();
        let Some(Line::Meta(m)) = parse_line(META) else { panic!() };
        t.on_meta(&m);

        let Some(Line::Download(sub)) = parse_line(SUB_TICK) else { panic!() };
        assert_eq!(t.on_tick(&sub), None, "subtitle download must not move the bar");

        let Some(Line::Download(v)) = parse_line(VIDEO_TICK) else { panic!() };
        let p = t.on_tick(&v).unwrap();
        assert!((p.percent.unwrap() - 20.99).abs() < 0.1, "{p:?}");

        let Some(Line::Download(vd)) = parse_line(VIDEO_DONE) else { panic!() };
        t.on_tick(&vd);
        let Some(Line::Download(a)) = parse_line(AUDIO_TICK) else { panic!() };
        let p = t.on_tick(&a).unwrap();
        assert!((p.percent.unwrap() - 90.95).abs() < 0.1, "{p:?}");
        assert_eq!(p.total_bytes, Some(533067));
    }

    #[test]
    fn bundle_meta_for_same_video_extends_instead_of_resetting() {
        let mut t = Tracker::default();
        let Some(Line::Meta(video)) = parse_line(r#"YTGUI|meta|abc|NA|NA|1000|"T""#) else { panic!() };
        let Some(Line::Meta(audio)) = parse_line(r#"YTGUI|meta|abc|NA|NA|200|"T""#) else { panic!() };
        t.on_meta(&video);
        let Some(Line::Download(done)) = parse_line("YTGUI|dl|finished|1000|1000|NA|1|NA|NA|NA|abc|1+2") else {
            panic!()
        };
        let p1 = t.on_tick(&done).unwrap().percent.unwrap();
        t.on_meta(&audio);
        let Some(Line::Download(a)) = parse_line("YTGUI|dl|downloading|100|200|NA|1|1|NA|NA|abc|2") else { panic!() };
        let p2 = t.on_tick(&a).unwrap();
        assert_eq!(p1, 100.0);
        assert!((p2.percent.unwrap() - 91.67).abs() < 0.1, "continues from the video's share: {p2:?}");
        assert_eq!(p2.total_bytes, Some(1200));

        let Some(Line::Meta(next)) = parse_line(r#"YTGUI|meta|other|2|5|10|"U""#) else { panic!() };
        t.on_meta(&next);
        let Some(Line::Download(n)) = parse_line("YTGUI|dl|downloading|1|10|NA|1|1|NA|NA|other|18") else { panic!() };
        assert_eq!(t.on_tick(&n).unwrap().percent, Some(10.0), "a new item starts fresh");
    }

    #[test]
    fn unknown_size_is_indeterminate_not_full() {
        let mut t = Tracker::default();
        let Some(Line::Download(tick)) = parse_line("YTGUI|dl|downloading|5000|NA|NA|1|NA|NA|NA|id|18") else {
            panic!()
        };
        assert_eq!(t.on_tick(&tick).unwrap().percent, None);
    }

    #[test]
    fn falls_back_to_fragments_when_sizes_unknown() {
        let mut t = Tracker::default();
        let tick = parse_line("YTGUI|dl|downloading|NA|NA|NA|NA|NA|5|20|id|hls-1").unwrap();
        let Line::Download(tick) = tick else { panic!() };
        assert_eq!(t.on_tick(&tick).unwrap().percent, Some(25.0));
    }
}
