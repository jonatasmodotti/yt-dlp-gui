import { Download, Settings } from "lucide-react";
import { useI18n } from "../i18n";
import { useEngine } from "../store/engine";
import { Button } from "./ui";

export function Header() {
  const openSettings = useEngine((s) => s.openSettings);
  const { t } = useI18n();

  return (
    <header className="flex items-center gap-3 border-b border-line bg-surface/80 px-5 py-3 backdrop-blur">
      <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
        <Download className="size-4" strokeWidth={2.5} />
      </div>
      <div className="mr-auto leading-tight">
        <h1 className="text-[15px] font-semibold">yt-dlp GUI</h1>
        <p className="text-xs text-muted">{t("header.tagline")}</p>
      </div>
      <Button variant="ghost" onClick={() => openSettings()}>
        <Settings /> {t("header.settings")}
      </Button>
    </header>
  );
}
