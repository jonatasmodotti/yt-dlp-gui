/**
 * English dictionary (source of truth for all translation keys).
 *
 * To add a new language:
 * 1. Copy this file to `src/i18n/<lang>.ts` and translate the string values.
 * 2. Register the new dictionary in `src/i18n/index.ts`.
 *
 * Placeholders like `{count}` are replaced at runtime via `t(key, { count })`.
 */
export const en = {
  // Header
  "header.tagline": "Download video, audio and transcripts",
  "header.settings": "Settings",

  // Engine banner
  "engineBanner.ytdlpNotFound": "yt-dlp wasn't found, so downloads can't start.",
  "engineBanner.ytdlpNotRunnable": "yt-dlp didn't run, so downloads can't start.",
  "engineBanner.ffmpegNotFound":
    "ffmpeg wasn't found. Merging, audio extraction and embedding won't work.",
  "engineBanner.ffmpegNotRunnable":
    "ffmpeg didn't run. Merging, audio extraction and embedding won't work.",
  "engineBanner.setUp": "Set up",

  // URL bar
  "urlBar.placeholder": "Paste a video or playlist link…",
  "urlBar.ariaLabel": "Video or playlist URL",
  "urlBar.batchPlaceholder":
    "Paste links, one per line…\nhttps://www.youtube.com/watch?v=…\nhttps://youtu.be/…",
  "urlBar.batchAriaLabel": "Links to download, one per line",
  "urlBar.pasteAriaLabel": "Paste from clipboard",
  "urlBar.batch": "Batch",
  "urlBar.batchTitleSingle": "Back to a single link",
  "urlBar.batchTitleMultiple": "Download several links (one per line)",
  "urlBar.download": "Download",
  "urlBar.downloadCount": "Download {count}",
  "urlBar.noLinksYet": "No links yet",
  "urlBar.batchCountOne": "1 link · uses the options below",
  "urlBar.batchCountOther": "{count} links · uses the options below",
  "urlBar.addedQueueOne": "Added 1 link to the queue.",
  "urlBar.addedQueueOther": "Added {count} links to the queue.",
  "urlBar.clipboardError": "Couldn't read the clipboard.",

  // Format card
  "format.title": "Format",
  "format.downloadAll": "Download all",
  "format.downloadAllDesc":
    "Best-quality MP4, separate audio, thumbnail and transcripts in one go.",
  "format.type": "Type",
  "format.mediaType": "Media type",
  "format.video": "Video",
  "format.audioOnly": "Audio only",
  "format.audioFormat": "Audio format",
  "format.wavLossless": "WAV (lossless)",
  "format.maxQuality": "Max quality",
  "format.maxQualityAriaLabel": "Maximum video quality",
  "format.bestAvailable": "Best available",
  "format.thumbnail": "Thumbnail",
  "format.thumbnailOff": "Off",
  "format.thumbnailSave": "Save as image",
  "format.thumbnailEmbed": "Embed as cover",
  "format.thumbnailBoth": "Save and embed",
  "format.compatible": "Editor-compatible (H.264)",
  "format.compatibleDesc":
    "Prefer H.264 + AAC so Premiere, DaVinci and others import video and audio. Unchecked may give AV1/VP9 (audio only in some editors).",
  "format.wholePlaylist": "Whole playlist",
  "format.wholePlaylistDesc": "When the link is part of a playlist, download every item.",
  "format.lockedByDownloadAll": "Format options are set by “Download all”.",

  // Subtitles card
  "subtitles.title": "Subtitles & transcripts",
  "subtitles.download": "Download subtitles",
  "subtitles.downloadDesc": "Saved next to the video as separate files.",
  "subtitles.includeAuto": "Include auto-generated",
  "subtitles.includeAutoDesc": "Use machine captions when no manual subtitles exist.",
  "subtitles.languages": "Languages",
  "subtitles.changeLanguageTitle": "Set the subtitle language in Settings",
  "subtitles.change": "Change",
  "subtitles.fileFormat": "File format",
  "subtitles.subtitleFormat": "Subtitle format",
  "subtitles.embedInVideo": "Embed in video",
  "subtitles.embedInVideoDesc": "Also add subtitle tracks inside the MP4.",

  // Output card
  "output.title": "Save to",
  "output.dialogTitle": "Save downloads to",
  "output.noFolder": "No folder selected",
  "output.change": "Change…",
  "output.showFolder": "Show folder",

  // Cookies card & settings
  "cookies.title": "Cookies",
  "cookies.summaryOff": "Off. Turn on for age-restricted, members-only or “not a bot” videos.",
  "cookies.summaryBrowser": "From {browser}",
  "cookies.summaryFile": "cookies.txt: {file}",
  "cookies.noFileSelected": "no file selected",
  "cookies.configure": "Configure…",
  "cookies.openInBrowser": "Open link in browser",
  "cookies.openInBrowserTitle": "Open the link in your default browser to sign in",
  "cookies.settingsDescription":
    "Needed for age-restricted, members-only or “confirm you’re not a bot” videos. Used by every download, including batches.",
  "cookies.source": "Cookie source",
  "cookies.none": "None",
  "cookies.fromBrowser": "From browser",
  "cookies.file": "cookies.txt",
  "cookies.howToExport": "How to export cookies.txt",
  "cookies.browser": "Browser",
  "cookies.notDetected": " (not detected)",
  "cookies.reliabilityGood": "Reliable",
  "cookies.reliabilityLimited": "Needs permission",
  "cookies.reliabilityPoor": "Often blocked",
  "cookies.profile": "Profile",
  "cookies.profilePlaceholder": "Default",
  "cookies.profileAriaLabel": "Browser profile (optional)",
  "cookies.profileTitle":
    "Profile name or path, e.g. “Profile 1”. Leave empty for the default profile.",
  "cookies.chooseDialogTitle": "Choose a cookies.txt file",
  "cookies.filterNetscape": "Netscape cookies",
  "cookies.noFileSelectedCap": "No file selected",
  "cookies.choose": "Choose…",
  "cookies.reportCount": "{count} cookies",
  "cookies.reportExpired": " ({count} expired)",
  "cookies.reportDomains": " for {domains}",

  // Command preview
  "preview.title": "Command preview",
  "preview.show": "Show",
  "preview.hide": "Hide",
  "preview.copyAriaLabel": "Copy command",
  "preview.copyError": "Couldn't copy: {error}",

  // Job list
  "jobs.title": "Downloads",
  "jobs.resumeQueue": "Resume queue",
  "jobs.pauseQueue": "Pause queue",
  "jobs.clearQueue": "Clear queue",
  "jobs.clearFinished": "Clear finished",
  "jobs.empty": "Downloads you start will appear here.",
  "jobs.waitingOne": "1 download waiting",
  "jobs.waitingOther": "{count} downloads waiting",
  "jobs.queuePausedBlocked": "The site is pushing back · queue paused, {waiting}",
  "jobs.queuePaused": "Queue paused · {waiting}",
  "jobs.setUpCookies": "Set up cookies",
  "jobs.resume": "Resume",
  "jobs.queued": "Queued",
  "jobs.removeFromQueue": "Remove from queue",
  "jobs.moreQueued": "and {count} more queued…",
  "jobs.cancelling": "Cancelling…",
  "jobs.starting": "Starting…",
  "jobs.eta": "ETA {eta}",
  "jobs.bytesOf": "{downloaded} of {total}",
  "jobs.postProcessing": "Post-processing…",
  "jobs.done": "Done",
  "jobs.doneFiles": "Done · {count} files",
  "jobs.partial": "Finished with errors · {count} saved",
  "jobs.failed": "Failed",
  "jobs.cancelled": "Cancelled",
  "jobs.cancelDownload": "Cancel download",
  "jobs.showInFolder": "Show in folder",
  "jobs.retry": "Retry",
  "jobs.hideLog": "Hide log",
  "jobs.showLog": "Show log",
  "jobs.noOutputYet": "No output yet.",

  // Postprocessors
  "postprocessor.Merger": "Merging video and audio",
  "postprocessor.ExtractAudio": "Extracting audio",
  "postprocessor.EmbedThumbnail": "Embedding thumbnail",
  "postprocessor.ThumbnailsConvertor": "Converting thumbnail",
  "postprocessor.EmbedSubtitle": "Embedding subtitles",
  "postprocessor.SubtitlesConvertor": "Converting subtitles",
  "postprocessor.Metadata": "Writing metadata",
  "postprocessor.MoveFiles": "Finishing up",
  "postprocessor.Fixup": "Fixing up container",
  "postprocessor.other": "Post-processing ({name})",

  // Settings dialog
  "settings.title": "Settings",
  "settings.section": "Settings section",
  "settings.tabGeneral": "General",
  "settings.tabCookies": "Cookies",
  "settings.tabEngine": "Engine",
  "settings.close": "Close",
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "settings.themeSystem": "System",
  "settings.language": "Language",
  "settings.subtitles": "Subtitles",
  "settings.subtitleLanguage": "Language",
  "settings.subtitleLanguageAria": "Subtitle language",
  "settings.custom": "Custom…",
  "settings.languageCodes": "Language codes",
  "settings.languageCodesAria": "Subtitle language codes",
  "settings.languageCodesTitle":
    "Comma-separated codes, e.g. en,pt-BR. Regex patterns like en.* are allowed.",
  "settings.subtitlesNote":
    "Used whenever subtitles are on. YouTube often refuses auto-translated captions; when that happens the video is still saved and the download shows a note.",
  "settings.batchDownloads": "Batch downloads",
  "settings.simultaneousDownloads": "Simultaneous downloads",
  "settings.batchNote":
    "Extra links wait in a queue. If the site asks you to sign in or starts rate-limiting, the queue pauses so you can turn on cookies and resume.",
  "settings.engine": "Engine",
  "settings.recheck": "Re-check",
  "settings.chooseExecutable": "Choose executable",
  "settings.installOneCommand": "Install with one command",
  "settings.ytdlpGuide": "yt-dlp install guide",
  "settings.ffmpegDownloads": "ffmpeg downloads",
  "settings.notFound": "not found",
  "settings.sourceCustom": "custom",
  "settings.sourceBundled": "bundled",
  "settings.sourceSystem": "system",
  "settings.useAutomatic": "Use automatic",
  "settings.browse": "Browse…",
  "settings.checking": "Checking…",

  // Backend messages (warnings, hints, errors, browser notes)
  "backend.warn.ffmpegMissing":
    "ffmpeg wasn't found. Merging video and audio, extracting audio and converting files will fail.",
  "backend.warn.broadSubLangs":
    "Broad language patterns with auto-captions can download dozens of translated tracks and trigger YouTube rate limits (HTTP 429).",
  "backend.warn.subsInAudio":
    "Subtitles can't be embedded in audio files; they are saved alongside instead.",
  "backend.warn.wavThumbnail":
    "WAV files can't hold cover art, so the thumbnail is saved as a separate image.",
  "backend.warn.subtitleFailed":
    "Some subtitle tracks couldn't be downloaded. YouTube often refuses auto-translated captions; see the log for which ones.",
  "backend.browser.firefox": "Most reliable option on every platform.",
  "backend.browser.safariMac":
    "Requires Full Disk Access for this app (System Settings → Privacy & Security).",
  "backend.browser.safariOther": "Safari is only available on macOS.",
  "backend.browser.chromiumMac":
    'macOS asks for Keychain access ("Safe Storage") the first time. Click Allow.',
  "backend.browser.chromiumWin":
    "Recent versions lock and encrypt cookies (App-Bound Encryption). Close the browser fully, or use Firefox / cookies.txt.",
  "backend.browser.linuxKeyring": "Needs access to your keyring (GNOME Keyring / KWallet).",
  "backend.cookieFile.notTxt": "Choose a .txt file in Netscape cookies format.",
  "backend.cookieFile.notFile": "This is not a file.",
  "backend.cookieFile.tooLarge": "File is too large to be a cookies.txt.",
  "backend.cookieFile.notReadable": "File not found or not readable.",
  "backend.cookieFile.jsonExport":
    "This looks like a JSON cookie export. Export in Netscape (cookies.txt) format instead.",
  "backend.cookieFile.noneFound": "No cookies in Netscape (cookies.txt) format were found.",
  "backend.cookieFile.allExpired": "All cookies in this file have expired. Export a fresh copy.",
  "backend.hint.authRequired":
    "This video needs a signed-in session. Open Settings → Cookies and pick your browser (Firefox is most reliable) or import a cookies.txt file.",
  "backend.hint.authRequiredWithCookies":
    "Cookies were sent, but the site still wants a sign-in. Sign in again in that browser (or export a fresh cookies.txt), then retry.",
  "backend.hint.cookieExtraction":
    "yt-dlp couldn't read your browser's cookies. Close the browser completely and retry, switch to Firefox, or import a cookies.txt file instead.",
  "backend.hint.cookieFile":
    "The cookies file couldn't be used. Export it again in Netscape (cookies.txt) format while signed in.",
  "backend.hint.rateLimited":
    "The site is rate-limiting requests. Wait a few minutes, or sign in with cookies (Settings → Cookies).",
  "backend.hint.forbidden":
    "The site refused the request (HTTP 403). Updating yt-dlp usually fixes this; signing in with cookies can also help.",
  "backend.hint.geoRestricted": "This video isn't available in your region.",
  "backend.hint.ffmpegMissing":
    "Install ffmpeg (or set its path in Settings) to merge and convert media.",
  "backend.hint.unsupportedUrl": "yt-dlp doesn't recognise this link. Check the URL.",
  "backend.hint.unavailable": "The video is unavailable, private or removed.",
  "backend.hint.network": "Check your internet connection and try again.",
  "backend.hint.unknown": "See the log for details. Updating yt-dlp often fixes extraction errors.",
  "backend.hint.checkYtdlpPath": "Check the yt-dlp path in Settings.",
  "backend.error.emptyUrl": "Please enter a URL",
  "backend.error.chooseOutputDir": "Choose an output folder",
  "backend.error.outputDirMissing": "The output folder doesn't exist.",
  "backend.error.chooseCookieFile": "Choose a cookies.txt file",
  "backend.error.invalidCookieFile": "The cookies file isn't valid.",
  "backend.error.safariMacOnly": "Safari cookies are only available on macOS",
  "backend.error.profileColons": 'Browser profile names can\'t contain "::"',
  "backend.error.binaryNotRunnable": "Found, but it didn't run. Check that it's executable.",
} as const;

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;
