//! Translates [`DownloadOptions`] into a yt-dlp argv.
//!
//! Each flag group is a small [`ArgContributor`]; [`REGISTRY`] runs them in
//! order. To support a new yt-dlp flag you normally only touch one
//! contributor (or add a new file + one line in `REGISTRY`) — the job runner,
//! IPC layer and progress parsing never change. See CONTRIBUTING.md.

mod cookies;
mod engine;
mod format;
mod output;
mod playlist;
mod subtitles;
mod thumbnail;

use std::path::Path;

pub use subtitles::DEFAULT_LANGUAGES as DEFAULT_SUB_LANGUAGES;

use crate::options::{DownloadOptions, DownloadRequest};

/// Read-only inputs available to every contributor.
pub struct BuildContext<'a> {
    /// Options with presets (e.g. "Download all") already applied.
    pub options: &'a DownloadOptions,
    pub output_dir: &'a str,
    pub ffmpeg: Option<&'a Path>,
    /// `std::env::consts::OS`, injectable for tests.
    pub os: &'a str,
}

/// The argv being assembled plus non-fatal warnings shown to the user.
#[derive(Debug, Default)]
pub struct Args {
    argv: Vec<String>,
    warnings: Vec<String>,
}

impl Args {
    pub fn flag(&mut self, flag: &str) -> &mut Self {
        self.argv.push(flag.to_string());
        self
    }

    pub fn opt(&mut self, flag: &str, value: impl Into<String>) -> &mut Self {
        self.argv.push(flag.to_string());
        self.argv.push(value.into());
        self
    }

    pub fn extend(&mut self, args: impl IntoIterator<Item = String>) -> &mut Self {
        self.argv.extend(args);
        self
    }

    pub fn warn(&mut self, message: impl Into<String>) {
        self.warnings.push(message.into());
    }
}

#[derive(Debug, thiserror::Error, PartialEq)]
pub enum BuildError {
    #[error("Please enter a URL")]
    EmptyUrl,
    #[error("{0}")]
    Invalid(String),
}

pub trait ArgContributor: Sync {
    fn contribute(&self, ctx: &BuildContext, args: &mut Args) -> Result<(), BuildError>;
}

/// Contributors in argv order. Add new ones here.
pub static REGISTRY: &[&dyn ArgContributor] = &[
    &engine::Engine,
    &output::Output,
    &playlist::Playlist,
    &format::Format,
    &thumbnail::Thumbnail,
    &subtitles::Subtitles,
    &cookies::Cookies,
];

#[derive(Debug)]
pub struct BuiltCommand {
    /// Arguments only (no program name). The URL is always last, after `--`.
    pub args: Vec<String>,
    pub warnings: Vec<String>,
}

pub fn build(request: &DownloadRequest, ffmpeg: Option<&Path>) -> Result<BuiltCommand, BuildError> {
    let url = request.url.trim();
    if url.is_empty() {
        return Err(BuildError::EmptyUrl);
    }
    let options = request.options.effective();
    let ctx = BuildContext { options: &options, output_dir: &request.output_dir, ffmpeg, os: std::env::consts::OS };
    build_with(&ctx, url)
}

fn build_with(ctx: &BuildContext, url: &str) -> Result<BuiltCommand, BuildError> {
    let mut args = Args::default();
    for contributor in REGISTRY {
        contributor.contribute(ctx, &mut args)?;
    }
    // `--` stops option parsing, so a URL can never be read as a flag.
    args.flag("--").flag(url);
    Ok(BuiltCommand { args: args.argv, warnings: args.warnings })
}

#[cfg(test)]
pub(crate) mod test_util {
    use super::*;

    pub fn run(contributor: &dyn ArgContributor, options: &DownloadOptions) -> Result<Args, BuildError> {
        run_on(contributor, options, "linux")
    }

    pub fn run_on(contributor: &dyn ArgContributor, options: &DownloadOptions, os: &str) -> Result<Args, BuildError> {
        let options = options.effective();
        let ffmpeg = Path::new("/usr/bin/ffmpeg");
        let ctx = BuildContext { options: &options, output_dir: "/out", ffmpeg: Some(ffmpeg), os };
        let mut args = Args::default();
        contributor.contribute(&ctx, &mut args)?;
        Ok(args)
    }

    pub fn argv(contributor: &dyn ArgContributor, options: &DownloadOptions) -> Vec<String> {
        run(contributor, options).unwrap().argv
    }

    pub fn warnings(contributor: &dyn ArgContributor, options: &DownloadOptions) -> Vec<String> {
        run(contributor, options).unwrap().warnings
    }

    /// Asserts `needle` appears in `haystack` as a contiguous run.
    pub fn contains(haystack: &[String], needle: &[&str]) -> bool {
        haystack.windows(needle.len()).any(|w| w.iter().zip(needle).all(|(a, b)| a == b))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::options::EngineSettings;

    fn request(url: &str) -> DownloadRequest {
        DownloadRequest {
            url: url.into(),
            output_dir: "/out".into(),
            options: DownloadOptions::default(),
            engine: EngineSettings::default(),
        }
    }

    #[test]
    fn url_is_last_and_guarded() {
        let built = build(&request("  -o /etc/passwd  "), None).unwrap();
        let n = built.args.len();
        assert_eq!(built.args[n - 2..], ["--", "-o /etc/passwd"]);
    }

    #[test]
    fn rejects_empty_url() {
        assert_eq!(build(&request("   "), None).unwrap_err(), BuildError::EmptyUrl);
    }

    #[test]
    fn default_is_best_mp4() {
        let mut req = request("https://youtu.be/x");
        req.options.compatible_video = false;
        let built = build(&req, Some(Path::new("/bin/ffmpeg"))).unwrap();
        assert!(test_util::contains(
            &built.args,
            &["-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best/best", "--merge-output-format", "mp4"]
        ));
        assert!(test_util::contains(&built.args, &["--ignore-config"]));
        assert!(built.warnings.is_empty(), "{:?}", built.warnings);
    }
}
