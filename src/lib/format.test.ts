import { describe, expect, it } from "vitest";
import { resolveTheme } from "../theme";
import { formatBytes, formatEta, postprocessorLabel, shellQuote } from "./format";

describe("format", () => {
  it("formats bytes, speed and eta", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(null)).toBe("–");
    expect(formatEta(65)).toBe("1:05");
    expect(formatEta(3725)).toBe("1:02:05");
  });

  it("labels postprocessors", () => {
    expect(postprocessorLabel("Merger")).toBe("Merging video and audio");
    expect(postprocessorLabel("FixupM4a")).toBe("Fixing up container");
    expect(postprocessorLabel("Custom")).toBe("Post-processing (Custom)");
  });

  it("quotes shell arguments only when needed", () => {
    expect(shellQuote("--no-mtime")).toBe("--no-mtime");
    expect(shellQuote("%(title)s [%(id)s].%(ext)s")).toBe("'%(title)s [%(id)s].%(ext)s'");
    expect(shellQuote("it's")).toBe(`'it'"'"'s'`);
    expect(shellQuote("https://x/watch?v=1&list=2", "powershell")).toBe(
      "'https://x/watch?v=1&list=2'",
    );
    expect(shellQuote("it's", "powershell")).toBe("'it''s'");
    expect(shellQuote("en,pt-BR", "powershell")).toBe("'en,pt-BR'");
    expect(shellQuote(String.raw`C:\bin\yt-dlp.exe`, "powershell")).toBe(
      String.raw`C:\bin\yt-dlp.exe`,
    );
  });
});

describe("resolveTheme", () => {
  it("follows the system only when asked", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });
});
