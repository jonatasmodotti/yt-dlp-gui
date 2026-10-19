import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  CircleAlert,
  CircleCheck,
  CircleSlash,
  Clock,
  FolderOpen,
  ListVideo,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  ScrollText,
  ShieldAlert,
  X,
} from "lucide-react";
import { useState } from "react";
import { type TranslateFn, useI18n } from "../i18n";
import { formatBytes, formatEta, formatSpeed, postprocessorLabel, shellQuote } from "../lib/format";
import { api, errorMessage } from "../lib/ipc";
import { withCurrentSession } from "../lib/request";
import { useEngine } from "../store/engine";
import { isActive, type Job, useJobs } from "../store/jobs";
import { usePrefs } from "../store/prefs";
import { type QueuedItem, useQueue } from "../store/queue";
import { Button, Card, cx } from "./ui";

export function JobList() {
  const order = useJobs((s) => s.order);
  const jobs = useJobs((s) => s.jobs);
  const clearFinished = useJobs((s) => s.clearFinished);
  const queued = useQueue((s) => s.items);
  const paused = useQueue((s) => s.paused);
  const { pause, resume, clear } = useQueue.getState();
  const { t } = useI18n();
  const hasFinished = order.some((id) => !isActive(jobs[id]));

  return (
    <Card
      title={t("jobs.title")}
      icon={<ListVideo />}
      action={
        <div className="flex gap-1">
          {queued.length > 0 &&
            (paused ? (
              <Button variant="ghost" className="py-1 text-xs" onClick={resume}>
                <Play /> {t("jobs.resumeQueue")}
              </Button>
            ) : (
              <Button variant="ghost" className="py-1 text-xs" onClick={() => pause()}>
                <Pause /> {t("jobs.pauseQueue")}
              </Button>
            ))}
          {queued.length > 0 && (
            <Button variant="ghost" className="py-1 text-xs" onClick={clear}>
              {t("jobs.clearQueue")}
            </Button>
          )}
          {hasFinished && (
            <Button variant="ghost" className="py-1 text-xs" onClick={clearFinished}>
              {t("jobs.clearFinished")}
            </Button>
          )}
        </div>
      }
    >
      {paused && queued.length > 0 && <QueueBanner pause={paused} waiting={queued.length} />}
      {order.length === 0 && queued.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t("jobs.empty")}</p>
      ) : (
        <ul className="space-y-2">
          <QueuedList items={queued} />
          {order.map((id) => (
            <JobCard key={id} job={jobs[id]} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function QueueBanner({
  pause,
  waiting,
}: {
  pause: NonNullable<ReturnType<typeof useQueue.getState>["paused"]>;
  waiting: number;
}) {
  const openSettings = useEngine((s) => s.openSettings);
  const resume = useQueue((s) => s.resume);
  const { t, tr } = useI18n();
  const rest = waiting === 1 ? t("jobs.waitingOne") : t("jobs.waitingOther", { count: waiting });
  return (
    <div
      role="alert"
      className={cx(
        "mb-3 flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
        pause.blocked ? "border-warn/40 bg-warn/10" : "border-line bg-surface-2",
      )}
    >
      {pause.blocked ? (
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
      ) : (
        <Pause className="mt-0.5 size-4 shrink-0 text-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {pause.blocked
            ? t("jobs.queuePausedBlocked", { waiting: rest })
            : t("jobs.queuePaused", { waiting: rest })}
        </p>
        {pause.message !== "Paused" && (
          <p className="mt-0.5 text-xs text-muted">{tr(pause.message)}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        {pause.blocked && (
          <Button className="py-1 text-xs" onClick={() => openSettings("cookies")}>
            {t("jobs.setUpCookies")}
          </Button>
        )}
        <Button variant="ghost" className="py-1 text-xs" onClick={resume}>
          <Play /> {t("jobs.resume")}
        </Button>
      </div>
    </div>
  );
}

const QUEUE_PREVIEW = 5;

function QueuedList({ items }: { items: QueuedItem[] }) {
  const remove = useQueue((s) => s.remove);
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, QUEUE_PREVIEW);
  const hidden = items.length - shown.length;
  return (
    <>
      {shown.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-2"
        >
          <Clock className="size-4 shrink-0 text-muted" />
          <p className="min-w-0 flex-1 truncate text-sm text-muted" title={item.request.url}>
            {item.request.url}
          </p>
          <span className="shrink-0 text-xs text-muted">{t("jobs.queued")}</span>
          <Button
            variant="ghost"
            className="py-1"
            aria-label={t("jobs.removeFromQueue")}
            onClick={() => remove(item.id)}
          >
            <X />
          </Button>
        </li>
      ))}
      {hidden > 0 && (
        <li>
          <button
            type="button"
            className="w-full py-1 text-center text-xs text-accent hover:underline"
            onClick={() => setExpanded(true)}
          >
            {t("jobs.moreQueued", { count: hidden })}
          </button>
        </li>
      )}
    </>
  );
}

function statusLine(job: Job, t: TranslateFn): string {
  if (job.cancelling && isActive(job)) return t("jobs.cancelling");
  switch (job.phase) {
    case "running": {
      const p = job.progress;
      if (!p) return t("jobs.starting");
      const parts = [formatSpeed(p.speed), t("jobs.eta", { eta: formatEta(p.eta) })];
      if (p.totalBytes)
        parts.unshift(
          t("jobs.bytesOf", {
            downloaded: formatBytes(p.downloadedBytes),
            total: formatBytes(p.totalBytes),
          }),
        );
      return parts.join(" · ");
    }
    case "processing":
      return job.stage ? `${postprocessorLabel(job.stage, t)}…` : t("jobs.postProcessing");
    case "completed":
      return job.files.length > 1
        ? t("jobs.doneFiles", { count: job.files.length })
        : t("jobs.done");
    case "partial":
      return t("jobs.partial", { count: job.files.length });
    case "failed":
      return t("jobs.failed");
    case "cancelled":
      return t("jobs.cancelled");
  }
}

const RETRYABLE = new Set<Job["phase"]>(["failed", "partial", "cancelled"]);

function JobCard({ job }: { job: Job }) {
  const [showLog, setShowLog] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const markCancelling = useJobs((s) => s.markCancelling);
  const attach = useJobs((s) => s.attach);
  const remove = useJobs((s) => s.remove);
  const { t, tr } = useI18n();
  const active = isActive(job);
  const percent = job.phase === "completed" ? 100 : (job.progress?.percent ?? null);
  const lastFile = job.files.at(-1);

  async function cancel() {
    markCancelling(job.id, true);
    try {
      // false: the job already ended; its "finished" event clears the flag.
      await api.cancelDownload(job.id);
    } catch (e) {
      markCancelling(job.id, false);
      setRetryError(tr(errorMessage(e)));
    }
  }

  async function retry() {
    if (!job.request || retrying) return;
    setRetrying(true);
    // Keep the original link and format, but pick up any cookie/engine fixes.
    const request = withCurrentSession(job.request, usePrefs.getState());
    try {
      const id = await api.startDownload(request);
      attach(id, request);
      remove(job.id);
    } catch (e) {
      setRetryError(tr(errorMessage(e)));
      setRetrying(false);
    }
  }

  return (
    <li className="rounded-lg border border-line bg-surface-2/50 p-3">
      <div className="flex items-start gap-3">
        <StatusIcon job={job} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={job.title ?? job.url}>
            {job.title ?? job.url}
          </p>
          <p className="truncate text-xs text-muted">
            {job.playlist && (
              <span className="mr-1.5 rounded bg-surface px-1 py-px">
                {job.playlist.index}
                {job.playlist.count ? ` / ${job.playlist.count}` : ""}
              </span>
            )}
            {statusLine(job, t)}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {active && (
            <Button
              variant="ghost"
              aria-label={t("jobs.cancelDownload")}
              disabled={job.cancelling}
              onClick={cancel}
            >
              <X />
            </Button>
          )}
          {!active && lastFile && (
            <Button
              variant="ghost"
              aria-label={t("jobs.showInFolder")}
              onClick={() => revealItemInDir(lastFile)}
            >
              <FolderOpen />
            </Button>
          )}
          {RETRYABLE.has(job.phase) && job.request && (
            <Button
              variant="ghost"
              aria-label={t("jobs.retry")}
              disabled={retrying}
              onClick={retry}
            >
              <RotateCcw />
            </Button>
          )}
          <Button
            variant="ghost"
            aria-label={showLog ? t("jobs.hideLog") : t("jobs.showLog")}
            aria-pressed={showLog}
            onClick={() => setShowLog(!showLog)}
          >
            <ScrollText />
          </Button>
        </div>
      </div>

      {active && (
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
        >
          <div
            className={cx(
              "h-full rounded-full bg-accent transition-[width] duration-200",
              (percent == null || job.phase === "processing") && "w-1/3 animate-pulse",
            )}
            style={
              percent != null && job.phase !== "processing" ? { width: `${percent}%` } : undefined
            }
          />
        </div>
      )}

      {job.error && (
        <div className="mt-2.5 rounded-md bg-danger/10 px-3 py-2 text-xs">
          <p className="font-medium text-danger">{tr(job.error.hint)}</p>
          <p className="selectable mt-0.5 break-words text-muted">{job.error.message}</p>
        </div>
      )}
      {retryError && <p className="mt-2 text-xs text-danger">{retryError}</p>}
      {job.warnings.length > 0 && !job.error && job.phase !== "cancelled" && (
        <p className="mt-2 text-xs text-warn">{job.warnings.map(tr).join(" ")}</p>
      )}
      {showLog && (
        <pre className="mt-2.5 max-h-48 overflow-auto rounded-md bg-surface p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-muted">
          {[job.argv.length ? `$ ${job.argv.map((a) => shellQuote(a)).join(" ")}` : "", ...job.log]
            .filter(Boolean)
            .join("\n") || t("jobs.noOutputYet")}
        </pre>
      )}
    </li>
  );
}

function StatusIcon({ job }: { job: Job }) {
  const base = "mt-0.5 size-5 shrink-0";
  switch (job.phase) {
    case "running":
    case "processing":
      return <LoaderCircle className={cx(base, "animate-spin text-accent")} />;
    case "completed":
      return <CircleCheck className={cx(base, "text-ok")} />;
    case "partial":
      return <CircleAlert className={cx(base, "text-warn")} />;
    case "failed":
      return <CircleAlert className={cx(base, "text-danger")} />;
    case "cancelled":
      return <CircleSlash className={cx(base, "text-muted")} />;
  }
}
