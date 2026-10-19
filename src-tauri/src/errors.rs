//! Turns yt-dlp's stderr into an error category with an actionable hint.

use serde::Serialize;
use ts_rs::TS;

use crate::options::CookieSource;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum ErrorKind {
    AuthRequired,
    CookieExtraction,
    CookieFile,
    RateLimited,
    /// HTTP 403: usually an outdated yt-dlp.
    Forbidden,
    GeoRestricted,
    FfmpegMissing,
    UnsupportedUrl,
    Unavailable,
    Network,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JobError {
    pub kind: ErrorKind,
    /// The most relevant yt-dlp error line.
    pub message: String,
    /// What the user can do about it.
    pub hint: String,
}

/// Checked in order; first match wins. Cookie patterns come first because
/// their messages also mention authentication.
const RULES: &[(ErrorKind, &[&str])] = &[
    (
        ErrorKind::CookieExtraction,
        &[
            "could not copy chrome cookie database",
            "failed to decrypt with dpapi",
            "app-bound",
            "cookies database",
            "could not find firefox",
            "keyring",
            "secretstorage",
            "unsupported browser specified for cookies",
            "failed to decrypt",
        ],
    ),
    (ErrorKind::CookieFile, &["does not look like a netscape format cookies file", "invalid cookies file"]),
    (
        ErrorKind::AuthRequired,
        &[
            "sign in to confirm",
            "not a bot",
            "members-only",
            "join this channel",
            "private video",
            "login required",
            "requires authentication",
            "use --cookies",
            "--cookies-from-browser",
            "age-restricted",
            "inappropriate for some users",
        ],
    ),
    // "Video unavailable. This content isn't available, try again later" is a
    // temporary YouTube block, so it must match before `Unavailable`.
    (ErrorKind::RateLimited, &["http error 429", "too many requests", "try again later"]),
    (ErrorKind::Forbidden, &["http error 403"]),
    (ErrorKind::GeoRestricted, &["not available in your country", "geo restrict", "geo-restrict"]),
    (ErrorKind::FfmpegMissing, &["ffmpeg not found", "ffprobe and ffmpeg not found", "ffmpeg is not installed"]),
    (ErrorKind::UnsupportedUrl, &["unsupported url", "is not a valid url"]),
    (
        ErrorKind::Unavailable,
        &["video unavailable", "has been removed", "has been terminated", "this video is not available"],
    ),
    (
        ErrorKind::Network,
        &[
            "unable to download webpage",
            "connection reset",
            "timed out",
            "name or service not known",
            "getaddrinfo failed",
            "nodename nor servname",
            "network is unreachable",
            "temporary failure in name resolution",
            "ssl:",
        ],
    ),
];

pub fn hint(kind: ErrorKind) -> &'static str {
    match kind {
        ErrorKind::AuthRequired => {
            "This video needs a signed-in session. Open Settings → Cookies and pick your browser (Firefox is most reliable) or import a cookies.txt file."
        }
        ErrorKind::CookieExtraction => {
            "yt-dlp couldn't read your browser's cookies. Close the browser completely and retry, switch to Firefox, or import a cookies.txt file instead."
        }
        ErrorKind::CookieFile => {
            "The cookies file couldn't be used. Export it again in Netscape (cookies.txt) format while signed in."
        }
        ErrorKind::RateLimited => {
            "The site is rate-limiting requests. Wait a few minutes, or sign in with cookies (Settings → Cookies)."
        }
        ErrorKind::Forbidden => {
            "The site refused the request (HTTP 403). Updating yt-dlp usually fixes this; signing in with cookies can also help."
        }
        ErrorKind::GeoRestricted => "This video isn't available in your region.",
        ErrorKind::FfmpegMissing => "Install ffmpeg (or set its path in Settings) to merge and convert media.",
        ErrorKind::UnsupportedUrl => "yt-dlp doesn't recognise this link. Check the URL.",
        ErrorKind::Unavailable => "The video is unavailable, private or removed.",
        ErrorKind::Network => "Check your internet connection and try again.",
        ErrorKind::Unknown => "See the log for details. Updating yt-dlp often fixes extraction errors.",
    }
}

/// The generic sign-in hint says "add cookies"; don't say that to someone who
/// already did.
pub fn refine_for_cookies(error: &mut JobError, cookies: &CookieSource) {
    if error.kind == ErrorKind::AuthRequired && *cookies != CookieSource::None {
        error.hint = "Cookies were sent, but the site still wants a sign-in. Sign in again in that browser \
            (or export a fresh cookies.txt), then retry."
            .into();
    }
}

