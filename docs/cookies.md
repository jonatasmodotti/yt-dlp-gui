# Cookies & authentication

Some videos only download for a signed-in session: age-restricted, members-only,
private, or YouTube's "Sign in to confirm you're not a bot" checks. yt-dlp can
borrow your browser's session in two ways, and the app supports both.

| | From browser (`--cookies-from-browser`) | cookies.txt (`--cookies`) |
|---|---|---|
| Setup | Pick a browser | Export a file with an extension |
| Stays fresh | Yes, reads the live session | No, re-export when it expires |
| macOS | Firefox ✅ · Chromium browsers ask for **Keychain** access once ("Safe Storage") · Safari needs **Full Disk Access** for this app | ✅ |
| Windows | Firefox ✅ · Chrome/Edge/Brave v127+ use **App-Bound Encryption**, which yt-dlp usually can't read; the cookie DB is also **locked while the browser runs** | ✅ |
| Linux | Firefox ✅ (incl. snap/flatpak) · Chromium browsers need keyring access (GNOME Keyring / KWallet) | ✅ |

**Recommendation:** use *From browser → Firefox* when possible; otherwise use a
cookies.txt export. The app marks each browser *Reliable*, *Needs permission* or
*Often blocked* for your OS (`src-tauri/src/browsers.rs`).

## Exporting cookies.txt

1. Sign in to the site in your browser (the **Open link in browser** button helps).
2. Export cookies in **Netscape format** with an extension. yt-dlp's FAQ keeps a
   vetted list: <https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp>.
3. Choose the file under **Cookies → cookies.txt**. The app checks it straight away
   (cookie count, domains, expiry) so mistakes surface before downloading.

Treat cookies.txt like a password: it grants access to your account.

yt-dlp writes the cookie jar back to the `--cookies` file when it exits. The app
validates your file and gives yt-dlp a private temporary copy, so your export is
never modified.

## When things fail

yt-dlp's stderr is classified in `src-tauri/src/errors.rs`. Cookie-read failures
(`CookieExtraction`) and sign-in walls (`AuthRequired`) show a hint pointing to
the other approach, and **Retry** re-runs the job with your current cookie settings.
Cookies are configured in **Settings → Cookies**; the main screen only shows the
current source.

## Batch downloads

Tested on 2026-10-18 without cookies (yt-dlp 2026.08.19): 8 and then 20 YouTube
videos downloaded at the same time all succeeded, with no bot check. So batches
don't require cookies. The one failure seen was subtitles: YouTube answers
auto-translated tracks (e.g. `pt` on an English video) with HTTP 429 even for a
single download. With subtitles on, the builder passes `--ignore-errors` so a
refused track becomes a warning on the job and the video is still saved.

Queued items start with the cookies set at the time they start, not when they were
queued. If a queued job fails with `AuthRequired` or `RateLimited`, the queue pauses
and points to Settings → Cookies; resume after turning cookies on.

## Architecture & future work

Everything goes through one enum, `CookieSource` (`None | Browser | File`), and one
builder contributor (`src-tauri/src/builder/cookies.rs`). Planned extensions fit
the same shape:

- keyring selection (`chrome+gnomekeyring`) and Firefox containers (`firefox::work`)
  as optional fields on `CookieSource::Browser`;
- an in-app "refresh cookies" helper that drives a sign-in window.
