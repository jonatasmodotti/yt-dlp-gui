import { Settings } from "lucide-react";
import { useI18n } from "../i18n";
import { useEngine } from "../store/engine";
import { Button } from "./ui";

export function Header() {
  const openSettings = useEngine((s) => s.openSettings);
  const { t } = useI18n();

  return (
    <header className="shrink-0 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[42rem] items-center gap-3 px-4 py-3 sm:px-6">
        <img src="/video-downloader.png" alt="" width="38" height="38" />
        <div className="mr-auto leading-tight">
          <h1 className="text-base font-semibold tracking-tight">Video Downloader</h1>
          <p className="text-xs text-muted">{t("header.tagline")}</p>
        </div>
        <Button onClick={() => openSettings()}>
          <Settings /> {t("header.settings")}
        </Button>
      </div>
    </header>
  );
}
