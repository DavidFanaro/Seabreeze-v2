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
  openaiCodexAccessToken: string | null;
  openaiCodexRefreshToken: string | null;
  openaiCodexExpiresAt: number | null;
  openaiCodexAccountId: string | null;
  openaiCodexEmail: string | null;
  openaiCodexPlanType: string | null;
  openrouterApiKey: string | null;
  opencodeApiKey: string | null;
  ollamaUrl: string | null;
  searxngUrl: string | null;
  __meta: HydrationMetaState;
}

interface AuthActions {
  setOpenAIApiKey: (key: string | null) => void;
  setOpenAICodexCredentials: (credentials: OpenAICodexCredentials | null) => void;
  setOpenRouterApiKey: (key: string | null) => void;
  setOpencodeApiKey: (key: string | null) => void;
  setOllamaUrl: (url: string | null) => void;
  setSearxngUrl: (url: string | null) => void;
  clearAllCredentials: () => void;
}

export interface OpenAICodexCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId?: string | null;
  email?: string | null;
  planType?: string | null;
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
      openaiCodexAccessToken: null,
      openaiCodexRefreshToken: null,
      openaiCodexExpiresAt: null,
      openaiCodexAccountId: null,
      openaiCodexEmail: null,
      openaiCodexPlanType: null,
      openrouterApiKey: null,
      opencodeApiKey: null,
      ollamaUrl: null,
      searxngUrl: null,
      __meta: INITIAL_HYDRATION_META,
      setOpenAIApiKey: (key) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            openaiApiKey: key,
          }),
        ),
      setOpenAICodexCredentials: (credentials) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            openaiCodexAccessToken: credentials?.accessToken ?? null,
            openaiCodexRefreshToken: credentials?.refreshToken ?? null,
            openaiCodexExpiresAt: credentials?.expiresAt ?? null,
            openaiCodexAccountId: credentials?.accountId ?? null,
            openaiCodexEmail: credentials?.email ?? null,
            openaiCodexPlanType: credentials?.planType ?? null,
          }),
        ),
      setOpenRouterApiKey: (key) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            openrouterApiKey: key,
          }),
        ),
      setOpencodeApiKey: (key) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            opencodeApiKey: key,
          }),
        ),
      setOllamaUrl: (url) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            ollamaUrl: url,
          }),
        ),
      setSearxngUrl: (url) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            searxngUrl: url,
          }),
        ),
      clearAllCredentials: () =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            openaiApiKey: null,
            openaiCodexAccessToken: null,
            openaiCodexRefreshToken: null,
            openaiCodexExpiresAt: null,
            openaiCodexAccountId: null,
            openaiCodexEmail: null,
            openaiCodexPlanType: null,
            openrouterApiKey: null,
            opencodeApiKey: null,
            ollamaUrl: null,
            searxngUrl: null,
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
        openaiCodexAccessToken: state.openaiCodexAccessToken,
        openaiCodexRefreshToken: state.openaiCodexRefreshToken,
        openaiCodexExpiresAt: state.openaiCodexExpiresAt,
        openaiCodexAccountId: state.openaiCodexAccountId,
        openaiCodexEmail: state.openaiCodexEmail,
        openaiCodexPlanType: state.openaiCodexPlanType,
        openrouterApiKey: state.openrouterApiKey,
        opencodeApiKey: state.opencodeApiKey,
        ollamaUrl: state.ollamaUrl,
        searxngUrl: state.searxngUrl,
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
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
  email?: string;
  planType?: string;
  url?: string;
} {
  const authStore = useAuthStore.getState();
  switch (provider) {
    case "openai":
      return { apiKey: authStore.openaiApiKey || undefined };
    case "openai-codex":
      return {
        accessToken: authStore.openaiCodexAccessToken || undefined,
        refreshToken: authStore.openaiCodexRefreshToken || undefined,
        expiresAt: authStore.openaiCodexExpiresAt || undefined,
        accountId: authStore.openaiCodexAccountId || undefined,
        email: authStore.openaiCodexEmail || undefined,
        planType: authStore.openaiCodexPlanType || undefined,
      };
    case "openrouter":
      return { apiKey: authStore.openrouterApiKey || undefined };
    case "opencode":
      return { apiKey: authStore.opencodeApiKey || undefined };
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
    case "openai-codex":
      return !!authStore.openaiCodexAccessToken && !!authStore.openaiCodexRefreshToken;
    case "openrouter":
      return !!authStore.openrouterApiKey;
    case "opencode":
      return !!authStore.opencodeApiKey;
    case "ollama":
      return !!authStore.ollamaUrl;
    case "apple":
      return true;
    default:
      return false;
  }
}

export function getSearxngConfig(): {
  url?: string;
} {
  const authStore = useAuthStore.getState();
  return {
    url: authStore.searxngUrl || undefined,
  };
}
