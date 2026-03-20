import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ThemeMode } from "@/components/ui/theme-config";
import { safeSecureStore } from "@/lib/safe-secure-store";
import type { ThinkingLevel } from "@/types/chat.types";
import {
  applyRuntimeWriteVersion,
  INITIAL_HYDRATION_META,
  markHydrationReady,
  resolveHydrationMerge,
  type HydrationMetaState,
} from "@/stores/hydration-registry";

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await safeSecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await safeSecureStore.setItemAsync(name, value);
    } catch {
      return;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await safeSecureStore.deleteItemAsync(name);
    } catch {
      return;
    }
  },
};

interface SettingsState {
  theme: ThemeMode;
  thinkingEnabled: boolean;
  thinkingLevel: ThinkingLevel;
  __meta: HydrationMetaState;
}

interface SettingsActions {
  setTheme: (theme: ThemeMode) => void;
  setThinkingEnabled: (enabled: boolean) => void;
  setThinkingLevel: (level: ThinkingLevel) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: Omit<SettingsState, "__meta"> = {
  theme: "dark",
  thinkingEnabled: true,
  thinkingLevel: "medium",
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      __meta: INITIAL_HYDRATION_META,
      setTheme: (theme) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            theme,
          }),
        ),
      setThinkingEnabled: (thinkingEnabled) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            thinkingEnabled,
          }),
        ),
      setThinkingLevel: (thinkingLevel) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            thinkingLevel,
          }),
        ),
      resetSettings: () =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            ...DEFAULT_SETTINGS,
          }),
        ),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => ({
        getItem: (name) => secureStorage.getItem(name) as Promise<string | null>,
        setItem: (name, value) => secureStorage.setItem(name, value),
        removeItem: (name) => secureStorage.removeItem(name),
      })),
      partialize: (state) => ({
        theme: state.theme,
        thinkingEnabled: state.thinkingEnabled,
        thinkingLevel: state.thinkingLevel,
        __meta: {
          writeVersion: state.__meta.writeVersion,
        },
      }),
      merge: (persistedState, currentState) => resolveHydrationMerge(persistedState, currentState),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        state.__meta = markHydrationReady(state.__meta, "settings");
      },
    },
  ),
);
