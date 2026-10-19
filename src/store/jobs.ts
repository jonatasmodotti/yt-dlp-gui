import { create } from "zustand";
import type { DownloadRequest } from "../bindings/DownloadRequest";
import type { JobError } from "../bindings/JobError";
import type { JobEvent } from "../bindings/JobEvent";
import type { JobStatus } from "../bindings/JobStatus";
import type { Progress } from "../bindings/Progress";

export type JobPhase = "running" | "processing" | JobStatus;

export interface Job {
  id: string;
  url: string;
  request?: DownloadRequest;
  title?: string;
  /** Item currently downloading (changes per playlist entry). */
  videoId?: string;
  phase: JobPhase;
  /** Cancel requested; the process tree may take a few seconds to stop. */
  cancelling?: boolean;
  progress?: Progress;
  /** Current postprocessor key while phase is "processing". */
  stage?: string;
  playlist?: { index: number; count: number | null };
  files: string[];
  warnings: string[];
  argv: string[];
  error?: JobError | null;
  log: string[];
}

const LOG_LIMIT = 300;

export function isActive(job: Job): boolean {
  return job.phase === "running" || job.phase === "processing";
}

function blank(id: string): Job {
  return {
    id,
    url: "",
    phase: "running",
    files: [],
    warnings: [],
    argv: [],
    log: [],
  };
}

/**
 * Pure reducer for backend events. Events can arrive before `startDownload`
 * resolves, so every branch upserts.
 */
export function reduceJob(job: Job | undefined, { jobId, update }: JobEvent): Job {
  const j = job ?? blank(jobId);
  switch (update.type) {
    case "started":
      return { ...j, url: update.url, argv: update.argv, warnings: update.warnings };
    case "meta":
      return {
        ...j,
        title: update.title,
        videoId: update.videoId,
        phase: "running",
        // A new playlist item restarts the bar; a repeat ("Download all") keeps it.
        progress: update.videoId === j.videoId ? j.progress : undefined,
        playlist:
          update.playlistIndex != null
            ? { index: update.playlistIndex, count: update.playlistCount }
            : j.playlist,
      };
    case "progress":
      return { ...j, phase: "running", stage: undefined, progress: update };
    case "postProcess":
      return update.status === "started" ? { ...j, phase: "processing", stage: update.name } : j;
    case "fileDone":
      return { ...j, files: [...j.files, update.path] };
    case "warning":
      return j.warnings.includes(update.message)
        ? j
        : { ...j, warnings: [...j.warnings, update.message] };
    case "log": {
      const log = j.log.length >= LOG_LIMIT ? j.log.slice(-LOG_LIMIT + 1) : j.log;
      return { ...j, log: [...log, update.line] };
    }
    case "finished":
      return {
        ...j,
        phase: update.status,
        stage: undefined,
        cancelling: false,
        error: update.error,
      };
  }
}

interface JobsState {
  jobs: Record<string, Job>;
  order: string[];
  apply: (event: JobEvent) => void;
  attach: (id: string, request: DownloadRequest) => void;
  markCancelling: (id: string, cancelling: boolean) => void;
  remove: (id: string) => void;
  clearFinished: () => void;
}

export const useJobs = create<JobsState>()((set) => ({
  jobs: {},
  order: [],
  apply: (event) =>
    set((s) => {
      const exists = event.jobId in s.jobs;
      return {
        jobs: { ...s.jobs, [event.jobId]: reduceJob(s.jobs[event.jobId], event) },
        order: exists ? s.order : [event.jobId, ...s.order],
      };
    }),
  attach: (id, request) =>
    set((s) => {
      const job = s.jobs[id] ?? { ...blank(id), url: request.url };
      return {
        jobs: { ...s.jobs, [id]: { ...job, request } },
        order: s.order.includes(id) ? s.order : [id, ...s.order],
      };
    }),
  markCancelling: (id, cancelling) =>
    set((s) => (s.jobs[id] ? { jobs: { ...s.jobs, [id]: { ...s.jobs[id], cancelling } } } : s)),
  remove: (id) =>
    set((s) => {
      const { [id]: _, ...jobs } = s.jobs;
      return { jobs, order: s.order.filter((o) => o !== id) };
    }),
  clearFinished: () =>
    set((s) => {
      const order = s.order.filter((id) => isActive(s.jobs[id]));
      return { order, jobs: Object.fromEntries(order.map((id) => [id, s.jobs[id]])) };
    }),
}));
