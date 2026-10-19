import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { ArrowDownToLine, ClipboardPaste, Link2, ListPlus } from "lucide-react";
import { type ClipboardEvent, type FormEvent, useState } from "react";
import { useI18n } from "../i18n";
import { api, errorMessage } from "../lib/ipc";
import { buildRequest } from "../lib/request";
import { parseUrls } from "../lib/urls";
import { useJobs } from "../store/jobs";
import { usePrefs } from "../store/prefs";
import { useQueue } from "../store/queue";
import { Button, cx } from "./ui";

export function UrlBar({ url, onUrlChange }: { url: string; onUrlChange: (url: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [batch, setBatch] = useState(false);
  const [batchText, setBatchText] = useState("");
  const attach = useJobs((s) => s.attach);
  const enqueue = useQueue((s) => s.enqueue);
  const { t, tr } = useI18n();
  const batchUrls = parseUrls(batchText);

  function changeBatch(text: string) {
    setBatchText(text);
    setError(null);
    setNotice(null);
    // The command preview and "Open link in browser" follow the first link.
    onUrlChange(parseUrls(text)[0] ?? "");
  }

  function toggleBatch() {
    if (batch) {
      setBatch(false);
    } else {
      setBatch(true);
      changeBatch(url.trim());
    }
  }

  async function start(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (batch) {
      if (batchUrls.length === 0) return;
      const prefs = usePrefs.getState();
      enqueue(batchUrls.map((u) => buildRequest(u, prefs)));
      setNotice(
        batchUrls.length === 1
          ? t("urlBar.addedQueueOne")
          : t("urlBar.addedQueueOther", { count: batchUrls.length }),
      );
      setBatchText("");
      onUrlChange("");
      return;
    }
    setStarting(true);
    try {
      const request = buildRequest(url, usePrefs.getState());
      const id = await api.startDownload(request);
      attach(id, request);
      onUrlChange("");
    } catch (err) {
      setError(tr(errorMessage(err)));
    } finally {
      setStarting(false);
    }
  }

  /** Several links at once switch to batch mode instead of mangling one field. */
  function takeText(text: string): boolean {
    const urls = parseUrls(text);
    if (urls.length < 2) return false;
    setBatch(true);
    // Keep what's in the field being pasted into, never a stale batch.
    changeBatch([...parseUrls(batch ? batchText : url), ...urls].join("\n"));
    return true;
  }

  function onPasteSingle(e: ClipboardEvent<HTMLInputElement>) {
    if (takeText(e.clipboardData.getData("text"))) e.preventDefault();
  }

  async function paste() {
    try {
      const text = (await readText())?.trim();
      if (!text || takeText(text)) return;
      if (batch) changeBatch(batchText ? `${batchText.trimEnd()}\n${text}` : text);
      else onUrlChange(text);
    } catch {
      setError(t("urlBar.clipboardError"));
    }
  }

  const frame = cx(
    "flex gap-2 rounded-xl border bg-surface p-1.5 pl-3 shadow-card transition-colors",
    "focus-within:border-accent",
    error ? "border-danger" : "border-line",
  );
  const batchButton = (
    <Button
      variant="ghost"
      onClick={toggleBatch}
      aria-pressed={batch}
      title={batch ? t("urlBar.batchTitleSingle") : t("urlBar.batchTitleMultiple")}
      className={cx(batch && "bg-accent-soft text-fg")}
    >
      <ListPlus /> {t("urlBar.batch")}
    </Button>
  );

  return (
    <form onSubmit={start} className="space-y-2">
      {batch ? (
        <div className={cx(frame, "flex-col pr-1.5")}>
          <textarea
            // biome-ignore lint/a11y/noAutofocus: switching to batch mode moves focus here
            autoFocus
            value={batchText}
            onChange={(e) => changeBatch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start(e);
            }}
            rows={5}
            placeholder={t("urlBar.batchPlaceholder")}
            aria-label={t("urlBar.batchAriaLabel")}
            spellCheck={false}
            className="min-h-24 w-full resize-y bg-transparent py-2 font-mono text-[13px] leading-relaxed outline-none placeholder:text-muted"
          />
          <div className="flex items-center gap-2 border-t border-line pt-1.5">
            <span className="mr-auto text-xs text-muted">
              {batchUrls.length === 0
                ? t("urlBar.noLinksYet")
                : batchUrls.length === 1
                  ? t("urlBar.batchCountOne")
                  : t("urlBar.batchCountOther", { count: batchUrls.length })}
            </span>
            <Button variant="ghost" onClick={paste} aria-label={t("urlBar.pasteAriaLabel")}>
              <ClipboardPaste />
            </Button>
            {batchButton}
            <Button type="submit" variant="primary" disabled={batchUrls.length === 0}>
              <ArrowDownToLine />
              {batchUrls.length > 1
                ? t("urlBar.downloadCount", { count: batchUrls.length })
                : t("urlBar.download")}
            </Button>
          </div>
        </div>
      ) : (
        <div className={cx(frame, "items-center")}>
          <Link2 className="size-5 shrink-0 text-muted" />
          <input
            // biome-ignore lint/a11y/noAutofocus: the URL field is the app's primary action
            autoFocus
            value={url}
            onChange={(e) => {
              onUrlChange(e.target.value);
              setError(null);
              setNotice(null);
            }}
            onPaste={onPasteSingle}
            placeholder={t("urlBar.placeholder")}
            aria-label={t("urlBar.ariaLabel")}
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted"
          />
          <Button variant="ghost" onClick={paste} aria-label={t("urlBar.pasteAriaLabel")}>
            <ClipboardPaste />
          </Button>
          {batchButton}
          <Button type="submit" variant="primary" disabled={!url.trim() || starting}>
            <ArrowDownToLine />
            {t("urlBar.download")}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="px-1 text-sm text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="px-1 text-sm text-muted">
          {notice}
        </p>
      )}
    </form>
  );
}
