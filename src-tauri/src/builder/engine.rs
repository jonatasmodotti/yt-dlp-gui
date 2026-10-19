//! Flags every job needs: isolation from user config, the progress
//! protocol, and the ffmpeg location.

use super::{ArgContributor, Args, BuildContext, BuildError};
use crate::progress;

pub struct Engine;

impl ArgContributor for Engine {
    fn contribute(&self, ctx: &BuildContext, args: &mut Args) -> Result<(), BuildError> {
        // A user's yt-dlp.conf (e.g. `--quiet`) would break progress parsing.
        args.flag("--ignore-config").extend(progress::protocol_args());
        match ctx.ffmpeg {
            Some(path) => {
                args.opt("--ffmpeg-location", path.to_string_lossy());
            }
            None => args
                .warn("ffmpeg wasn't found. Merging video and audio, extracting audio and converting files will fail."),
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
    fn isolates_config_and_passes_ffmpeg() {
        let argv = argv(&Engine, &DownloadOptions::default());
        assert_eq!(argv[0], "--ignore-config");
        assert!(contains(&argv, &["--ffmpeg-location", "/usr/bin/ffmpeg"]));
        assert!(contains(&argv, &["--newline"]));
    }
}
