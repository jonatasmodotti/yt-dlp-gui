//! Sanity checks for user-supplied Netscape `cookies.txt` files, so problems
//! surface when the file is picked instead of halfway through a download.

use std::collections::BTreeSet;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use ts_rs::TS;

const MAX_BYTES: u64 = 10 * 1024 * 1024;

#[derive(Debug, Clone, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CookieFileReport {
    pub valid: bool,
    pub cookie_count: u32,
    pub expired_count: u32,
    /// Up to 8 distinct domains, for a quick "is this the right site?" check.
    pub domains: Vec<String>,
    pub message: Option<String>,
}

impl CookieFileReport {
    fn invalid(message: &str) -> Self {
        Self { valid: false, cookie_count: 0, expired_count: 0, domains: vec![], message: Some(message.into()) }
    }
}

pub fn inspect(path: &str) -> CookieFileReport {
    // Only .txt files: keeps this from being a general "probe any path" oracle.
    if !std::path::Path::new(path).extension().is_some_and(|e| e.eq_ignore_ascii_case("txt")) {
        return CookieFileReport::invalid("Choose a .txt file in Netscape cookies format.");
    }
    match std::fs::metadata(path) {
        Ok(m) if !m.is_file() => return CookieFileReport::invalid("This is not a file."),
        Ok(m) if m.len() > MAX_BYTES => return CookieFileReport::invalid("File is too large to be a cookies.txt."),
        Ok(_) => {}
        Err(_) => return CookieFileReport::invalid("File not found or not readable."),
    }
    match std::fs::read(path) {
        Ok(bytes) => inspect_contents(&String::from_utf8_lossy(&bytes), now()),
        Err(_) => CookieFileReport::invalid("File not found or not readable."),
    }
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

pub fn inspect_contents(text: &str, now: u64) -> CookieFileReport {
    let trimmed = text.trim_start_matches('\u{feff}').trim_start();
    if trimmed.starts_with('[') || trimmed.starts_with('{') {
        return CookieFileReport::invalid(
            "This looks like a JSON cookie export. Export in Netscape (cookies.txt) format instead.",
        );
    }

    let mut count = 0u32;
    let mut expired = 0u32;
    let mut domains = BTreeSet::new();
    for line in trimmed.lines() {
        // `#HttpOnly_` prefixes a real cookie line; other `#` lines are comments.
        let line = line.strip_prefix("#HttpOnly_").unwrap_or(line);
        if line.trim().is_empty() || line.starts_with('#') {
            continue;
        }
        let fields: Vec<&str> = line.split('\t').collect();
        if fields.len() != 7 {
            continue;
        }
        count += 1;
        if let Ok(expiry) = fields[4].parse::<u64>()
            && expiry != 0
            && expiry < now
        {
            expired += 1;
        }
        domains.insert(fields[0].trim_start_matches('.').to_string());
    }

    if count == 0 {
        return CookieFileReport::invalid("No cookies in Netscape (cookies.txt) format were found.");
    }
    let message = (expired == count).then(|| "All cookies in this file have expired. Export a fresh copy.".to_string());
    CookieFileReport {
        valid: expired < count,
        cookie_count: count,
        expired_count: expired,
        domains: domains.into_iter().take(8).collect(),
        message,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = "# Netscape HTTP Cookie File\n\
        # comment\n\
        .youtube.com\tTRUE\t/\tTRUE\t2000000000\tSID\tabc\n\
        #HttpOnly_.youtube.com\tTRUE\t/\tTRUE\t2000000000\tHSID\tdef\n\
        .google.com\tTRUE\t/\tFALSE\t1000\told\tx\n";

    #[test]
    fn counts_cookies_and_expiry() {
        let r = inspect_contents(SAMPLE, 1_800_000_000);
        assert!(r.valid);
        assert_eq!((r.cookie_count, r.expired_count), (3, 1));
        assert_eq!(r.domains, ["google.com", "youtube.com"]);
    }

    #[test]
    fn rejects_json_and_garbage() {
        assert!(!inspect_contents("[{\"name\":\"a\"}]", 0).valid);
        assert!(!inspect_contents("hello world", 0).valid);
    }

    #[test]
    fn all_expired_is_invalid() {
        let r = inspect_contents(".a.com\tTRUE\t/\tFALSE\t5\tn\tv\n", 10);
        assert!(!r.valid);
        assert!(r.message.is_some());
    }

    #[test]
    fn reads_from_disk() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cookies.txt");
        std::fs::write(&path, SAMPLE).unwrap();
        assert_eq!(inspect(path.to_str().unwrap()).cookie_count, 3);
        assert!(!inspect(dir.path().join("missing.txt").to_str().unwrap()).valid);
        let other = dir.path().join("notes.md");
        std::fs::write(&other, SAMPLE).unwrap();
        assert!(!inspect(other.to_str().unwrap()).valid, "non-.txt files are refused");
    }
}
