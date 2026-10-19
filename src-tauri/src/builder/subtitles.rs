//! Manual and auto-generated subtitles / transcripts.

use super::{ArgContributor, Args, BuildContext, BuildError};

pub struct Subtitles;

/// Used when the languages field is empty; also the default option value.
pub const DEFAULT_LANGUAGES: &str = "en";

impl ArgContributor for Subtitles {
    fn contribute(&self, ctx: &BuildContext, args: &mut Args) -> Result<(), BuildError> {
        let o = ctx.options;
        let s = &o.subtitles;
        if !s.enabled {
            return Ok(());
        }
        let languages: String = s.languages.chars().filter(|c| !c.is_whitespace()).collect();
        let languages = if languages.is_empty() { DEFAULT_LANGUAGES.to_string() } else { languages };
        if s.include_auto && (languages == "all" || languages.contains(".*")) {
            // Verified: `en.*` with auto captions matches dozens of
            // machine-translated tracks and YouTube answers with HTTP 429.
            args.warn("Broad language patterns with auto-captions can download dozens of translated tracks and trigger YouTube rate limits (HTTP 429).");
        }

        // Verified: YouTube answers auto-translated tracks (e.g. `pt` on an
        // English video) with HTTP 429 even for a single download, and by
        // default yt-dlp then skips the video itself. With `-i` a failed track
        // is only a warning; real download/postprocess errors still exit 1.
        // Side effect: after a failed postprocessor the rest of the chain still
        // runs, so such a job can end Partial (file kept) instead of Failed.
        args.flag("--ignore-errors");
        args.flag("--write-subs");
        if s.include_auto {
            args.flag("--write-auto-subs");
        }
        let fmt = s.format.as_str();
        args.opt("--sub-langs", languages).opt("--sub-format", format!("{fmt}/best")).opt("--convert-subs", fmt);

        if s.embed {
            if o.audio_only {
                args.warn("Subtitles can't be embedded in audio files; they are saved alongside instead.");
            } else {
                args.flag("--embed-subs");
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::builder::test_util::*;
    use crate::options::{DownloadOptions, SubtitleFormat};

    fn enabled() -> DownloadOptions {
        let mut o = DownloadOptions::default();
        o.subtitles.enabled = true;
        o
    }

    #[test]
    fn disabled_adds_nothing() {
        assert!(argv(&Subtitles, &DownloadOptions::default()).is_empty());
    }

    #[test]
    fn writes_manual_and_auto_as_srt() {
        let argv = argv(&Subtitles, &enabled());
        assert!(contains(
            &argv,
            &[
                "--ignore-errors",
                "--write-subs",
                "--write-auto-subs",
                "--sub-langs",
                "en",
                "--sub-format",
                "srt/best",
                "--convert-subs",
                "srt"
            ]
        ));
    }

    #[test]
    fn normalizes_languages_and_format() {
        let mut o = enabled();
        o.subtitles.languages = " en, pt-BR ".into();
        o.subtitles.include_auto = false;
        o.subtitles.format = SubtitleFormat::Vtt;
        let args = argv(&Subtitles, &o);
        assert!(contains(&args, &["--sub-langs", "en,pt-BR", "--sub-format", "vtt/best"]));
        assert!(!args.contains(&"--write-auto-subs".to_string()));

        o.subtitles.languages = "   ".into();
        assert!(contains(&argv(&Subtitles, &o), &["--sub-langs", "en"]));
    }

    #[test]
    fn warns_on_rate_limit_prone_patterns() {
        let mut o = enabled();
        o.subtitles.languages = "en.*".into();
        assert_eq!(warnings(&Subtitles, &o).len(), 1);
    }

    #[test]
    fn embed_only_in_video_mode() {
        let mut o = enabled();
        o.subtitles.embed = true;
        assert!(argv(&Subtitles, &o).contains(&"--embed-subs".to_string()));
        o.audio_only = true;
        assert!(!argv(&Subtitles, &o).contains(&"--embed-subs".to_string()));
        assert_eq!(warnings(&Subtitles, &o).len(), 1);
    }
}
