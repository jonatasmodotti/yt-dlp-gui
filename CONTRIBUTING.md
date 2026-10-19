# Contributing

Thanks for helping! This guide covers setup, the architecture, and the most
common contribution: **exposing another yt-dlp flag in the UI**.

## Setup

Prerequisites: [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/),
Node 24+, pnpm, a recent stable Rust, and `yt-dlp` + `ffmpeg` on your PATH.

```sh
pnpm install
pnpm tauri dev        # run the app (Vite on :1430)
```

| Task | Command |
|---|---|
| Frontend lint + types | `pnpm lint` (auto-fix: `pnpm format`) |
| Frontend tests | `pnpm test` |
| Rust lint / tests | `cd src-tauri && cargo clippy --all-targets -- -D warnings && cargo test` |
| Live download test (network) | `cd src-tauri && cargo test -- --ignored live_download` |
| Regenerate TS types | `pnpm bindings` |

## Architecture

```
React UI ──invoke──▶ commands.rs ──▶ builder/ ──▶ argv ──▶ jobs.rs ──spawn──▶ yt-dlp
   ▲                                                         │
   └────────── "ytdlp://job" events ◀── progress.rs ◀── stdout/stderr
```

- `src-tauri/src/options.rs` holds the request model, one field per UI control.
  Types derive `ts-rs`, so `src/bindings/*.ts` is generated and never hand-edited.
- `src-tauri/src/builder/` turns options into argv. Each flag group is an
  `ArgContributor`, and `REGISTRY` in `builder/mod.rs` lists them in order.
- `src-tauri/src/progress.rs` defines the machine-readable line protocol
  (`--progress-template` / `--print`, prefixed `YTGUI|`) and its parser. They
  live together so they can't drift.
- `src-tauri/src/jobs.rs` spawns yt-dlp, reads both streams (postprocess
  progress arrives on **stderr**), emits events, and handles cancel by killing the
  whole process tree.
- `src/store/jobs.ts` is a pure reducer from events to UI state.

## Adding a yt-dlp flag (example: `--sponsorblock-remove`)

1. **Model:** add a field to `DownloadOptions` in `options.rs` and to its
   `Default` impl (the single source of defaults; the frontend imports the
   generated `src/bindings/defaultOptions.json`):
   ```rust
   /// Cut SponsorBlock segments (`--sponsorblock-remove`).
   pub remove_sponsors: bool,
   ```
2. **Builder:** map it to argv. Use an existing contributor if it fits; otherwise
   create `builder/sponsorblock.rs`:
   ```rust
   pub struct SponsorBlock;
   impl ArgContributor for SponsorBlock {
       fn contribute(&self, ctx: &BuildContext, args: &mut Args) -> Result<(), BuildError> {
           if ctx.options.remove_sponsors {
               args.opt("--sponsorblock-remove", "sponsor");
           }
           Ok(())
       }
   }
   ```
   Then add `mod sponsorblock;` and `&sponsorblock::SponsorBlock` to `REGISTRY`.
   Use `args.warn(..)` for valid-but-surprising combinations and
   `Err(BuildError::Invalid(..))` for impossible ones.
3. **Test:** add a `#[cfg(test)]` module next to the contributor. The helpers in
   `builder::test_util` (`argv`, `warnings`, `contains`) keep tests short.
4. **Types:** run `pnpm bindings` to regenerate the TS types and default
   options. CI fails if they're out of date.
5. **UI:** add a control (e.g. `<Switch>` from `components/ui.tsx`) to the
   relevant card. The command preview shows the new flag immediately.

Nothing in the job runner, IPC layer or progress parser needs to change.

**Presets:** if the option is a media choice that "Download all" should
override, set it in `DownloadOptions::effective()` (`options.rs`) and mirror the
locked display in `FormatCard.tsx` / `SubtitlesCard.tsx`.

## Adding a translation

UI strings live in flat, type-checked dictionaries under `src/i18n/`:

1. Copy `src/i18n/en.ts` to `src/i18n/<code>.ts`, type it as `Translations`,
   and translate the values (keep `{placeholder}` tokens intact).
2. Register the dictionary in `DICTIONARIES` and `LANGUAGES` in `src/i18n/locales.ts`.
3. Run `pnpm lint && pnpm test` — TypeScript and the i18n test suite verify that
   every key from `en.ts` is present and non-empty.

## Conventions

- Rust: `cargo fmt`, clippy clean with `-D warnings`. Frontend: Biome.
- UI colors come only from the tokens in `src/styles.css` (`bg-surface`,
  `text-muted`, …), so themes stay consistent.
- Keep commands thin; put logic in plain Rust functions that are unit-testable.
