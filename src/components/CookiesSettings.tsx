import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CircleAlert, CircleCheck, Cookie, ExternalLink, FileText, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import type { Browser } from "../bindings/Browser";
import type { BrowserInfo } from "../bindings/BrowserInfo";
import type { CookieFileReport } from "../bindings/CookieFileReport";
import type { CookieSource } from "../bindings/CookieSource";
import type { Reliability } from "../bindings/Reliability";
import { type TranslationKey, useI18n } from "../i18n";
import { api } from "../lib/ipc";
import { useEngine } from "../store/engine";
import { usePrefs } from "../store/prefs";
import { Button, Card, cx, Field, inputClass, Segmented, Select } from "./ui";

const COOKIES_HELP_URL =
  "https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp";

const RELIABILITY: Record<Reliability, { labelKey: TranslationKey; className: string }> = {
  good: { labelKey: "cookies.reliabilityGood", className: "bg-ok/15 text-ok" },
  limited: { labelKey: "cookies.reliabilityLimited", className: "bg-warn/15 text-warn" },
  poor: { labelKey: "cookies.reliabilityPoor", className: "bg-danger/15 text-danger" },
};

// Detected once per app run: the panel remounts whenever its tab opens, and a
// click on "From browser" before detection finishes would pick a wrong default.
let detected: Promise<BrowserInfo[]> | null = null;
const detectBrowsers = () => {
  detected ??= api.detectBrowsers().catch(() => []);
  return detected;
};

/** Full cookie configuration; lives in Settings → Cookies. */
export function CookiesSettings() {
  const cookies = usePrefs((s) => s.options.cookies);
  const setOptions = usePrefs((s) => s.setOptions);
  const setCookies = (c: CookieSource) => setOptions({ cookies: c });
  const [browsers, setBrowsers] = useState<BrowserInfo[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    detectBrowsers().then(setBrowsers);
  }, []);

  function switchTo(type: CookieSource["type"]) {
    if (type === cookies.type) return;
    if (type === "none") setCookies({ type: "none" });
    if (type === "file") setCookies({ type: "file", path: "" });
    if (type === "browser") {
      // Default to the most reliable browser that's actually installed.
      const best =
        browsers.find((b) => b.installed && b.reliability === "good") ??
        browsers.find((b) => b.installed) ??
        browsers[0];
      setCookies({ type: "browser", browser: best?.browser ?? "firefox", profile: null });
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted">{t("cookies.settingsDescription")}</p>
      <Segmented
        label={t("cookies.source")}
        value={cookies.type}
        onChange={switchTo}
        options={[
          { value: "none", label: t("cookies.none") },
          { value: "browser", label: t("cookies.fromBrowser"), icon: <Globe /> },
          { value: "file", label: t("cookies.file"), icon: <FileText /> },
        ]}
      />

      {cookies.type === "browser" && (
        <BrowserPicker
          browsers={browsers}
          browser={cookies.browser}
          profile={cookies.profile}
          onChange={(browser, profile) => setCookies({ type: "browser", browser, profile })}
        />
      )}
      {cookies.type === "file" && (
        <CookieFilePicker
          path={cookies.path}
          onChange={(path) => setCookies({ type: "file", path })}
        />
      )}

      <div className="mt-3 border-t border-line pt-3">
        <Button variant="ghost" onClick={() => openUrl(COOKIES_HELP_URL)}>
          <FileText /> {t("cookies.howToExport")}
        </Button>
      </div>
    </div>
  );
}

/** One-line summary on the main screen; the controls are in Settings. */
export function CookiesStatus({ url }: { url: string }) {
  const cookies = usePrefs((s) => s.options.cookies);
  const openSettings = useEngine((s) => s.openSettings);
  const { t } = useI18n();
  const summary =
    cookies.type === "none"
      ? t("cookies.summaryOff")
      : cookies.type === "browser"
        ? `${t("cookies.summaryBrowser", { browser: BROWSER_LABELS[cookies.browser] })}${cookies.profile ? ` (${cookies.profile})` : ""}`
        : t("cookies.summaryFile", {
            file: cookies.path.split(/[\\/]/).pop() || t("cookies.noFileSelected"),
          });

  return (
    <Card title={t("cookies.title")} icon={<Cookie />}>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cx(
            "size-2 shrink-0 rounded-full",
            cookies.type === "none" ? "bg-line" : "bg-ok",
          )}
        />
        <p className="min-w-0 flex-1 truncate text-sm" title={summary}>
          {summary}
        </p>
        <Button onClick={() => openSettings("cookies")}>{t("cookies.configure")}</Button>
      </div>
      <Button
        variant="ghost"
        className="mt-2 -ml-2 py-1 text-xs"
        disabled={!/^https?:\/\//i.test(url.trim())}
        onClick={() => openUrl(url.trim())}
        title={t("cookies.openInBrowserTitle")}
      >
        <ExternalLink /> {t("cookies.openInBrowser")}
      </Button>
    </Card>
  );
}

