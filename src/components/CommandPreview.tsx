import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Check, Copy, Terminal, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { CommandPreview as Preview } from "../bindings/CommandPreview";
import { useI18n } from "../i18n";
import { shellQuote } from "../lib/format";
import { api, errorMessage } from "../lib/ipc";
import { platform } from "../lib/platform";
import { buildRequest } from "../lib/request";
import { useEngine } from "../store/engine";
import { usePrefs } from "../store/prefs";
import { Button } from "./ui";

/** Shows the exact yt-dlp command for the current settings, plus any warnings. */
export function CommandPreview({ url }: { url: string }) {
  const options = usePrefs((s) => s.options);
  const outputDir = usePrefs((s) => s.outputDir);
  const engine = usePrefs((s) => s.engine);
  // Re-run after Settings → Re-check so ffmpeg warnings don't go stale.
  const engineStatus = useEngine((s) => s.status);
  const { t, tr } = useI18n();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void engineStatus;
    let stale = false;
    const placeholder = url.trim() || "<URL>";
    const timer = window.setTimeout(() => {
      api.previewCommand(buildRequest(placeholder, { options, outputDir, engine })).then(
        (p) => {
          if (stale) return;
          setPreview(p);
          setError(null);
        },
        (e) => {
          if (stale) return;
          setPreview(null);
          setError(errorMessage(e));
        },
      );
    }, 150);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [url, options, outputDir, engine, engineStatus]);

  const shell = platform === "windows" ? "powershell" : "posix";
  // PowerShell treats a quoted first token as a string; `&` runs it instead.
  const command = preview
    ? (shell === "powershell" ? "& " : "") +
      [preview.program, ...preview.args].map((a) => shellQuote(a, shell)).join(" ")
    : "";

  async function copy() {
    try {
      await writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setError(t("preview.copyError", { error: errorMessage(e) }));
    }
  }

  return (
    <div className="space-y-2">
      {preview?.warnings.map((w) => (
        <p key={w} className="flex items-start gap-2 rounded-lg bg-warn/10 px-3 py-2 text-xs">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-warn" />
          {tr(w)}
        </p>
      ))}
      <details className="group rounded-xl border border-line bg-surface">
        <summary className="disclosure flex items-center gap-2 px-3.5 py-3 text-sm text-muted hover:bg-surface-2 hover:text-fg">
          <Terminal className="size-4 text-accent" />
          {t("preview.title")}
          {platform === "windows" ? " (PowerShell)" : ""}
          <span className="ml-auto text-xs group-open:hidden">{t("preview.show")}</span>
          <span className="ml-auto hidden text-xs group-open:inline">{t("preview.hide")}</span>
        </summary>
        <div className="border-t border-line p-3">
          {error ? (
            <p className="text-xs text-danger">{tr(error)}</p>
          ) : (
            <div className="flex items-start gap-2">
              <pre className="max-h-40 min-w-0 flex-1 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                {command}
              </pre>
              <Button
                variant="ghost"
                aria-label={t("preview.copyAriaLabel")}
                onClick={copy}
                disabled={!command}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
