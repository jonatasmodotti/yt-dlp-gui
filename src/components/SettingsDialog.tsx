import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CircleAlert, CircleCheck, Monitor, Moon, RefreshCw, Sun, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { BinaryInfo } from "../bindings/BinaryInfo";
import type { BinarySource } from "../bindings/BinarySource";
import type { EngineSettings } from "../bindings/EngineSettings";
import { LANGUAGES, type Language, type TranslationKey, useI18n } from "../i18n";
import { type Platform, platform } from "../lib/platform";
import { type SettingsTab, useEngine } from "../store/engine";
import { CONCURRENCY_CHOICES, usePrefs } from "../store/prefs";
import type { ThemePreference } from "../theme";
import { CookiesSettings } from "./CookiesSettings";
import { Button, Field, inputClass, Segmented, Select } from "./ui";

// deno is the JS runtime yt-dlp needs for full YouTube format support.
const INSTALL: Record<Platform, string> = {
  macos: "brew install yt-dlp ffmpeg deno",
  windows: "winget install yt-dlp.yt-dlp Gyan.FFmpeg DenoLand.Deno",
  linux: "pipx install yt-dlp  # plus ffmpeg and deno from your package manager",
};

const THEMES: { value: ThemePreference; labelKey: TranslationKey; icon: ReactNode }[] = [
  { value: "light", labelKey: "settings.themeLight", icon: <Sun /> },
  { value: "dark", labelKey: "settings.themeDark", icon: <Moon /> },
  { value: "system", labelKey: "settings.themeSystem", icon: <Monitor /> },
];

const TABS: { value: SettingsTab; labelKey: TranslationKey }[] = [
  { value: "general", labelKey: "settings.tabGeneral" },
  { value: "cookies", labelKey: "settings.tabCookies" },
  { value: "engine", labelKey: "settings.tabEngine" },
];

const SOURCE_KEYS: Record<BinarySource, TranslationKey> = {
  custom: "settings.sourceCustom",
  bundled: "settings.sourceBundled",
  system: "settings.sourceSystem",
};

// Values go straight to `--sub-langs`. YouTube names Portuguese manual tracks
// `pt-BR` and auto captions `pt`, so both are listed.
const SUB_LANGUAGES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt-BR,pt", label: "Português (Brasil)" },
  { value: "pt-PT,pt", label: "Português (Portugal)" },
  { value: "es,es-419", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "ja", label: "日本語" },
  { value: "en,pt-BR,pt", label: "English + Português" },
];

export function SettingsDialog() {
  const isOpen = useEngine((s) => s.settingsOpen);
  const setOpen = useEngine((s) => s.setSettingsOpen);
  const tab = useEngine((s) => s.settingsTab);
  const setTab = useEngine((s) => s.setSettingsTab);
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      onClose={() => setOpen(false)}
      className="m-auto max-h-[88vh] w-[min(600px,92vw)] flex-col rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/40 open:flex"
    >
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <h2 className="font-semibold">{t("settings.title")}</h2>
        <Segmented
          label={t("settings.section")}
          value={tab}
          options={TABS.map((item) => ({ value: item.value, label: t(item.labelKey) }))}
          onChange={setTab}
        />
        <Button
          variant="ghost"
          className="ml-auto"
          aria-label={t("settings.close")}
          onClick={() => setOpen(false)}
        >
          <X />
        </Button>
      </div>
      <div className="overflow-y-auto p-5">
        {tab === "general" && <GeneralPanel />}
        {tab === "cookies" && <CookiesSettings />}
        {tab === "engine" && <EnginePanel />}
      </div>
    </dialog>
  );
}

function GeneralPanel() {
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const language = usePrefs((s) => s.language);
  const setLanguage = usePrefs((s) => s.setLanguage);
  const concurrency = usePrefs((s) => s.concurrency);
  const setConcurrency = usePrefs((s) => s.setConcurrency);
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <Section title={t("settings.appearance")}>
        <Field label={t("settings.theme")}>
          <Segmented
            label={t("settings.theme")}
            value={theme}
            options={THEMES.map((item) => ({
              value: item.value,
              label: t(item.labelKey),
              icon: item.icon,
            }))}
            onChange={setTheme}
          />
        </Field>
        <Field label={t("settings.language")}>
          <Select
            aria-label={t("settings.language")}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      </Section>
      <Section title={t("settings.subtitles")}>
        <SubtitleLanguages />
      </Section>
      <Section title={t("settings.batchDownloads")}>
        <Field label={t("settings.simultaneousDownloads")}>
          <Segmented
            label={t("settings.simultaneousDownloads")}
            value={String(concurrency)}
            options={CONCURRENCY_CHOICES.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(v) => setConcurrency(Number(v))}
          />
        </Field>
        <p className="text-xs text-muted">{t("settings.batchNote")}</p>
      </Section>
    </div>
  );
}

