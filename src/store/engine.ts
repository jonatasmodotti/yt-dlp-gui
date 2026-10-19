import { create } from "zustand";
import type { EngineSettings } from "../bindings/EngineSettings";
import type { EngineStatus } from "../bindings/EngineStatus";
import { api } from "../lib/ipc";

export type SettingsTab = "general" | "cookies" | "engine";

interface EngineState {
  status: EngineStatus | null;
  checking: boolean;
  settingsOpen: boolean;
  settingsTab: SettingsTab;
  refresh: (engine: EngineSettings) => Promise<void>;
  setSettingsOpen: (open: boolean) => void;
  openSettings: (tab?: SettingsTab) => void;
  setSettingsTab: (tab: SettingsTab) => void;
}

/** Only the latest probe may write state; older ones can finish later. */
let latest = 0;

export const useEngine = create<EngineState>()((set) => ({
  status: null,
  checking: false,
  settingsOpen: false,
  settingsTab: "general",
  refresh: async (engine) => {
    const seq = ++latest;
    set({ checking: true });
    try {
      const status = await api.engineStatus(engine);
      if (seq === latest) set({ status });
    } catch {
      // Leave the previous status; the banner keeps showing what we last knew.
    } finally {
      if (seq === latest) set({ checking: false });
    }
  },
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  // No tab keeps the last one the user looked at.
  openSettings: (tab) => set((s) => ({ settingsOpen: true, settingsTab: tab ?? s.settingsTab })),
  setSettingsTab: (settingsTab) => set({ settingsTab }),
}));