/// Classify from all collected stderr lines. Prefers `ERROR:` lines.
pub fn classify(lines: &[String]) -> JobError {
    let errors: Vec<&String> = lines.iter().filter(|l| l.starts_with("ERROR:")).collect();
    // A refused subtitle track is reported separately and mustn't read as a
    // rate limit (that would pause a batch queue for no reason).
    let candidates: Vec<&String> = if errors.is_empty() {
        lines.iter().filter(|l| !l.starts_with(crate::jobs::SUBTITLE_FAILED)).collect()
    } else {
        errors
    };

    let lowered: Vec<String> = candidates.iter().map(|l| l.to_lowercase()).collect();
    for (kind, needles) in RULES {
        for (line, lower) in candidates.iter().zip(&lowered) {
            if needles.iter().any(|n| lower.contains(n)) {
                return JobError { kind: *kind, message: clean(line), hint: hint(*kind).into() };
            }
        }
    }
    let message = candidates.last().map(|l| clean(l)).unwrap_or_else(|| "yt-dlp exited with an error".into());
    JobError { kind: ErrorKind::Unknown, message, hint: hint(ErrorKind::Unknown).into() }
}

fn clean(line: &str) -> String {
    line.trim_start_matches("ERROR:").trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn kind_of(line: &str) -> ErrorKind {
        classify(&[line.to_string()]).kind
    }

    #[test]
    fn classifies_known_failures() {
        assert_eq!(
            kind_of(
                "ERROR: [youtube] abc: Sign in to confirm you’re not a bot. Use --cookies-from-browser or --cookies"
            ),
            ErrorKind::AuthRequired
        );
        assert_eq!(
            kind_of("ERROR: Could not copy Chrome cookie database. See  https://github.com/yt-dlp/yt-dlp/issues/7271"),
            ErrorKind::CookieExtraction
        );
        assert_eq!(
            kind_of("ERROR: Failed to decrypt with DPAPI. See  https://github.com/yt-dlp/yt-dlp/issues/10927"),
            ErrorKind::CookieExtraction
        );
        assert_eq!(
            kind_of("ERROR: '/x/c.txt' does not look like a Netscape format cookies file"),
            ErrorKind::CookieFile
        );
        assert_eq!(
            kind_of("ERROR: Unable to download video subtitles for 'en-de': HTTP Error 429: Too Many Requests"),
            ErrorKind::RateLimited
        );
        assert_eq!(kind_of("ERROR: Unsupported URL: https://example.com"), ErrorKind::UnsupportedUrl);
        assert_eq!(kind_of("ERROR: [youtube] x: Video unavailable"), ErrorKind::Unavailable);
        assert_eq!(
            kind_of("ERROR: [youtube] x: Video unavailable. This content isn't available, try again later."),
            ErrorKind::RateLimited
        );
        assert_eq!(kind_of("ERROR: unable to download video data: HTTP Error 403: Forbidden"), ErrorKind::Forbidden);
        assert_eq!(
            kind_of("ERROR: [youtube] x: Private video. Sign in if you've been granted access"),
            ErrorKind::AuthRequired
        );
    }

    #[test]
    fn prefers_error_lines_and_strips_prefix() {
        let lines = vec![
            "WARNING: [youtube] something about cookies database".to_string(),
            "ERROR: Unsupported URL: https://nope".to_string(),
        ];
        let e = classify(&lines);
        assert_eq!(e.kind, ErrorKind::UnsupportedUrl);
        assert_eq!(e.message, "Unsupported URL: https://nope");
    }

    #[test]
    fn auth_hint_accounts_for_cookies_already_sent() {
        let mut e = classify(&["ERROR: [youtube] x: Sign in to confirm you're not a bot".to_string()]);
        let generic = e.hint.clone();
        refine_for_cookies(&mut e, &CookieSource::None);
        assert_eq!(e.hint, generic);
        refine_for_cookies(&mut e, &CookieSource::File { path: "/c.txt".into() });
        assert_ne!(e.hint, generic);
    }

    #[test]
    fn subtitle_warnings_are_not_a_rate_limit() {
        let lines = vec![
            "WARNING: Unable to download video subtitles for 'pt': HTTP Error 429: Too Many Requests".to_string(),
            "Killed".to_string(),
        ];
        assert_eq!(classify(&lines).kind, ErrorKind::Unknown);
    }

    #[test]
    fn unknown_falls_back_to_last_line() {
        let e = classify(&["ERROR: something new".to_string()]);
        assert_eq!(e.kind, ErrorKind::Unknown);
        assert_eq!(e.message, "something new");
    }
}
