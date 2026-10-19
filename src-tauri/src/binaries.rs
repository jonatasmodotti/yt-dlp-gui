//! Locates yt-dlp and ffmpeg.
//!
//! Order: user override → bundled next to the app executable (future sidecar)
//! → PATH → well-known install dirs. The last step matters on macOS, where
//! apps launched from Finder don't inherit the shell's PATH (no Homebrew).

use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::Serialize;
use ts_rs::TS;

use crate::process::no_window;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum BinarySource {
    Custom,
    Bundled,
    System,
}

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BinaryInfo {
    pub path: Option<String>,
    pub version: Option<String>,
    pub source: Option<BinarySource>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EngineStatus {
    pub ytdlp: BinaryInfo,
    pub ffmpeg: BinaryInfo,
}

#[derive(Debug, Clone, Copy)]
pub enum Tool {
    YtDlp,
    Ffmpeg,
}

impl Tool {
    fn file_name(self) -> String {
        let stem = match self {
            Tool::YtDlp => "yt-dlp",
            Tool::Ffmpeg => "ffmpeg",
        };
        format!("{stem}{}", std::env::consts::EXE_SUFFIX)
    }

    /// Defence in depth: a custom path must look like the real tool and be
    /// executable, so a compromised webview can't point us at an arbitrary
    /// file (e.g. one it just downloaded).
    fn acceptable_custom(self, path: &Path) -> bool {
        let name = path.file_name().map(|n| n.to_string_lossy().to_lowercase()).unwrap_or_default();
        let name_ok = match self {
            Tool::YtDlp => name.starts_with("yt-dlp") || name.starts_with("yt_dlp"),
            Tool::Ffmpeg => name.starts_with("ffmpeg"),
        };
        name_ok && path.is_file() && is_executable(path)
    }
}

#[cfg(unix)]
fn is_executable(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(path).map(|m| m.permissions().mode() & 0o111 != 0).unwrap_or(false)
}

#[cfg(windows)]
fn is_executable(path: &Path) -> bool {
    path.extension().is_some_and(|e| e.eq_ignore_ascii_case("exe"))
}

fn extra_dirs() -> Vec<PathBuf> {
    let home = dirs::home_dir().unwrap_or_default();
    if cfg!(windows) {
        let local = dirs::data_local_dir().unwrap_or_default();
        vec![
            local.join("Microsoft").join("WinGet").join("Links"),
            home.join("scoop").join("shims"),
            home.join(".local").join("bin"), // pipx default
            PathBuf::from(r"C:\ProgramData\chocolatey\bin"),
        ]
    } else {
        vec![
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/opt/local/bin"),
            PathBuf::from("/usr/bin"),
            PathBuf::from("/snap/bin"),
            home.join(".local").join("bin"),
            home.join("bin"),
            home.join(".deno").join("bin"),
        ]
    }
}

fn search_dirs() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> =
        std::env::var_os("PATH").map(|p| std::env::split_paths(&p).collect()).unwrap_or_default();
    dirs.extend(extra_dirs());
    dirs
}

/// PATH for yt-dlp itself: the inherited PATH, then the folder yt-dlp lives
/// in and the well-known dirs. GUI launches (Finder, desktop files) get a bare
/// PATH, and yt-dlp needs it to find a JS runtime (deno) for YouTube.
/// Appended, so the user's own order still wins.
pub fn child_path(program: &Path) -> std::ffi::OsString {
    let mut dirs: Vec<PathBuf> =
        std::env::var_os("PATH").map(|p| std::env::split_paths(&p).collect()).unwrap_or_default();
    for dir in program.parent().map(Path::to_path_buf).into_iter().chain(extra_dirs()) {
        if !dirs.contains(&dir) {
            dirs.push(dir);
        }
    }
    std::env::join_paths(dirs).unwrap_or_default()
}

pub fn resolve(tool: Tool, custom: Option<&str>) -> Result<(PathBuf, BinarySource), String> {
    resolve_in(tool, custom, std::env::current_exe().ok().as_deref().and_then(Path::parent), &search_dirs())
}