function SubtitleLanguages() {
  const subtitles = usePrefs((s) => s.options.subtitles);
  const setOptions = usePrefs((s) => s.setOptions);
  const { t } = useI18n();
  const languages = subtitles.languages;
  const preset = SUB_LANGUAGES.some((l) => l.value === languages);
  const [custom, setCustom] = useState(!preset);
  const setLanguages = (value: string) =>
    setOptions({ subtitles: { ...subtitles, languages: value } });

  return (
    <>
      <Field label={t("settings.subtitleLanguage")}>
        <Select
          aria-label={t("settings.subtitleLanguageAria")}
          value={custom ? "custom" : languages}
          onChange={(e) => {
            const value = e.target.value;
            setCustom(value === "custom");
            if (value !== "custom") setLanguages(value);
          }}
        >
          {SUB_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
          <option value="custom">{t("settings.custom")}</option>
        </Select>
      </Field>
      {custom && (
        <Field label={t("settings.languageCodes")}>
          <input
            className={`${inputClass} max-w-48 py-1.5 font-mono text-xs`}
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="en"
            aria-label={t("settings.languageCodesAria")}
            title={t("settings.languageCodesTitle")}
            spellCheck={false}
          />
        </Field>
      )}
      <p className="text-xs text-muted">{t("settings.subtitlesNote")}</p>
    </>
  );
}

function EnginePanel() {
  const status = useEngine((s) => s.status);
  const checking = useEngine((s) => s.checking);
  const refresh = useEngine((s) => s.refresh);
  const engine = usePrefs((s) => s.engine);
  const setEngine = usePrefs((s) => s.setEngine);
  const { t } = useI18n();

  async function browse(key: keyof EngineSettings) {
    const picked = await open({ title: t("settings.chooseExecutable") });
    if (typeof picked === "string") {
      setEngine({ [key]: picked }); // App re-checks the engine on change
    }
  }

  function reset(key: keyof EngineSettings) {
    setEngine({ [key]: null });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-center">
          <h3 className="text-sm font-semibold">{t("settings.engine")}</h3>
          <Button
            variant="ghost"
            className="ml-auto py-1 text-xs"
            disabled={checking}
            onClick={() => refresh(engine)}
          >
            <RefreshCw className={checking ? "animate-spin" : ""} /> {t("settings.recheck")}
          </Button>
        </div>
        <BinaryRow
          name="yt-dlp"
          info={status?.ytdlp}
          custom={engine.ytdlpPath}
          onBrowse={() => browse("ytdlpPath")}
          onReset={() => reset("ytdlpPath")}
        />
        <BinaryRow
          name="ffmpeg"
          info={status?.ffmpeg}
          custom={engine.ffmpegPath}
          onBrowse={() => browse("ffmpegPath")}
          onReset={() => reset("ffmpegPath")}
        />
      </section>
      <section className="space-y-2 rounded-lg bg-surface-2 p-3 text-xs">
        <p className="font-medium">{t("settings.installOneCommand")}</p>
        <code className={`${inputClass} block bg-surface font-mono text-xs`}>
          {INSTALL[platform]}
        </code>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            className="text-accent hover:underline"
            onClick={() => openUrl("https://github.com/yt-dlp/yt-dlp/wiki/Installation")}
          >
            {t("settings.ytdlpGuide")}
          </button>
          <button
            type="button"
            className="text-accent hover:underline"
            onClick={() => openUrl("https://ffmpeg.org/download.html")}
          >
            {t("settings.ffmpegDownloads")}
          </button>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function BinaryRow({
  name,
  info,
  custom,
  onBrowse,
  onReset,
}: {
  name: string;
  info?: BinaryInfo;
  custom: string | null;
  onBrowse: () => void;
  onReset: () => void;
}) {
  const { t, tr } = useI18n();
  const ok = Boolean(info?.version);
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-center gap-2">
        {ok ? (
          <CircleCheck className="size-4 text-ok" />
        ) : (
          <CircleAlert className="size-4 text-danger" />
        )}
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-muted">
          {info?.version ?? t("settings.notFound")}
          {info?.source && ` · ${t(SOURCE_KEYS[info.source])}`}
        </span>
        <div className="ml-auto flex gap-1">
          {custom && (
            <Button variant="ghost" className="py-1 text-xs" onClick={onReset}>
              {t("settings.useAutomatic")}
            </Button>
          )}
          <Button className="py-1 text-xs" onClick={onBrowse}>
            {t("settings.browse")}
          </Button>
        </div>
      </div>
      <p
        className="selectable mt-1.5 truncate font-mono text-[11px] text-muted"
        title={info?.path ?? ""}
      >
        {info?.path ?? (info?.error ? tr(info.error) : t("settings.checking"))}
      </p>
      {info?.path && info.error && <p className="mt-1 text-xs text-danger">{tr(info.error)}</p>}
    </div>
  );
}
