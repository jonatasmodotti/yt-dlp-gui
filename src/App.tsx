import { downloadDir, homeDir } from "@tauri-apps/api/path";
import { useEffect, useState } from "react";
import { CommandPreview } from "./components/CommandPreview";
import { CookiesStatus } from "./components/CookiesSettings";
import { EngineBanner } from "./components/EngineBanner";
import { FormatCard } from "./components/FormatCard";
import { Header } from "./components/Header";
import { JobList } from "./components/JobList";
import { OutputCard } from "./components/OutputCard";
import { SettingsDialog } from "./components/SettingsDialog";
import { SubtitlesCard } from "./components/SubtitlesCard";
import { UrlBar } from "./components/UrlBar";
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
        <div className="mx-auto max-w-5xl space-y-4 p-5">
          <EngineBanner />
          <UrlBar url={url} onUrlChange={setUrl} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <FormatCard />
              <SubtitlesCard />
            </div>
            <div className="space-y-4">
              <OutputCard />
              <CookiesStatus url={url} />
            </div>
          </div>
          <CommandPreview url={url} />
          <JobList />
        </div>
      </main>
      <SettingsDialog />
    </div>
  );
}
