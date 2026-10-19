import type { DownloadRequest } from "../bindings/DownloadRequest";
import type { usePrefs } from "../store/prefs";

type Prefs = Pick<ReturnType<typeof usePrefs.getState>, "outputDir" | "options" | "engine">;

export function buildRequest(url: string, prefs: Prefs): DownloadRequest {
  return {
    url: url.trim(),
    outputDir: prefs.outputDir,
    options: prefs.options,
    engine: prefs.engine,
  };
}

/**
 * Keeps a request's link and format but picks up the current cookies and
 * engine, so a retry (or a queued item) benefits from fixes made since.
 */
export function withCurrentSession(
  request: DownloadRequest,
  prefs: Pick<Prefs, "options" | "engine">,
): DownloadRequest {
  return {
    ...request,
    options: { ...request.options, cookies: prefs.options.cookies },
    engine: prefs.engine,
  };
}
