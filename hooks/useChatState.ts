import { useCallback, useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { ProviderId } from "@/types/provider.types";
import { useProviderStore } from "@/stores";

/**
 * Chat-specific provider/model override
 */
export interface ChatOverride {
  provider: ProviderId;
  model: string;
}

/**
 * Internal state for chat overrides
 */
interface ChatOverrideState {
  overrides: Record<string, ChatOverride>;
}

interface ChatOverrideActions {
  setChatOverride: (chatId: string, provider: ProviderId, model: string) => void;
  clearChatOverride: (chatId: string) => void;
  getChatOverride: (chatId: string) => ChatOverride | null;
  clearAllOverrides: () => void;
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

/**
 * Zustand store for chat-specific provider/model overrides
 * Persisted to SecureStore for data persistence across sessions
 */
export const useChatOverrideStore = create<ChatOverrideState & ChatOverrideActions>()(
  persist(
    (set, get) => ({
      overrides: {},
      
      setChatOverride: (chatId: string, provider: ProviderId, model: string) => {
        set((state) => ({
          overrides: {
            ...state.overrides,
            [chatId]: { provider, model },
          },
        }));
      },
      
      clearChatOverride: (chatId: string) => {
        set((state) => {
          const { [chatId]: _, ...rest } = state.overrides;
          return { overrides: rest };
        });
      },
      
      getChatOverride: (chatId: string) => {
        return get().overrides[chatId] || null;
      },
      
      clearAllOverrides: () => {
        set({ overrides: {} });
      },
    }),
    {
      name: "chat-override-storage",
      storage: createJSONStorage(() => ({
        getItem: (name) => secureStorage.getItem(name) as Promise<string | null>,
        setItem: (name, value) => secureStorage.setItem(name, value),
        removeItem: (name) => secureStorage.removeItem(name),
      })),
    }
  )
);

/**
 * Result type for effective provider/model resolution
 */
export interface EffectiveProviderModel {
  provider: ProviderId;
  model: string;
  isOverridden: boolean;
}

/**
 * Hook for managing chat state with proper unification of global and chat-specific overrides
 * 
 * @param chatId - The ID of the chat (use "new" for new chats, or numeric string for existing)
 * @returns Unified chat state management functions
 */
export function useChatState(chatId: string | null) {
  const { selectedProvider, selectedModel } = useProviderStore();
  const { 
    overrides, 
    setChatOverride, 
    clearChatOverride, 
    getChatOverride 
  } = useChatOverrideStore();

  /**
   * Get the effective provider and model for this chat
   * Prioritizes chat-specific overrides, falls back to global settings
   */
  const getEffectiveProviderModel = useCallback((): EffectiveProviderModel => {
    if (!chatId || chatId === "new") {
      // New chats always use global settings
      return {
        provider: selectedProvider,
        model: selectedModel,
        isOverridden: false,
      };
    }

    const override = getChatOverride(chatId);
    if (override) {
      return {
        provider: override.provider,
        model: override.model,
        isOverridden: true,
      };
    }

    // No override - use global settings
    return {
      provider: selectedProvider,
      model: selectedModel,
      isOverridden: false,
    };
  }, [chatId, selectedProvider, selectedModel, getChatOverride]);

  /**
   * Memoized effective provider/model to prevent unnecessary recalculations
   */
  const effectiveProviderModel = useMemo(() => {
    return getEffectiveProviderModel();
  }, [getEffectiveProviderModel]);

  /**
   * Set a chat-specific override for provider and model
   */
  const setOverride = useCallback(
    (provider: ProviderId, model: string) => {
      if (!chatId || chatId === "new") {
        return;
      }
      setChatOverride(chatId, provider, model);
    },
    [chatId, setChatOverride]
  );

  /**
   * Clear the chat-specific override, reverting to global settings
   */
  const clearOverride = useCallback(() => {
    if (!chatId || chatId === "new") {
      return;
    }
    clearChatOverride(chatId);
  }, [chatId, clearChatOverride]);

  /**
   * Check if this chat has a provider/model override
   */
  const hasOverride = useMemo(() => {
    if (!chatId || chatId === "new") {
      return false;
    }
    return !!overrides[chatId];
  }, [chatId, overrides]);

  /**
   * Sync override from database values (called when loading existing chat)
   */
  const syncFromDatabase = useCallback(
    (dbProvider: ProviderId | null, dbModel: string | null) => {
      if (!chatId || chatId === "new") {
        return;
      }
      
      // Only set override if database has different values than global
      if (dbProvider && dbModel) {
        const isDifferentFromGlobal = 
          dbProvider !== selectedProvider || dbModel !== selectedModel;
        
        if (isDifferentFromGlobal) {
          setChatOverride(chatId, dbProvider, dbModel);
        }
      }
    },
    [chatId, selectedProvider, selectedModel, setChatOverride]
  );

  return {
    // Current effective values
    provider: effectiveProviderModel.provider,
    model: effectiveProviderModel.model,
    isOverridden: effectiveProviderModel.isOverridden,
    
    // Global values for reference
    globalProvider: selectedProvider,
    globalModel: selectedModel,
    
    // Actions
    setOverride,
    clearOverride,
    syncFromDatabase,
    
    // State checks
    hasOverride,
  };
}

/**
 * Utility function to get effective provider/model outside of React components
 * Useful for non-hook contexts
 */
export function getEffectiveProviderModelSync(chatId: string | null): EffectiveProviderModel {
  const { selectedProvider, selectedModel } = useProviderStore.getState();
  const { overrides } = useChatOverrideStore.getState();

  if (!chatId || chatId === "new") {
    return {
      provider: selectedProvider,
      model: selectedModel,
      isOverridden: false,
    };
  }

  const override = overrides[chatId];
  if (override) {
    return {
      provider: override.provider,
      model: override.model,
      isOverridden: true,
    };
  }

  return {
    provider: selectedProvider,
    model: selectedModel,
    isOverridden: false,
  };
}
