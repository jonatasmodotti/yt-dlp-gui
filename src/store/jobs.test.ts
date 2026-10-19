import { beforeEach, describe, expect, it } from "vitest";
import type { JobEvent } from "../bindings/JobEvent";
import type { JobUpdate } from "../bindings/JobUpdate";
import { reduceJob, useJobs } from "./jobs";

const ev = (update: JobUpdate, jobId = "job-1"): JobEvent => ({ jobId, update });

describe("reduceJob", () => {
  it("creates a job from the first event, whatever it is", () => {
    const job = reduceJob(undefined, ev({ type: "log", stream: "stdout", line: "[info] hi" }));
    expect(job).toMatchObject({ id: "job-1", phase: "running", log: ["[info] hi"] });
  });

  it("walks through a typical lifecycle", () => {
    const events: JobUpdate[] = [
      { type: "started", url: "https://x", argv: ["yt-dlp"], warnings: [] },
      {
        type: "meta",
        videoId: "a",
        title: "Clip",
        playlistIndex: 2,
        playlistCount: 5,
        expectedBytes: 100,
      },
      { type: "progress", percent: 40, downloadedBytes: 40, totalBytes: 100, speed: 10, eta: 6 },
      { type: "postProcess", name: "Merger", status: "started" },
      { type: "fileDone", path: "/out/Clip.mp4" },
      { type: "finished", status: "completed", error: null, files: 1 },
    ];
    const job = events.reduce<ReturnType<typeof reduceJob> | undefined>(
      (j, u) => reduceJob(j, ev(u)),
      undefined,
    );
    expect(job).toMatchObject({
      url: "https://x",
      title: "Clip",
      playlist: { index: 2, count: 5 },
      phase: "completed",
      stage: undefined,
      files: ["/out/Clip.mp4"],
    });
  });

  it("enters processing on postprocess start and leaves it on new progress", () => {
    let job = reduceJob(undefined, ev({ type: "postProcess", name: "Merger", status: "started" }));
    expect(job.phase).toBe("processing");
    job = reduceJob(job, ev({ type: "postProcess", name: "Merger", status: "finished" }));
    expect(job.phase).toBe("processing");
    job = reduceJob(
      job,
      ev({
        type: "progress",
        percent: 1,
        downloadedBytes: 1,
        totalBytes: 100,
        speed: null,
        eta: null,
      }),
    );
    expect(job).toMatchObject({ phase: "running", stage: undefined });
  });

  it("keeps progress for a repeated item and clears it for a new one", () => {
    const meta = (videoId: string): JobUpdate => ({
      type: "meta",
      videoId,
      title: "T",
      playlistIndex: null,
      playlistCount: null,
      expectedBytes: null,
    });
    const progress: JobUpdate = {
      type: "progress",
      percent: 80,
      downloadedBytes: 8,
      totalBytes: 10,
      speed: null,
      eta: null,
    };
    let job = reduceJob(undefined, ev(meta("a")));
    job = reduceJob(job, ev(progress));
    expect(reduceJob(job, ev(meta("a"))).progress?.percent).toBe(80);
    expect(reduceJob(job, ev(meta("b"))).progress).toBeUndefined();
  });

  it("caps the log", () => {
    let job = reduceJob(undefined, ev({ type: "log", stream: "stderr", line: "0" }));
    for (let i = 1; i < 500; i++)
      job = reduceJob(job, ev({ type: "log", stream: "stderr", line: String(i) }));
    expect(job.log).toHaveLength(300);
    expect(job.log.at(-1)).toBe("499");
  });
});

describe("useJobs", () => {
  beforeEach(() => useJobs.setState({ jobs: {}, order: [] }));

  it("orders newest first and clears only finished jobs", () => {
    const { apply } = useJobs.getState();
    apply(ev({ type: "log", stream: "stdout", line: "a" }, "job-1"));
    apply(ev({ type: "log", stream: "stdout", line: "b" }, "job-2"));
    apply(ev({ type: "finished", status: "failed", error: null, files: 0 }, "job-1"));
    expect(useJobs.getState().order).toEqual(["job-2", "job-1"]);
    useJobs.getState().clearFinished();
    expect(useJobs.getState().order).toEqual(["job-2"]);
  });
});
