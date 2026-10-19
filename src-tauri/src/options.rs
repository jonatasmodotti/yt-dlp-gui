//! The request model shared with the frontend.
//!
//! Every type here derives [`TS`], so `pnpm bindings` regenerates
//! `src/bindings/*.ts` and the UI can never drift from the backend.
//! To add a new yt-dlp flag: add a field to [`DownloadOptions`], then map it to
//! argv in a contributor under `builder/` (see CONTRIBUTING.md).

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Everything needed to run one yt-dlp job.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DownloadRequest {
    pub url: String,
    pub output_dir: String,
    pub options: DownloadOptions,
    pub engine: EngineSettings,
}

/// User-facing download options. One field per UI control.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DownloadOptions {
    /// Extract audio only (`-x`).
    pub audio_only: bool,
    pub audio_format: AudioFormat,
    /// Cap video height (e.g. 1080). `None` means best available.
    pub max_height: Option<u32>,
    /// Prefer H.264/AAC so editors (Premiere, etc.) can import the file.
    pub compatible_video: bool,
    pub thumbnail: ThumbnailMode,
    pub subtitles: SubtitleOptions,
    /// "Download all" preset: best mp4 + separate audio + thumbnail + transcripts.
    /// Overrides the other media options; see [`DownloadOptions::effective`].
    pub bundle: bool,
    /// Download the whole playlist when the URL points into one.
    pub playlist: bool,
    pub cookies: CookieSource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum AudioFormat {
    Mp3,
    M4a,
    Wav,
}

impl AudioFormat {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Mp3 => "mp3",
            Self::M4a => "m4a",
            Self::Wav => "wav",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum ThumbnailMode {
    Off,
    /// Save as a separate image file.
    Save,
    /// Embed as cover art in the media file.
    Embed,
    Both,
}

impl ThumbnailMode {
    pub fn saves(self) -> bool {
        matches!(self, Self::Save | Self::Both)
    }

    pub fn embeds(self) -> bool {
        matches!(self, Self::Embed | Self::Both)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SubtitleOptions {
    pub enabled: bool,
    /// Also fetch auto-generated captions when no manual ones exist.
    pub include_auto: bool,
    /// yt-dlp `--sub-langs` value, e.g. `en` or `en,pt-BR`.
    pub languages: String,
    pub format: SubtitleFormat,
    /// Embed into the video container (video mode only).
    pub embed: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum SubtitleFormat {
    Srt,
    Vtt,
}

impl SubtitleFormat {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Srt => "srt",
            Self::Vtt => "vtt",
        }
    }
}

/// Where yt-dlp gets cookies from. See `docs/cookies.md` for the trade-offs.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum CookieSource {
    None,
    /// `--cookies-from-browser BROWSER[:PROFILE]`
    Browser {
        browser: Browser,
        profile: Option<String>,
    },
    /// `--cookies FILE` (Netscape cookies.txt)
    File {
        path: String,
    },
}

/// Browsers supported by yt-dlp's `--cookies-from-browser`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum Browser {
    Firefox,
    Chrome,
    Brave,
    Edge,
    Chromium,
    Opera,
    Vivaldi,
    Safari,
}

impl Browser {
    pub const ALL: [Browser; 8] = [
        Self::Firefox,
        Self::Chrome,
        Self::Brave,
        Self::Edge,
        Self::Chromium,
        Self::Opera,
        Self::Vivaldi,
        Self::Safari,
    ];

    /// The name yt-dlp expects on the command line.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Firefox => "firefox",
            Self::Chrome => "chrome",
            Self::Brave => "brave",
            Self::Edge => "edge",
            Self::Chromium => "chromium",
            Self::Opera => "opera",
            Self::Vivaldi => "vivaldi",
            Self::Safari => "safari",
        }
    }
}

/// Optional user overrides for the yt-dlp / ffmpeg executables.
#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EngineSettings {
    pub ytdlp_path: Option<String>,
    pub ffmpeg_path: Option<String>,
}

impl Default for DownloadOptions {
    fn default() -> Self {
        Self {
            audio_only: false,
            audio_format: AudioFormat::Mp3,
            max_height: None,
            compatible_video: true,
            thumbnail: ThumbnailMode::Off,
            subtitles: SubtitleOptions {
                enabled: false,
                include_auto: true,
                languages: crate::builder::DEFAULT_SUB_LANGUAGES.into(),
                format: SubtitleFormat::Srt,
                embed: false,
            },
            bundle: false,
            playlist: false,
            cookies: CookieSource::None,
        }
    }
}

impl DownloadOptions {
    /// Options after applying presets. Contributors read these, never the raw
    /// options, so a preset only has to be expressed once.
    pub fn effective(&self) -> DownloadOptions {
        if !self.bundle {
            return self.clone();
        }
        DownloadOptions {
            audio_only: false,
            max_height: None,
            thumbnail: ThumbnailMode::Both,
            subtitles: SubtitleOptions {
                enabled: true,
                include_auto: true,
                format: SubtitleFormat::Srt,
                embed: false,
                languages: self.subtitles.languages.clone(),
            },
            ..self.clone()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_frontend_payload() {
        let json = r#"{
            "url": "https://example.com/v",
            "outputDir": "/tmp",
            "options": {
                "audioOnly": true, "audioFormat": "m4a", "maxHeight": null, "compatibleVideo": true,
                "thumbnail": "embed",
                "subtitles": {"enabled": false, "includeAuto": true, "languages": "en", "format": "srt", "embed": false},
                "bundle": false, "playlist": true,
                "cookies": {"type": "browser", "browser": "firefox", "profile": null}
            },
            "engine": {"ytdlpPath": null, "ffmpegPath": null}
        }"#;
        let req: DownloadRequest = serde_json::from_str(json).unwrap();
        assert!(req.options.audio_only);
        assert_eq!(req.options.audio_format, AudioFormat::M4a);
        assert_eq!(req.options.cookies, CookieSource::Browser { browser: Browser::Firefox, profile: None });
    }

    /// Writes `src/bindings/defaultOptions.json`, which the frontend imports as
    /// its defaults, so `Default` above is the single source of truth.
    /// Runs with `pnpm bindings` (name matches the `export_bindings` filter).
    #[test]
    fn export_bindings_default_options() {
        let dir = std::env::var("TS_RS_EXPORT_DIR").expect("set in .cargo/config.toml");
        let json = serde_json::to_string_pretty(&DownloadOptions::default()).unwrap();
        std::fs::write(std::path::Path::new(&dir).join("defaultOptions.json"), json + "\n").unwrap();
    }

    #[test]
    fn bundle_overrides_media_options() {
        let opts = DownloadOptions { bundle: true, audio_only: true, max_height: Some(480), ..Default::default() };
        let eff = opts.effective();
        assert!(!eff.audio_only);
        assert_eq!(eff.max_height, None);
        assert_eq!(eff.thumbnail, ThumbnailMode::Both);
        assert!(eff.subtitles.enabled && eff.subtitles.include_auto);
    }
}
