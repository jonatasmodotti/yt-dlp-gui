//! Save and/or embed the video thumbnail.

use super::{ArgContributor, Args, BuildContext, BuildError};
use crate::options::{AudioFormat, ThumbnailMode};

pub struct Thumbnail;

impl ArgContributor for Thumbnail {
    fn contribute(&self, ctx: &BuildContext, args: &mut Args) -> Result<(), BuildError> {
        let o = ctx.options;
        if o.thumbnail == ThumbnailMode::Off {
            return Ok(());
        }
        let can_embed = !(o.audio_only && o.audio_format == AudioFormat::Wav);
        let embed = o.thumbnail.embeds() && can_embed;
        if o.thumbnail.embeds() && !can_embed {
            args.warn("WAV files can't hold cover art, so the thumbnail is saved as a separate image.");
        }
        if o.thumbnail.saves() || !embed {
            args.flag("--write-thumbnail");
        }
        if embed {
            args.flag("--embed-thumbnail");
        }
        // YouTube serves webp; jpg works everywhere and embeds in mp4/mp3.
        args.opt("--convert-thumbnails", "jpg");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::builder::test_util::*;
    use crate::options::DownloadOptions;

    fn with(mode: ThumbnailMode) -> DownloadOptions {
        DownloadOptions { thumbnail: mode, ..Default::default() }
    }

    #[test]
    fn off_adds_nothing() {
        assert!(argv(&Thumbnail, &with(ThumbnailMode::Off)).is_empty());
    }

    #[test]
    fn modes_map_to_flags() {
        assert_eq!(argv(&Thumbnail, &with(ThumbnailMode::Save))[0], "--write-thumbnail");
        assert_eq!(argv(&Thumbnail, &with(ThumbnailMode::Embed))[0], "--embed-thumbnail");
        let both = argv(&Thumbnail, &with(ThumbnailMode::Both));
        assert!(contains(&both, &["--write-thumbnail", "--embed-thumbnail"]));
    }

    #[test]
    fn wav_falls_back_to_saving() {
        let opts = DownloadOptions { audio_only: true, audio_format: AudioFormat::Wav, ..with(ThumbnailMode::Embed) };
        let args = argv(&Thumbnail, &opts);
        assert_eq!(args[0], "--write-thumbnail");
        assert!(!args.contains(&"--embed-thumbnail".to_string()));
        assert_eq!(warnings(&Thumbnail, &opts).len(), 1);
    }
}
