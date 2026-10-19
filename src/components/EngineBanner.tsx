import { TriangleAlert } from "lucide-react";
import { useI18n } from "../i18n";
import { useEngine } from "../store/engine";
import { Button, cx } from "./ui";

export function EngineBanner() {
  const status = useEngine((s) => s.status);
  const openSettings = useEngine((s) => s.openSettings);
  const { t } = useI18n();
  if (!status) return null;

  const missingYtdlp = !status.ytdlp.version;
  const missingFfmpeg = !status.ffmpeg.version;
  if (!missingYtdlp && !missingFfmpeg) return null;

  // Found but not runnable (or a slow first start timed out) isn't "not found".
  const message = missingYtdlp
    ? t(status.ytdlp.path ? "engineBanner.ytdlpNotRunnable" : "engineBanner.ytdlpNotFound")
    : t(status.ffmpeg.path ? "engineBanner.ffmpegNotRunnable" : "engineBanner.ffmpegNotFound");

  return (
    <div
      role="alert"
      className={cx(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
        missingYtdlp ? "border-danger/40 bg-danger/10" : "border-warn/40 bg-warn/10",
      )}
    >
      <TriangleAlert
        className={cx("size-5 shrink-0", missingYtdlp ? "text-danger" : "text-warn")}
      />
      <span className="flex-1">{message}</span>
      <Button onClick={() => openSettings("engine")}>{t("engineBanner.setUp")}</Button>
    </div>
  );
}
