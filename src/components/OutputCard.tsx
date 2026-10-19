import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { FolderOpen, HardDrive } from "lucide-react";
import { useI18n } from "../i18n";
import { usePrefs } from "../store/prefs";
import { Button, Card } from "./ui";

export function OutputCard() {
  const dir = usePrefs((s) => s.outputDir);
  const setDir = usePrefs((s) => s.setOutputDir);
  const { t } = useI18n();

  async function choose() {
    const picked = await open({
      directory: true,
      defaultPath: dir || undefined,
      title: t("output.dialogTitle"),
    });
    if (typeof picked === "string") setDir(picked);
  }

  return (
    <Card title={t("output.title")} icon={<HardDrive />}>
      <div className="flex items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs"
          title={dir}
        >
          {dir || t("output.noFolder")}
        </code>
        <Button onClick={choose}>{t("output.change")}</Button>
        <Button
          variant="ghost"
          aria-label={t("output.showFolder")}
          disabled={!dir}
          onClick={() => revealItemInDir(dir)}
        >
          <FolderOpen />
        </Button>
      </div>
    </Card>
  );
}
