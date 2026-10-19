import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DownloadRequest } from "../bindings/DownloadRequest";
import type { JobUpdate } from "../bindings/JobUpdate";
import { api } from "../lib/ipc";
import { useJobs } from "./jobs";
import { usePrefs } from "./prefs";
import { resetQueueForTests, startQueueRunner, useQueue } from "./queue";

vi.mock("../lib/ipc", () => ({
  api: { startDownload: vi.fn() },
  errorMessage: (e: unknown) => String(e),
}));

const startDownload = vi.mocked(api.startDownload);

const req = (url: string): DownloadRequest => ({
  url,
  outputDir: "/out",
  options: usePrefs.getState().options,
  engine: usePrefs.getState().engine,
});

const emit = (jobId: string, update: JobUpdate) => useJobs.getState().apply({ jobId, update });

/** Lets pending startDownload promises (and the pumps after them) settle. */
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("download queue", () => {
  let stop: () => void;
  let n: number;

  beforeEach(() => {
    n = 0;
    startDownload.mockReset();
    startDownload.mockImplementation(async () => {
      const id = `job-${++n}`;
      emit(id, { type: "started", url: "", argv: [], warnings: [] });
      return id;
    });
    useJobs.setState({ jobs: {}, order: [] });
    resetQueueForTests();
    usePrefs.setState({ concurrency: 2 });
    stop = startQueueRunner();
  });

  afterEach(() => stop());

  it("never runs more than the concurrency limit and refills slots", async () => {
    useQueue.getState().enqueue(["a", "b", "c", "d", "e"].map(req));
    await flush();
    expect(startDownload).toHaveBeenCalledTimes(2);
    expect(useQueue.getState().items).toHaveLength(3);

    emit("job-1", { type: "finished", status: "completed", error: null, files: 1 });
    await flush();
    expect(startDownload).toHaveBeenCalledTimes(3);
    expect(startDownload.mock.calls.map(([r]) => r.url)).toEqual(["a", "b", "c"]);
  });

  it("counts single downloads started outside the queue", async () => {
    emit("job-solo", { type: "started", url: "x", argv: [], warnings: [] });
    useQueue.getState().enqueue(["a", "b"].map(req));
    await flush();
    expect(startDownload).toHaveBeenCalledTimes(1);
  });

  it("pauses when the site starts blocking, and resumes on request", async () => {
    useQueue.getState().enqueue(["a", "b", "c", "d"].map(req));
    await flush();
    emit("job-1", {
      type: "finished",
      status: "failed",
      files: 0,
      error: { kind: "authRequired", message: "Sign in to confirm", hint: "Use cookies" },
    });
    await flush();
    expect(useQueue.getState().paused).toEqual({ message: "Use cookies", blocked: true });
    expect(startDownload).toHaveBeenCalledTimes(2);

    useQueue.getState().resume();
    await flush();
    expect(startDownload).toHaveBeenCalledTimes(3);
  });

  it("doesn't pause for an ordinary failure", async () => {
    useQueue.getState().enqueue(["a", "b", "c"].map(req));
    await flush();
    emit("job-1", {
      type: "finished",
      status: "failed",
      files: 0,
      error: { kind: "unavailable", message: "Video unavailable", hint: "" },
    });
    await flush();
    expect(useQueue.getState().paused).toBeNull();
    expect(startDownload).toHaveBeenCalledTimes(3);
  });

  it("puts the item back and pauses when a download can't start", async () => {
    startDownload.mockRejectedValueOnce("The output folder doesn't exist.");
    useQueue.getState().enqueue(["a", "b", "c"].map(req));
    await flush();
    const { items, paused } = useQueue.getState();
    expect(paused).toEqual({ message: "The output folder doesn't exist.", blocked: false });
    expect(items.map((i) => i.request.url)).toEqual(["a", "c"]);
  });

  it("keeps queue order when several starts fail, and resumes into a new folder", async () => {
    usePrefs.setState({ concurrency: 3 });
    startDownload.mockRejectedValueOnce("gone").mockRejectedValueOnce("gone");
    useQueue.getState().enqueue(["a", "b", "c", "d"].map(req));
    await flush();
    expect(useQueue.getState().items.map((i) => i.request.url)).toEqual(["a", "b", "d"]);

    usePrefs.getState().setOutputDir("/new");
    useQueue.getState().resume();
    await flush();
    expect(startDownload.mock.calls.at(-1)?.[0].outputDir).toBe("/new");
  });

  it("drops a failed start's item if the queue was cleared meanwhile", async () => {
    startDownload.mockRejectedValueOnce("gone");
    useQueue.getState().enqueue(["a"].map(req));
    useQueue.getState().clear();
    await flush();
    expect(useQueue.getState()).toMatchObject({ items: [], paused: null });
  });

  it("forgets the pause once the last waiting item is removed", () => {
    useQueue.getState().pause();
    useQueue.getState().enqueue(["a"].map(req));
    useQueue.getState().remove(useQueue.getState().items[0].id);
    expect(useQueue.getState().paused).toBeNull();
  });

  it("starts queued items with the current cookies", async () => {
    usePrefs.setState({ concurrency: 1 });
    useQueue.getState().enqueue(["a", "b"].map(req));
    await flush();
    usePrefs.getState().setOptions({ cookies: { type: "file", path: "/c.txt" } });
    emit("job-1", { type: "finished", status: "completed", error: null, files: 1 });
    await flush();
    expect(startDownload.mock.calls[1][0].options.cookies).toEqual({
      type: "file",
      path: "/c.txt",
    });
  });
});
