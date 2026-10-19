// Typed wrappers around the Rust commands in src-tauri/src/commands.rs.
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { BrowserInfo } from "../bindings/BrowserInfo";
import type { CommandPreview } from "../bindings/CommandPreview";
import type { CookieFileReport } from "../bindings/CookieFileReport";
import type { DownloadRequest } from "../bindings/DownloadRequest";
import type { EngineSettings } from "../bindings/EngineSettings";
import type { EngineStatus } from "../bindings/EngineStatus";
import type { JobEvent } from "../bindings/JobEvent";

/** Must match `jobs::EVENT` in Rust. */
export const JOB_EVENT = "ytdlp://job";

export const api = {
  engineStatus: (engine: EngineSettings) => invoke<EngineStatus>("engine_status", { engine }),
  previewCommand: (request: DownloadRequest) =>
    invoke<CommandPreview>("preview_command", { request }),
  startDownload: (request: DownloadRequest) => invoke<string>("start_download", { request }),
  cancelDownload: (jobId: string) => invoke<boolean>("cancel_download", { jobId }),
  detectBrowsers: () => invoke<BrowserInfo[]>("detect_browsers"),
  inspectCookieFile: (path: string) => invoke<CookieFileReport>("inspect_cookie_file", { path }),
  onJobEvent: (handler: (event: JobEvent) => void) =>
    listen<JobEvent>(JOB_EVENT, (e) => handler(e.payload)),
};

/** Commands reject with the Rust `AppError` message string. */
export function errorMessage(err: unknown): string {
  return typeof err === "string" ? err : err instanceof Error ? err.message : String(err);
}
