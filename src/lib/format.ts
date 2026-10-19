import { createTranslator, type TranslateFn, type TranslationKey } from "../i18n";

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "–";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatSpeed(bytesPerSecond: number | null | undefined): string {
  return bytesPerSecond == null ? "–" : `${formatBytes(bytesPerSecond)}/s`;
}

export function formatEta(seconds: number | null | undefined): string {
  if (seconds == null) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Translation keys for yt-dlp postprocessor names. */
const POSTPROCESSORS: Record<string, TranslationKey> = {
  Merger: "postprocessor.Merger",
  ExtractAudio: "postprocessor.ExtractAudio",
  EmbedThumbnail: "postprocessor.EmbedThumbnail",
  ThumbnailsConvertor: "postprocessor.ThumbnailsConvertor",
  EmbedSubtitle: "postprocessor.EmbedSubtitle",
  SubtitlesConvertor: "postprocessor.SubtitlesConvertor",
  Metadata: "postprocessor.Metadata",
  MoveFiles: "postprocessor.MoveFiles",
};

const defaultT = createTranslator("en");

export function postprocessorLabel(name: string, t: TranslateFn = defaultT): string {
  if (POSTPROCESSORS[name]) return t(POSTPROCESSORS[name]);
  if (name.startsWith("Fixup")) return t("postprocessor.Fixup");
  return t("postprocessor.other", { name });
}

/**
 * Quote one argument for a copy-pasteable command: POSIX shells on
 * macOS/Linux, PowerShell on Windows (cmd.exe can't safely hold yt-dlp's
 * `%(title)s` templates, so we don't target it).
 */
export function shellQuote(arg: string, shell: "posix" | "powershell" = "posix"): string {
  if (shell === "powershell") {
    // No `,` (array operator) or `@` (splatting) unquoted in PowerShell.
    return /^[\w+=:./\\-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", "''")}'`;
  }
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", `'"'"'`)}'`;
}
