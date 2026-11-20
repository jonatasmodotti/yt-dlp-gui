# yt-dlp GUI

**Video Downloader** is a cross-platform desktop app (macOS, Windows, Linux) for
[yt-dlp](https://github.com/yt-dlp/yt-dlp). Paste a link and get a
best-quality MP4, or pick options with toggles instead of command-line flags.

Built with Tauri v2 (Rust) and React + TypeScript + Tailwind CSS.

## Features

- **One-field downloads:** video or playlist links; best-quality MP4 by default.
- **Batch downloads:** paste many links (one per line) and they queue up, with
  1–5 running at once (Settings). The queue pauses when a site asks for a sign-in
  or starts rate-limiting, so you can turn on cookies and resume.
- **Options as controls:** audio only (MP3 / M4A / WAV), max quality, thumbnail
  (save / embed), subtitles (manual + auto-generated, SRT / VTT, embed),
  whole-playlist toggle.
- **Download all:** best MP4 plus a separate audio file, thumbnail and transcripts in one run.
- **Live progress:** overall percent across merged streams, speed, ETA, and
  post-processing steps (merging, embedding, converting); playlist position.
- **Cookies (Settings → Cookies):** use your browser's session, or a cookies.txt
  file that's validated as soon as you pick it. See [docs/cookies.md](docs/cookies.md).
- **Command preview:** shows the exact yt-dlp command; copy it to run in a terminal.
- **Settings:** Light / Dark / System theme, default subtitle language,
  simultaneous downloads, cookies and engine paths, all persisted.
- Clear errors with actionable hints, retry, cancel (stops ffmpeg too), and
  reveal-in-folder.

## Requirements

The app uses your installed `yt-dlp` and `ffmpeg` (bundling is planned):

| OS | Install |
|---|---|
| macOS | `brew install yt-dlp ffmpeg deno` |
| Windows | `winget install yt-dlp.yt-dlp Gyan.FFmpeg DenoLand.Deno` |
| Linux | `pipx install yt-dlp`, plus ffmpeg and deno from your package manager |

[deno](https://deno.com) is the JavaScript runtime yt-dlp needs for full YouTube
format support.

It finds them on PATH and in common install locations (Homebrew, WinGet, Scoop,
`~/.local/bin`, …). You can also set custom paths in **Settings**.

## Development

```sh
pnpm install
pnpm tauri dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the architecture and a step-by-step
guide to exposing new yt-dlp flags.

## Legal

This app is a front-end for yt-dlp. Only download content you have the right to
download, and respect the terms of the sites you use.

## License

[MIT](LICENSE)
