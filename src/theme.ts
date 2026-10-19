import { useEffect } from "react";

export type ThemePreference = "light" | "dark" | "system";

/** localStorage key of the persisted prefs store (also read by public/theme-init.js). */
export const PREFS_KEY = "ytdlp-gui:prefs";

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function resolveTheme(pref: ThemePreference, systemDark: boolean): "light" | "dark" {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

export function applyTheme(pref: ThemePreference, animate = true) {
  const root = document.documentElement;
  const dark = resolveTheme(pref, darkQuery().matches) === "dark";
  if (animate) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 260);
  }
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

/** Applies the preference and follows OS changes while set to "system". */
export function useTheme(pref: ThemePreference) {
  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const query = darkQuery();
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [pref]);
}
