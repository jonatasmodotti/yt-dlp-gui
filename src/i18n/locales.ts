import { en, type TranslationKey, type Translations } from "./en";
import { pt } from "./pt";

export { en, pt, type TranslationKey, type Translations };

/**
 * Supported UI dictionaries.
 *
 * To add a new language:
 * 1. Copy `en.ts` to `<code>.ts` and translate the values.
 * 2. Add the dictionary to `DICTIONARIES` and its label to `LANGUAGES` below.
 */
export const DICTIONARIES = {
  en,
  pt,
} as const satisfies Record<string, Translations>;

export type Language = keyof typeof DICTIONARIES;

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
];

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && value in DICTIONARIES;
}

/** Picks a supported language from the OS/browser locale, falling back to English. */
export function detectLanguage(locale?: string): Language {
  const raw =
    locale ?? (typeof navigator !== "undefined" && navigator.language ? navigator.language : "en");
  const code = raw.split(/[-_]/)[0]?.toLowerCase();
  return isLanguage(code) ? code : "en";
}
