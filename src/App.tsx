import { downloadDir, homeDir } from "@tauri-apps/api/path";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { CommandPreview } from "./components/CommandPreview";
import { CookiesStatus } from "./components/CookiesSettings";
import { EngineBanner } from "./components/EngineBanner";
import { FormatCard, FormatExtras } from "./components/FormatCard";
import { Header } from "./components/Header";
import { JobList } from "./components/JobList";
import { SettingsDialog } from "./components/SettingsDialog";
import { SubtitlesCard } from "./components/SubtitlesCard";
import { UrlBar } from "./components/UrlBar";
import { useI18n } from "./i18n";
import { api } from "./lib/ipc";
import { useEngine } from "./store/engine";
import { useJobs } from "./store/jobs";
import { usePrefs } from "./store/prefs";
import { startQueueRunner } from "./store/queue";
import { useTheme } from "./theme";

export default function App() {
  const [url, setUrl] = useState("");
  const theme = usePrefs((s) => s.theme);
  const language = usePrefs((s) => s.language);
  const engine = usePrefs((s) => s.engine);
  const refreshEngine = useEngine((s) => s.refresh);
  const { t } = useI18n();
  useTheme(theme);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const unlisten = api.onJobEvent(useJobs.getState().apply);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => startQueueRunner(), []);

  useEffect(() => {
    if (!usePrefs.getState().outputDir) {
      // Some Linux setups have no XDG download dir; fall back to home.
      downloadDir()
        .catch(() => homeDir())
        .then(usePrefs.getState().setOutputDir, () => {});
    }
  }, []);

  useEffect(() => {
    refreshEngine(engine);
  }, [engine, refreshEngine]);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[42rem] space-y-3 px-4 py-4 sm:px-6">
          <EngineBanner />
          <UrlBar url={url} onUrlChange={setUrl} />
          <FormatCard />
          <JobList />
          <details className="group rounded-xl border border-line bg-surface">
            <summary className="disclosure flex items-center gap-2 px-3.5 py-3 text-sm font-medium hover:bg-surface-2">
              <SlidersHorizontal className="size-4 text-accent" />
              {t("format.advanced")}
              <ChevronDown className="ml-auto size-4 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-2.5 border-t border-line bg-bg p-3">
              <FormatExtras />
              <SubtitlesCard />
              <CookiesStatus url={url} />
            </div>
          </details>
          <CommandPreview url={url} />
        </div>
      </main>
      <SettingsDialog />
    </div>
  );
}
