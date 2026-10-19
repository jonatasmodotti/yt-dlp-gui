export type Platform = "macos" | "windows" | "linux";

export const platform: Platform = navigator.userAgent.includes("Mac")
  ? "macos"
  : navigator.userAgent.includes("Windows")
    ? "windows"
    : "linux";
