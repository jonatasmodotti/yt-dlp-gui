//! Format selection: best mp4 video, audio extraction, or the bundle preset.

use super::{ArgContributor, Args, BuildContext, BuildError};
use crate::options::AudioFormat;

pub struct Format;

/// `compatible` restricts the first choices to H.264 video + AAC audio, which
/// editors like Premiere can open. Without it "best mp4" is often AV1/VP9,
/// which they import as audio only. Falls back to anything if no H.264 exists.
pub fn video_selector(max_height: Option<u32>, compatible: bool) -> String {
    let cap = max_height.map(|h| format!("[height<={h}]")).unwrap_or_default();
    let codec = if compatible { "[vcodec^=avc1]" } else { "" };
    let mut parts =
        vec![format!("bestvideo[ext=mp4]{codec}{cap}+bestaudio[ext=m4a]"), format!("best[ext=mp4]{codec}{cap}")];
    if compatible {
        // No H.264 at this height: still prefer it over AV1/VP9 at another one.
        parts.push("bestvideo[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]".into());
    }
    parts.push(format!("best{cap}"));
    parts.push("best".into());
    parts.join("/")
}

impl ArgContributor for Format {
    fn contribute(&self, ctx: &BuildContext, args: &mut Args) -> Result<(), BuildError> {
        let o = ctx.options;
        if o.bundle {
            // A comma downloads both selections in one run: the merged mp4
            // plus the audio stream as its own file.
            // m4a/mp3 first: they can hold the embedded thumbnail, webm can't.
            let selector =
                format!("{},bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio", video_selector(None, o.compatible_video));
            args.opt("-f", selector).opt("--merge-output-format", "mp4");
        } else if o.audio_only {
            // m4a is usually available natively, which avoids a re-encode.
            let selector = match o.audio_format {
                AudioFormat::M4a => "bestaudio[ext=m4a]/bestaudio/best",
                _ => "bestaudio/best",
            };
            args.opt("-f", selector)
                .flag("-x")
                .opt("--audio-format", o.audio_format.as_str())
                .opt("--audio-quality", "0");
        } else {
            args.opt("-f", video_selector(o.max_height, o.compatible_video)).opt("--merge-output-format", "mp4");
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::builder::test_util::*;
    use crate::options::DownloadOptions;

    #[test]
    fn caps_height() {
        let opts = DownloadOptions { max_height: Some(720), compatible_video: false, ..Default::default() };
        let argv = argv(&Format, &opts);
        assert!(argv[1].starts_with("bestvideo[ext=mp4][height<=720]+"));
    }

    #[test]
    fn compatible_prefers_h264() {
        let opts = DownloadOptions { compatible_video: true, max_height: Some(720), ..Default::default() };
        let argv = argv(&Format, &opts);
        assert!(argv[1].starts_with("bestvideo[ext=mp4][vcodec^=avc1][height<=720]+bestaudio[ext=m4a]/"), "{argv:?}");
        let opts = DownloadOptions { compatible_video: false, ..Default::default() };
        assert!(!argv_of(&opts).contains("avc1"));
    }

    fn argv_of(opts: &DownloadOptions) -> String {
        argv(&Format, opts).join(" ")
    }

    #[test]
    fn audio_only_extracts() {
        let opts = DownloadOptions { audio_only: true, audio_format: AudioFormat::Wav, ..Default::default() };
        assert_eq!(
            argv(&Format, &opts),
            ["-f", "bestaudio/best", "-x", "--audio-format", "wav", "--audio-quality", "0"]
        );
    }

    #[test]
    fn bundle_downloads_video_and_separate_audio() {
        let opts = DownloadOptions { bundle: true, audio_only: true, ..Default::default() };
        let argv = argv(&Format, &opts);
        assert!(argv[1].ends_with(",bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio"), "{argv:?}");
        assert!(!argv.contains(&"-x".to_string()));
    }
}
