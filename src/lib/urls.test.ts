import { describe, expect, it } from "vitest";
import { parseUrls } from "./urls";

describe("parseUrls", () => {
  it("reads one link per line and skips blanks and duplicates", () => {
    const text = "https://youtu.be/a\n\n  https://youtu.be/b  \nhttps://youtu.be/a\n";
    expect(parseUrls(text)).toEqual(["https://youtu.be/a", "https://youtu.be/b"]);
  });

  it("finds links inside other text and trims trailing punctuation", () => {
    const text = "watch https://www.youtube.com/watch?v=x&t=1, and (https://vimeo.com/1).";
    expect(parseUrls(text)).toEqual([
      "https://www.youtube.com/watch?v=x&t=1",
      "https://vimeo.com/1",
    ]);
  });

  it("splits comma-joined links and keeps balanced parentheses", () => {
    expect(parseUrls("https://a.com/1,https://a.com/2")).toEqual([
      "https://a.com/1",
      "https://a.com/2",
    ]);
    expect(parseUrls("see https://en.wikipedia.org/wiki/Foo_(bar).")).toEqual([
      "https://en.wikipedia.org/wiki/Foo_(bar)",
    ]);
  });

  it("returns nothing for text without links", () => {
    expect(parseUrls("just words")).toEqual([]);
  });
});