fn resolve_in(
    tool: Tool,
    custom: Option<&str>,
    exe_dir: Option<&Path>,
    search: &[PathBuf],
) -> Result<(PathBuf, BinarySource), String> {
    if let Some(custom) = custom.map(str::trim).filter(|c| !c.is_empty()) {
        let path = PathBuf::from(custom);
        if !path.is_file() {
            return Err(format!("{custom} was not found"));
        }
        return if tool.acceptable_custom(&path) {
            Ok((path, BinarySource::Custom))
        } else {
            Err(format!("{custom} doesn't look like an executable {}", tool.file_name()))
        };
    }
    let name = tool.file_name();
    if let Some(bundled) = exe_dir.map(|d| d.join(&name)).filter(|p| p.is_file()) {
        return Ok((bundled, BinarySource::Bundled));
    }
    search
        .iter()
        .map(|d| d.join(&name))
        .find(|p| p.is_file())
        .map(|p| (p, BinarySource::System))
        .ok_or_else(|| format!("{name} was not found"))
}

async fn version(tool: Tool, path: &Path) -> Option<String> {
    let flag = match tool {
        Tool::YtDlp => "--version",
        Tool::Ffmpeg => "-version",
    };
    let mut cmd = tokio::process::Command::new(path);
    cmd.arg(flag).kill_on_drop(true);
    no_window(&mut cmd);
    // PyInstaller builds of yt-dlp can take a few seconds to start on Windows.
    let out = tokio::time::timeout(Duration::from_secs(15), cmd.output()).await.ok()?.ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let first = text.lines().next()?.trim();
    Some(match tool {
        // "ffmpeg version 7.1.1 Copyright (c) ..." → "7.1.1"
        Tool::Ffmpeg => first.strip_prefix("ffmpeg version ")?.split_whitespace().next()?.to_string(),
        Tool::YtDlp => first.to_string(),
    })
}

pub async fn probe(tool: Tool, custom: Option<&str>) -> BinaryInfo {
    match resolve(tool, custom) {
        Ok((path, source)) => {
            let version = version(tool, &path).await;
            let error = version.is_none().then(|| "Found, but it didn't run. Check that it's executable.".to_string());
            BinaryInfo { path: Some(path.to_string_lossy().into_owned()), version, source: Some(source), error }
        }
        Err(e) => BinaryInfo { path: None, version: None, source: None, error: Some(e) },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn touch(dir: &Path, name: &str) -> PathBuf {
        let p = dir.join(name);
        std::fs::write(&p, "").unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&p, std::fs::Permissions::from_mode(0o755)).unwrap();
        }
        p
    }

    #[test]
    fn precedence_custom_bundled_system() {
        let tmp = tempfile::tempdir().unwrap();
        let (exe, sys, other) = (tmp.path().join("exe"), tmp.path().join("sys"), tmp.path().join("o"));
        for d in [&exe, &sys, &other] {
            std::fs::create_dir(d).unwrap();
        }
        let name = Tool::YtDlp.file_name();
        let sys_bin = touch(&sys, &name);
        let search = vec![sys.clone()];

        assert_eq!(resolve_in(Tool::YtDlp, None, Some(&exe), &search).unwrap(), (sys_bin, BinarySource::System));

        let bundled = touch(&exe, &name);
        assert_eq!(resolve_in(Tool::YtDlp, None, Some(&exe), &search).unwrap(), (bundled, BinarySource::Bundled));

        let custom = touch(&other, &format!("yt-dlp_nightly{}", std::env::consts::EXE_SUFFIX));
        let got = resolve_in(Tool::YtDlp, custom.to_str(), Some(&exe), &search).unwrap();
        assert_eq!(got, (custom, BinarySource::Custom));
    }

    #[test]
    fn rejects_implausible_or_missing_custom_paths() {
        let tmp = tempfile::tempdir().unwrap();
        let evil = touch(tmp.path(), "rm");
        assert!(resolve_in(Tool::YtDlp, evil.to_str(), None, &[]).is_err());
        assert!(resolve_in(Tool::Ffmpeg, Some("/nope/ffmpeg"), None, &[]).is_err());
        assert!(resolve_in(Tool::Ffmpeg, None, None, &[]).is_err());
    }

    #[test]
    fn rejects_a_downloaded_media_file_named_like_the_tool() {
        let tmp = tempfile::tempdir().unwrap();
        let media = tmp.path().join("yt-dlp [yt-dlp].mp4");
        std::fs::write(&media, "").unwrap(); // not executable, not .exe
        assert!(resolve_in(Tool::YtDlp, media.to_str(), None, &[]).is_err());
    }

    #[test]
    fn child_path_appends_program_dir_without_duplicates() {
        let path = child_path(Path::new("/opt/custom/bin/yt-dlp"));
        let dirs: Vec<PathBuf> = std::env::split_paths(&path).collect();
        assert!(dirs.contains(&PathBuf::from("/opt/custom/bin")));
        assert_eq!(dirs.iter().filter(|d| d.as_path() == Path::new("/opt/custom/bin")).count(), 1);
    }
}
