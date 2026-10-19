//! Whether a URL that points into a playlist downloads the whole list.

use super::{ArgContributor, Args, BuildContext, BuildError};

pub struct Playlist;

impl ArgContributor for Playlist {
    fn contribute(&self, ctx: &BuildContext, args: &mut Args) -> Result<(), BuildError> {
        args.flag(if ctx.options.playlist { "--yes-playlist" } else { "--no-playlist" });
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::builder::test_util::*;
    use crate::options::DownloadOptions;

    #[test]
    fn maps_toggle() {
        assert_eq!(argv(&Playlist, &DownloadOptions::default()), ["--no-playlist"]);
        let opts = DownloadOptions { playlist: true, ..Default::default() };
        assert_eq!(argv(&Playlist, &opts), ["--yes-playlist"]);
    }
}
