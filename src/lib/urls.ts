/**
 * Pulls http(s) links out of pasted text: one per line, space-separated, or
 * mixed with other words. Keeps first-seen order and drops duplicates.
 */
export function parseUrls(text: string): string[] {
  // A comma right before the next link separates them (CSV-style exports).
  const found = text.replace(/,(?=https?:\/\/)/gi, " ").match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  return [...new Set(found.map(trimTrailing))];
}

/** Trailing punctuation usually belongs to the sentence, not the link. */
function trimTrailing(url: string): string {
  let u = url.replace(/[,.;]+$/, "");
  // Keep a ")" the link opened itself, e.g. Wikipedia's Foo_(bar).
  while (u.endsWith(")") && count(u, "(") < count(u, ")"))
    u = u.slice(0, -1).replace(/[,.;]+$/, "");
  return u;
}

const count = (s: string, ch: string) => s.split(ch).length - 1;