const BROWSER_LABELS: Record<Browser, string> = {
  firefox: "Firefox",
  chrome: "Chrome",
  brave: "Brave",
  edge: "Edge",
  chromium: "Chromium",
  opera: "Opera",
  vivaldi: "Vivaldi",
  safari: "Safari",
};

function BrowserPicker({
  browsers,
  browser,
  profile,
  onChange,
}: {
  browsers: BrowserInfo[];
  browser: Browser;
  profile: string | null;
  onChange: (browser: Browser, profile: string | null) => void;
}) {
  const { t, tr } = useI18n();
  const info = browsers.find((b) => b.browser === browser);
  const sorted = [...browsers].sort((a, b) => Number(b.installed) - Number(a.installed));

  return (
    <div className="mt-3 space-y-2">
      <Field label={t("cookies.browser")}>
        <Select
          aria-label={t("cookies.browser")}
          value={browser}
          onChange={(e) => onChange(e.target.value as Browser, profile)}
        >
          {sorted.map((b) => (
            <option key={b.browser} value={b.browser}>
              {b.label}
              {b.installed ? "" : t("cookies.notDetected")}
            </option>
          ))}
        </Select>
      </Field>
      {info && (
        <div className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs">
          <span
            className={cx(
              "shrink-0 rounded px-1.5 py-0.5 font-medium",
              RELIABILITY[info.reliability].className,
            )}
          >
            {t(RELIABILITY[info.reliability].labelKey)}
          </span>
          <span className="text-muted">{tr(info.note)}</span>
        </div>
      )}
      <Field label={t("cookies.profile")}>
        <input
          className={`${inputClass} max-w-48 py-1.5 text-xs`}
          value={profile ?? ""}
          placeholder={t("cookies.profilePlaceholder")}
          aria-label={t("cookies.profileAriaLabel")}
          title={t("cookies.profileTitle")}
          onChange={(e) => onChange(browser, e.target.value || null)}
        />
      </Field>
    </div>
  );
}

function CookieFilePicker({ path, onChange }: { path: string; onChange: (path: string) => void }) {
  const [report, setReport] = useState<CookieFileReport | null>(null);
  const { t, tr } = useI18n();

  useEffect(() => {
    if (!path) {
      setReport(null);
      return;
    }
    api.inspectCookieFile(path).then(setReport, () => setReport(null));
  }, [path]);

  async function choose() {
    const picked = await open({
      title: t("cookies.chooseDialogTitle"),
      filters: [{ name: t("cookies.filterNetscape"), extensions: ["txt"] }],
    });
    if (typeof picked === "string") onChange(picked);
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs"
          title={path}
        >
          {path || t("cookies.noFileSelectedCap")}
        </code>
        <Button onClick={choose}>{t("cookies.choose")}</Button>
      </div>
      {report && (
        <div
          className={cx(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
            report.valid ? "bg-ok/10" : "bg-danger/10",
          )}
        >
          {report.valid ? (
            <CircleCheck className="size-4 shrink-0 text-ok" />
          ) : (
            <CircleAlert className="size-4 shrink-0 text-danger" />
          )}
          <div className="min-w-0">
            {report.valid ? (
              <p>
                {t("cookies.reportCount", { count: report.cookieCount })}
                {report.expiredCount > 0 &&
                  t("cookies.reportExpired", { count: report.expiredCount })}
                {report.domains.length > 0 &&
                  t("cookies.reportDomains", { domains: report.domains.join(", ") })}
              </p>
            ) : null}
            {report.message && (
              <p className={report.valid ? "text-muted" : "text-danger"}>{tr(report.message)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
