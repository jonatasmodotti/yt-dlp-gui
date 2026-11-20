import { useCallback, useMemo } from "react";
import { usePrefs } from "../store/prefs";
import {
  DICTIONARIES,
  detectLanguage,
  en,
  isLanguage,
  LANGUAGES,
  type Language,
  pt,
  type TranslationKey,
  type Translations,
} from "./locales";

export {
  DICTIONARIES,
  detectLanguage,
  en,
  isLanguage,
  LANGUAGES,
  type Language,
  pt,
  type TranslationKey,
  type Translations,
};

export type TranslateParams = Record<string, string | number>;
export type TranslateFn = (key: TranslationKey, params?: TranslateParams) => string;

/** Map of English strings to their translation keys for translating backend messages. */
const REVERSE_EN = new Map<string, TranslationKey>(
  (Object.entries(en) as [TranslationKey, string][]).map(([k, v]) => [v, k]),
);

export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{${key}}`,
  );
}

/** Creates a translator function for a given language code. */
export function createTranslator(language: Language): TranslateFn {
  const dict = DICTIONARIES[language] ?? en;
  return (key, params) => {
    const template = dict[key] ?? en[key];
    return interpolate(template, params);
  };
}

/** Translates a known backend message (warning, hint, error) if present in the dictionary. */
export function translateText(text: string, language: Language): string {
  const key = REVERSE_EN.get(text);
  if (!key) return text;
  const dict = DICTIONARIES[language] ?? en;
  return dict[key] ?? text;
}

/** React hook returning `t` (by key), `tr` (raw backend message), and current `language`. */
export function useI18n() {
  const language = usePrefs((s) => s.language);
  const t = useMemo(() => createTranslator(language), [language]);
  const tr = useCallback((text: string) => translateText(text, language), [language]);
  return { language, t, tr };
}
