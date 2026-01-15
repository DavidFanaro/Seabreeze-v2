import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { ProviderId, PROVIDERS } from "@/lib/types/provider-types";

interface AIAuthState {
  openaiApiKey: string | null;
  openrouterApiKey: string | null;
  ollamaUrl: string | null;
}

interface AIAuthActions {
  setOpenAIApiKey: (key: string | null) => void;
  setOpenRouterApiKey: (key: string | null) => void;
  setOllamaUrl: (url: string | null) => void;
  clearAllCredentials: () => void;
}

interface AIProviderState {
  selectedProvider: ProviderId;
  selectedModel: string;
  availableModels: Record<ProviderId, string[]>;
  customModels: Record<ProviderId, string[]>;
  hiddenModels: Record<ProviderId, string[]>;
}

interface AIProviderActions {
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
      console.error("Error saving to SecureStore:", error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.error("Error deleting from SecureStore:", error);
    }
  },
};

export const useAIAuthStore = create<AIAuthState & AIAuthActions>()(
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

export const useAIProviderStore = create<AIProviderState & AIProviderActions>()(
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
          // Also remove from hidden if it was previously hidden
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
            // If the edited model was selected, update selection
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
            // If deleted model was selected, reset to first available
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
            // It's a predefined model, add to hidden
            if (!hiddenModels.includes(model)) {
              newHiddenModels = [...hiddenModels, model];
            }
          }

          // Calculate remaining visible models
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
            // If deleted model was selected, reset to first available
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

export function getProviderAuth(provider: ProviderId): {
  apiKey?: string;
  url?: string;
} {
  const authStore = useAIAuthStore.getState();
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
  const authStore = useAIAuthStore.getState();
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

export function getDefaultModelForProvider(provider: ProviderId): string {
  return DEFAULT_MODELS[provider][0] || "";
}
