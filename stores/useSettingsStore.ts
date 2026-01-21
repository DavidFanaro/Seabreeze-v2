/**
 * @file useSettingsStore.ts
 * @purpose Global app settings persistence
 * @connects-to SecureStore, ThemeProvider
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
    }
  },
};

interface SettingsState {
  theme: 'light' | 'dark' | 'nord' | 'catppuccin' | 'tokyo-night' | 'system';
  hapticEnabled: boolean;
  autoGenerateTitles: boolean;
  messageFontSize: number;
  showCodeLineNumbers: boolean;
}

interface SettingsActions {
  setTheme: (theme: 'light' | 'dark' | 'nord' | 'catppuccin' | 'tokyo-night' | 'system') => void;
  setHapticEnabled: (enabled: boolean) => void;
  setAutoGenerateTitles: (enabled: boolean) => void;
  setMessageFontSize: (size: number) => void;
  setShowCodeLineNumbers: (enabled: boolean) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: SettingsState = {
  theme: 'dark',
  hapticEnabled: true,
  autoGenerateTitles: true,
  messageFontSize: 16,
  showCodeLineNumbers: false,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
      setAutoGenerateTitles: (enabled) => set({ autoGenerateTitles: enabled }),
      setMessageFontSize: (size) => set({ messageFontSize: size }),
      setShowCodeLineNumbers: (enabled) => set({ showCodeLineNumbers: enabled }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => secureStorage.getItem(name) as Promise<string | null>,
        setItem: (name, value) => secureStorage.setItem(name, value),
        removeItem: (name) => secureStorage.removeItem(name),
      })),
    },
  ),
);
