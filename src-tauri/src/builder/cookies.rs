//! Authentication via browser cookies or a cookies.txt file.

use super::{ArgContributor, Args, BuildContext, BuildError};
use crate::options::{Browser, CookieSource};

pub struct Cookies;

impl ArgContributor for Cookies {
    fn contribute(&self, ctx: &BuildContext, args: &mut Args) -> Result<(), BuildError> {
        match &ctx.options.cookies {
            CookieSource::None => {}
            CookieSource::Browser { browser, profile } => {
                if *browser == Browser::Safari && ctx.os != "macos" {
                    return Err(BuildError::Invalid("Safari cookies are only available on macOS".into()));
                }
                // yt-dlp syntax: BROWSER[+KEYRING][:PROFILE][::CONTAINER]
                let mut spec = browser.as_str().to_string();
                if let Some(profile) = profile.as_deref().map(str::trim).filter(|p| !p.is_empty()) {
                    if profile.contains("::") {
                        return Err(BuildError::Invalid("Browser profile names can't contain \"::\"".into()));
                    }
                    spec.push(':');
                    spec.push_str(profile);
                }
                args.opt("--cookies-from-browser", spec);
            }
            CookieSource::File { path } => {
                if path.trim().is_empty() {
                    return Err(BuildError::Invalid("Choose a cookies.txt file".into()));
                }
                args.opt("--cookies", path.as_str());
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::builder::test_util::*;
    use crate::options::DownloadOptions;

    fn with(cookies: CookieSource) -> DownloadOptions {
        DownloadOptions { cookies, ..Default::default() }
    }

    #[test]
    fn none_adds_nothing() {
        assert!(argv(&Cookies, &DownloadOptions::default()).is_empty());
    }

    #[test]
    fn browser_with_optional_profile() {
        let o = with(CookieSource::Browser { browser: Browser::Firefox, profile: None });
        assert_eq!(argv(&Cookies, &o), ["--cookies-from-browser", "firefox"]);
        let o = with(CookieSource::Browser { browser: Browser::Chrome, profile: Some(" Profile 1 ".into()) });
        assert_eq!(argv(&Cookies, &o), ["--cookies-from-browser", "chrome:Profile 1"]);
    }

    #[test]
    fn safari_is_macos_only() {
        let o = with(CookieSource::Browser { browser: Browser::Safari, profile: None });
        assert!(run_on(&Cookies, &o, "windows").is_err());
        assert_eq!(run_on(&Cookies, &o, "macos").unwrap().argv.len(), 2);
    }

    #[test]
    fn cookie_file() {
        let o = with(CookieSource::File { path: "/home/me/cookies.txt".into() });
        assert_eq!(argv(&Cookies, &o), ["--cookies", "/home/me/cookies.txt"]);
        assert!(run(&Cookies, &with(CookieSource::File { path: " ".into() })).is_err());
    }
}
