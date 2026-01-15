/**
 * @file useAuthStore.ts
 * @purpose Authentication credentials storage for AI providers
 * @connects-to SecureStore, provider configuration
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import type { ProviderId } from "@/types/provider.types";

interface AuthState {
  openaiApiKey: string | null;
  openrouterApiKey: string | null;
  ollamaUrl: string | null;
}

interface AuthActions {
  setOpenAIApiKey: (key: string | null) => void;
  setOpenRouterApiKey: (key: string | null) => void;
  setOllamaUrl: (url: string | null) => void;
  clearAllCredentials: () => void;
}

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

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      openaiApiKey: null,
      openrouterApiKey: null,
      ollamaUrl: null,
      setOpenAIApiKey: (key) => set({ openaiApiKey: key }),
      setOpenRouterApiKey: (key) => set({ openrouterApiKey: key }),
      setOllamaUrl: (url) => set({ ollamaUrl: url }),
      clearAllCredentials: () =>
        set({
          openaiApiKey: null,
          openrouterApiKey: null,
          ollamaUrl: null,
        }),
    }),
    {
      name: "ai-auth-storage",
      storage: createJSONStorage(() => ({
        getItem: (name) =>
          secureStorage.getItem(name) as Promise<string | null>,
        setItem: (name, value) => secureStorage.setItem(name, value),
        removeItem: (name) => secureStorage.removeItem(name),
      })),
    },
  ),
);

export function getProviderAuth(provider: ProviderId): {
  apiKey?: string;
  url?: string;
} {
  const authStore = useAuthStore.getState();
  switch (provider) {
    case "openai":
      return { apiKey: authStore.openaiApiKey || undefined };
    case "openrouter":
      return { apiKey: authStore.openrouterApiKey || undefined };
    case "ollama":
      return { url: authStore.ollamaUrl || undefined };
    case "apple":
    default:
      return {};
  }
}

export function isProviderConfigured(provider: ProviderId): boolean {
  const authStore = useAuthStore.getState();
  switch (provider) {
    case "openai":
      return !!authStore.openaiApiKey;
    case "openrouter":
      return !!authStore.openrouterApiKey;
    case "ollama":
      return !!authStore.ollamaUrl;
    case "apple":
      return true;
    default:
      return false;
  }
}
