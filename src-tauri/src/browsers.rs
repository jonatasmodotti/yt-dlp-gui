//! Which browsers are installed, and how well `--cookies-from-browser` works
//! with each on this OS. See docs/cookies.md for the background.

use std::path::PathBuf;

use serde::Serialize;
use ts_rs::TS;

use crate::options::Browser;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum Reliability {
    /// Works without extra steps.
    Good,
    /// Works after a one-time OS prompt or permission.
    Limited,
    /// Usually fails on this OS; prefer another option.
    Poor,
}

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BrowserInfo {
    pub browser: Browser,
    pub label: String,
    pub installed: bool,
    pub reliability: Reliability,
    pub note: String,
}

fn label(b: Browser) -> &'static str {
    match b {
        Browser::Firefox => "Firefox",
        Browser::Chrome => "Google Chrome",
        Browser::Brave => "Brave",
        Browser::Edge => "Microsoft Edge",
        Browser::Chromium => "Chromium",
        Browser::Opera => "Opera",
        Browser::Vivaldi => "Vivaldi",
        Browser::Safari => "Safari",
    }
}

/// Reliability and the note shown next to each option.
pub fn assess(b: Browser, os: &str) -> (Reliability, &'static str) {
    match (b, os) {
        (Browser::Firefox, _) => (Reliability::Good, "Most reliable option on every platform."),
        (Browser::Safari, "macos") => {
            (Reliability::Limited, "Requires Full Disk Access for this app (System Settings → Privacy & Security).")
        }
        (Browser::Safari, _) => (Reliability::Poor, "Safari is only available on macOS."),
        (_, "macos") => {
            (Reliability::Limited, "macOS asks for Keychain access (\"Safe Storage\") the first time. Click Allow.")
        }
        (_, "windows") => (
            Reliability::Poor,
            "Recent versions lock and encrypt cookies (App-Bound Encryption). Close the browser fully, or use Firefox / cookies.txt.",
        ),
        _ => (Reliability::Good, "Needs access to your keyring (GNOME Keyring / KWallet)."),
    }
}

/// Profile directories that indicate a browser has been used on this machine.
fn profile_dirs(b: Browser, os: &str) -> Vec<PathBuf> {
    let home = dirs::home_dir().unwrap_or_default();
    let config = dirs::config_dir().unwrap_or_default(); // ~/Library/Application Support, %APPDATA%, ~/.config
    let local = dirs::data_local_dir().unwrap_or_default(); // %LOCALAPPDATA% on Windows
    let rel = |base: &PathBuf, parts: &[&str]| parts.iter().fold(base.clone(), |p, s| p.join(s));

    match (os, b) {
        ("macos", Browser::Safari) => vec![rel(&home, &["Library", "Containers", "com.apple.Safari"])],
        ("macos", Browser::Firefox) => vec![rel(&config, &["Firefox"])],
        ("macos", Browser::Chrome) => vec![rel(&config, &["Google", "Chrome"])],
        ("macos", Browser::Brave) => vec![rel(&config, &["BraveSoftware", "Brave-Browser"])],
        ("macos", Browser::Edge) => vec![rel(&config, &["Microsoft Edge"])],
        ("macos", Browser::Chromium) => vec![rel(&config, &["Chromium"])],
        ("macos", Browser::Opera) => vec![rel(&config, &["com.operasoftware.Opera"])],
        ("macos", Browser::Vivaldi) => vec![rel(&config, &["Vivaldi"])],

        ("windows", Browser::Firefox) => vec![rel(&config, &["Mozilla", "Firefox"])],
        ("windows", Browser::Chrome) => vec![rel(&local, &["Google", "Chrome", "User Data"])],
        ("windows", Browser::Brave) => vec![rel(&local, &["BraveSoftware", "Brave-Browser", "User Data"])],
        ("windows", Browser::Edge) => vec![rel(&local, &["Microsoft", "Edge", "User Data"])],
        ("windows", Browser::Chromium) => vec![rel(&local, &["Chromium", "User Data"])],
        ("windows", Browser::Opera) => vec![rel(&config, &["Opera Software", "Opera Stable"])],
        ("windows", Browser::Vivaldi) => vec![rel(&local, &["Vivaldi", "User Data"])],

        (_, Browser::Safari) => vec![],
        (_, Browser::Firefox) => vec![
            rel(&home, &[".mozilla", "firefox"]),
            rel(&home, &["snap", "firefox", "common", ".mozilla", "firefox"]),
            rel(&home, &[".var", "app", "org.mozilla.firefox", ".mozilla", "firefox"]),
        ],
        (_, Browser::Chrome) => vec![rel(&config, &["google-chrome"])],
        (_, Browser::Brave) => vec![rel(&config, &["BraveSoftware", "Brave-Browser"])],
        (_, Browser::Edge) => vec![rel(&config, &["microsoft-edge"])],
        (_, Browser::Chromium) => {
            vec![rel(&config, &["chromium"]), rel(&home, &["snap", "chromium", "common", "chromium"])]
        }
        (_, Browser::Opera) => vec![rel(&config, &["opera"])],
        (_, Browser::Vivaldi) => vec![rel(&config, &["vivaldi"])],
    }
}

pub fn detect() -> Vec<BrowserInfo> {
    let os = std::env::consts::OS;
    Browser::ALL
        .into_iter()
        .filter(|b| *b != Browser::Safari || os == "macos")
        .map(|b| {
            let (reliability, note) = assess(b, os);
            BrowserInfo {
                browser: b,
                label: label(b).into(),
                installed: profile_dirs(b, os).iter().any(|p| p.is_dir()),
                reliability,
                note: note.into(),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn firefox_is_always_good() {
        for os in ["macos", "windows", "linux"] {
            assert_eq!(assess(Browser::Firefox, os).0, Reliability::Good);
        }
    }

    #[test]
    fn chromium_on_windows_is_poor() {
        assert_eq!(assess(Browser::Chrome, "windows").0, Reliability::Poor);
        assert_eq!(assess(Browser::Edge, "macos").0, Reliability::Limited);
    }

    #[test]
    fn detect_lists_every_browser_once() {
        let list = detect();
        let expected = if cfg!(target_os = "macos") { 8 } else { 7 };
        assert_eq!(list.len(), expected);
    }
}
