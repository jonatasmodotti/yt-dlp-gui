import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DownloadOptions } from "../bindings/DownloadOptions";
import defaultOptions from "../bindings/defaultOptions.json";
import type { EngineSettings } from "../bindings/EngineSettings";
import { detectLanguage, isLanguage, type Language } from "../i18n/locales";
import { PREFS_KEY, type ThemePreference } from "../theme";

/** Generated from `DownloadOptions::default()` in Rust by `pnpm bindings`. */
export const DEFAULT_OPTIONS = defaultOptions as DownloadOptions;

/** Downloads that may run at once. Tested: 20 at once didn't trip YouTube's bot check. */
export const CONCURRENCY_CHOICES = [1, 2, 3, 4, 5] as const;

interface PrefsState {
  theme: ThemePreference;
  language: Language;
  outputDir: string;
  options: DownloadOptions;
  engine: EngineSettings;
  concurrency: number;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: Language) => void;
  setOutputDir: (dir: string) => void;
  setOptions: (patch: Partial<DownloadOptions>) => void;
  setEngine: (patch: Partial<EngineSettings>) => void;
  setConcurrency: (concurrency: number) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: "system",
      language: detectLanguage(),
      outputDir: "",
      options: DEFAULT_OPTIONS,
      engine: { ytdlpPath: null, ffmpegPath: null },
      concurrency: 3,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setOutputDir: (outputDir) => set({ outputDir }),
      setOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),
      setEngine: (patch) => set((s) => ({ engine: { ...s.engine, ...patch } })),
      setConcurrency: (concurrency) => set({ concurrency }),
    }),
    {
      name: PREFS_KEY,
      version: 1,
      // Fill in options added after the user's prefs were first saved.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PrefsState>;
        return {
          ...current,
          ...p,
          language: isLanguage(p.language) ? p.language : current.language,
          options: {
            ...DEFAULT_OPTIONS,
            ...p.options,
            subtitles: { ...DEFAULT_OPTIONS.subtitles, ...p.options?.subtitles },
          },
          engine: { ...current.engine, ...p.engine },
        };
      },
    },
  ),
);
