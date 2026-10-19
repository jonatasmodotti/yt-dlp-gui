// Runs before React. Keep in sync with PREFS_KEY and applyTheme in src/theme.ts.
(() => {
  let theme = "system";
  try {
    theme = JSON.parse(localStorage.getItem("ytdlp-gui:prefs") || "{}").state?.theme || "system";
  } catch {}
  const dark =
    theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
})();
