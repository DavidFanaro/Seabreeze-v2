/**
 * @file useAuthStore.ts
 * @purpose Authentication credentials storage for AI providers
 * @connects-to SecureStore, provider configuration
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProviderId } from "@/types/provider.types";
import { safeSecureStore } from "@/lib/safe-secure-store";
import {
  applyRuntimeWriteVersion,
  INITIAL_HYDRATION_META,
  markHydrationReady,
  resolveHydrationMerge,
  type HydrationMetaState,
} from "@/stores/hydration-registry";

interface AuthState {
  openaiApiKey: string | null;
  openrouterApiKey: string | null;
  ollamaUrl: string | null;
  __meta: HydrationMetaState;
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
      return await safeSecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await safeSecureStore.setItemAsync(name, value);
    } catch (error) {
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await safeSecureStore.deleteItemAsync(name);
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
      __meta: INITIAL_HYDRATION_META,
      setOpenAIApiKey: (key) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            openaiApiKey: key,
          }),
        ),
      setOpenRouterApiKey: (key) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            openrouterApiKey: key,
          }),
        ),
      setOllamaUrl: (url) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            ollamaUrl: url,
          }),
        ),
      clearAllCredentials: () =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            openaiApiKey: null,
            openrouterApiKey: null,
            ollamaUrl: null,
          }),
        ),
    }),
    {
      name: "ai-auth-storage",
      storage: createJSONStorage(() => ({
        getItem: (name) =>
          secureStorage.getItem(name) as Promise<string | null>,
        setItem: (name, value) => secureStorage.setItem(name, value),
        removeItem: (name) => secureStorage.removeItem(name),
      })),
      partialize: (state) => ({
        openaiApiKey: state.openaiApiKey,
        openrouterApiKey: state.openrouterApiKey,
        ollamaUrl: state.ollamaUrl,
        __meta: {
          writeVersion: state.__meta.writeVersion,
        },
      }),
      merge: (persistedState, currentState) =>
        resolveHydrationMerge(persistedState, currentState),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        state.__meta = markHydrationReady(state.__meta, "auth");
      },
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
