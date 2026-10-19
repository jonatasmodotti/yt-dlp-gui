// Batch downloads: links wait here until a download slot frees up.
import { create } from "zustand";
import type { DownloadRequest } from "../bindings/DownloadRequest";
import type { ErrorKind } from "../bindings/ErrorKind";
import { api, errorMessage } from "../lib/ipc";
import { withCurrentSession } from "../lib/request";
import { isActive, useJobs } from "./jobs";
import { usePrefs } from "./prefs";

export interface QueuedItem {
  id: string;
  /** Enqueue order, so items put back after a failed start keep their place. */
  seq: number;
  request: DownloadRequest;
}

export interface QueuePause {
  message: string;
  /** The site pushed back; more requests would likely fail the same way. */
  blocked: boolean;
}

interface QueueState {
  items: QueuedItem[];
  /** Set while the queue isn't starting new downloads. */
  paused: QueuePause | null;
  enqueue: (requests: DownloadRequest[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  pause: (pause?: QueuePause) => void;
  resume: () => void;
}

/**
 * Failures that mean the site is refusing us, not that one link is bad.
 * Subtitle 429s don't count: those are warnings (see builder/subtitles.rs).
 */
const BLOCKING = new Set<ErrorKind>(["authRequired", "rateLimited"]);

let nextSeq = 0;
/** Bumped by clear(); starts that fail after it don't put their item back. */
let generation = 0;
/** startDownload calls in flight; they hold a slot before their job exists. */
let starting = 0;
/** Jobs started from the queue, watched until they finish. */
const fromQueue = new Set<string>();

export const useQueue = create<QueueState>()((set) => ({
  items: [],
  paused: null,
  enqueue: (requests) =>
    set((s) => ({
      items: [
        ...s.items,
        ...requests.map((request) => {
          const seq = ++nextSeq;
          return { id: `queued-${seq}`, seq, request };
        }),
      ],
    })),
  remove: (id) =>
    set((s) => {
      const items = s.items.filter((i) => i.id !== id);
      // A pause with nothing left to hold back would stall the next batch.
      return { items, paused: items.length > 0 ? s.paused : null };
    }),
  clear: () => {
    generation++;
    set({ items: [], paused: null });
  },
  pause: (pause = { message: "Paused", blocked: false }) => set({ paused: pause }),
  resume: () => set({ paused: null }),
}));

/** Starts queued items while there are free slots. Safe to call any time. */
export function pump() {
  const { items, paused } = useQueue.getState();
  if (paused || items.length === 0) return;
  const { jobs, order } = useJobs.getState();
  // Single downloads count too, so the limit caps every yt-dlp process.
  const running = order.filter((id) => isActive(jobs[id])).length + starting;
  const free = usePrefs.getState().concurrency - running;
  if (free <= 0) return;
  const next = items.slice(0, free);
  // Reserve the slots before setState: subscribers re-enter pump synchronously.
  starting += next.length;
  useQueue.setState({ items: items.slice(next.length) });
  for (const item of next) void start(item);
}

async function start(item: QueuedItem) {
  const prefs = usePrefs.getState();
  // The folder too: "it doesn't exist" is the usual reason a start fails,
  // and picking another one then resuming must fix it.
  const request = { ...withCurrentSession(item.request, prefs), outputDir: prefs.outputDir };
  const gen = generation;
  try {
    const id = await api.startDownload(request);
    fromQueue.add(id);
    useJobs.getState().attach(id, request);
  } catch (err) {
    // e.g. the output folder is gone: every other item would fail the same way.
    if (gen === generation) {
      useQueue.setState((s) => ({
        items: [...s.items, item].sort((a, b) => a.seq - b.seq),
        paused: { message: errorMessage(err), blocked: false },
      }));
    }
  } finally {
    starting--;
    pump();
  }
}

/** Pauses the queue when a queued job shows the site is blocking us. */
function watchFinished() {
  const { jobs } = useJobs.getState();
  for (const id of fromQueue) {
    const job = jobs[id];
    if (!job) {
      fromQueue.delete(id); // removed from the list (e.g. retried)
    } else if (!isActive(job)) {
      fromQueue.delete(id);
      if (job.error && BLOCKING.has(job.error.kind) && useQueue.getState().items.length > 0) {
        useQueue.getState().pause({ message: job.error.hint, blocked: true });
      }
    }
  }
}

/** Wires the queue to job, queue and settings changes. Returns an unsubscribe. */
export function startQueueRunner(): () => void {
  const subs = [
    useJobs.subscribe(() => {
      watchFinished();
      pump();
    }),
    useQueue.subscribe(pump),
    usePrefs.subscribe((s, prev) => {
      if (s.concurrency !== prev.concurrency) pump();
    }),
  ];
  pump();
  return () => {
    for (const unsub of subs) unsub();
  };
}

/** Test helper: forget in-flight bookkeeping between tests. */
export function resetQueueForTests() {
  starting = 0;
  fromQueue.clear();
  useQueue.setState({ items: [], paused: null });
}
