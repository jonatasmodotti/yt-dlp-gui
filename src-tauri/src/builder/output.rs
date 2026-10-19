//! Destination folder and filename template.

use super::{ArgContributor, Args, BuildContext, BuildError};

/// Single videos: `Title [id].ext`. Playlists: `Playlist/001 - Title [id].ext`.
pub const OUTPUT_TEMPLATE: &str = "%(playlist_title&{}/|)s%(playlist_index&{:03d} - |)s%(title)s [%(id)s].%(ext)s";

pub struct Output;

impl ArgContributor for Output {
    fn contribute(&self, ctx: &BuildContext, args: &mut Args) -> Result<(), BuildError> {
        if ctx.output_dir.trim().is_empty() {
            return Err(BuildError::Invalid("Choose an output folder".into()));
        }
        args.opt("-P", ctx.output_dir)
            .opt("-o", OUTPUT_TEMPLATE)
            // Files sort by download time instead of upload date.
            .flag("--no-mtime");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::builder::test_util::*;
    use crate::options::DownloadOptions;

    #[test]
    fn sets_folder_and_template() {
        let argv = argv(&Output, &DownloadOptions::default());
        assert!(contains(&argv, &["-P", "/out", "-o", OUTPUT_TEMPLATE, "--no-mtime"]));
    }
}
