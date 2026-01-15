/**
 * @file useProviderStore.ts
 * @purpose Provider and model selection state management
 * @connects-to UI components, provider factory
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import type { ProviderId } from "@/types/provider.types";

interface ProviderState {
  selectedProvider: ProviderId;
  selectedModel: string;
  availableModels: Record<ProviderId, string[]>;
  customModels: Record<ProviderId, string[]>;
  hiddenModels: Record<ProviderId, string[]>;
}

interface ProviderActions {
  setSelectedProvider: (provider: ProviderId) => void;
  setSelectedModel: (model: string) => void;
  setAvailableModels: (provider: ProviderId, models: string[]) => void;
  addCustomModel: (provider: ProviderId, model: string) => void;
  editCustomModel: (provider: ProviderId, oldModel: string, newModel: string) => void;
  deleteCustomModel: (provider: ProviderId, model: string) => void;
  deleteModel: (provider: ProviderId, model: string) => void;
  setHiddenModels: (models: Record<ProviderId, string[]>) => void;
  resetToDefaults: () => void;
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

const DEFAULT_MODELS: Record<ProviderId, string[]> = {
  apple: ["system-default"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  openrouter: [
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "anthropic/claude-sonnet-4-20250514",
  ],
  ollama: ["llama3.2", "mistral", "codellama", "qwen2.5"],
};

const DEFAULT_CUSTOM_MODELS: Record<ProviderId, string[]> = {
  apple: [],
  openai: [],
  openrouter: [],
  ollama: [],
};

const DEFAULT_HIDDEN_MODELS: Record<ProviderId, string[]> = {
  apple: [],
  openai: [],
  openrouter: [],
  ollama: [],
};

export const useProviderStore = create<ProviderState & ProviderActions>()(
  persist(
    (set, get) => ({
      selectedProvider: "apple",
      selectedModel: "system-default",
      availableModels: DEFAULT_MODELS,
      customModels: DEFAULT_CUSTOM_MODELS,
      hiddenModels: DEFAULT_HIDDEN_MODELS,
      setSelectedProvider: (provider) =>
        set((state) => ({
          selectedProvider: provider,
          selectedModel: DEFAULT_MODELS[provider][0] || "",
        })),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setAvailableModels: (provider, models) =>
        set((state) => ({
          availableModels: {
            ...state.availableModels,
            [provider]: models,
          },
        })),
      addCustomModel: (provider, model) =>
        set((state) => {
          const existing = state.customModels[provider] || [];
          if (existing.includes(model)) return state;
          const hidden = state.hiddenModels[provider] || [];
          return {
            customModels: {
              ...state.customModels,
              [provider]: [...existing, model],
            },
            hiddenModels: {
              ...state.hiddenModels,
              [provider]: hidden.filter((m) => m !== model),
            },
          };
        }),
      editCustomModel: (provider, oldModel, newModel) =>
        set((state) => {
          const existing = state.customModels[provider] || [];
          const index = existing.indexOf(oldModel);
          if (index === -1) return state;
          const updated = [...existing];
          updated[index] = newModel;
          return {
            customModels: {
              ...state.customModels,
              [provider]: updated,
            },
            selectedModel:
              state.selectedModel === oldModel ? newModel : state.selectedModel,
          };
        }),
      deleteCustomModel: (provider, model) =>
        set((state) => {
          const existing = state.customModels[provider] || [];
          const customModelsFiltered = existing.filter((m) => m !== model);
          const allVisible = [
            ...DEFAULT_MODELS[provider].filter(
              (m) => !(state.hiddenModels[provider] || []).includes(m)
            ),
            ...customModelsFiltered,
          ];
          return {
            customModels: {
              ...state.customModels,
              [provider]: customModelsFiltered,
            },
            selectedModel:
              state.selectedModel === model
                ? allVisible[0] || ""
                : state.selectedModel,
          };
        }),
      deleteModel: (provider, model) =>
        set((state) => {
          const customModels = state.customModels[provider] || [];
          const hiddenModels = state.hiddenModels[provider] || [];
          const isCustom = customModels.includes(model);

          let newCustomModels = customModels;
          let newHiddenModels = hiddenModels;

          if (isCustom) {
            newCustomModels = customModels.filter((m) => m !== model);
          } else {
            if (!hiddenModels.includes(model)) {
              newHiddenModels = [...hiddenModels, model];
            }
          }

          const allVisible = [
            ...DEFAULT_MODELS[provider].filter((m) => !newHiddenModels.includes(m)),
            ...newCustomModels,
          ];

          return {
            customModels: {
              ...state.customModels,
              [provider]: newCustomModels,
            },
            hiddenModels: {
              ...state.hiddenModels,
              [provider]: newHiddenModels,
            },
            selectedModel:
              state.selectedModel === model
                ? allVisible[0] || ""
                : state.selectedModel,
          };
        }),
      resetToDefaults: () =>
        set({
          selectedProvider: "apple",
          selectedModel: "system-default",
          availableModels: DEFAULT_MODELS,
          customModels: DEFAULT_CUSTOM_MODELS,
          hiddenModels: DEFAULT_HIDDEN_MODELS,
        }),
      setHiddenModels: (models) =>
        set((state) => ({
          hiddenModels: models,
        })),
    }),
    {
      name: "ai-provider-storage",
      storage: createJSONStorage(() => ({
        getItem: (name) =>
          secureStorage.getItem(name) as Promise<string | null>,
        setItem: (name, value) => secureStorage.setItem(name, value),
        removeItem: (name) => secureStorage.removeItem(name),
      })),
    },
  ),
);

export function getDefaultModelForProvider(provider: ProviderId): string {
  return DEFAULT_MODELS[provider][0] || "";
}
