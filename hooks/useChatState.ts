/**
 * @file useChatState.ts
 * @purpose Chat state management with provider/model override system
 * @description 
 * This hook provides unified state management for chat-specific provider and model
 * configurations. It manages a hierarchy of settings:
 * 1. Global provider/model settings (stored in useProviderStore)
 * 2. Chat-specific overrides (stored per chat ID)
 * 3. New chats always use global settings
 * 
 * The system uses Expo SecureStore for persistent storage and Zustand for state
 * management. It provides both hook-based and synchronous utility functions for
 * accessing effective provider/model configurations.
 * 
 * @connects-to useProviderStore, SecureStore, provider-factory
 * @used-by useChat, Chat screens, Settings components
 */

import { useCallback, useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import type { ProviderId } from "@/types/provider.types";
import { useProviderStore } from "@/stores";
import {
  applyRuntimeWriteVersion,
  areStoreDependenciesHydrated,
  INITIAL_HYDRATION_META,
  isStoreHydrated,
  markHydrationReady,
  resolveHydrationMerge,
  type HydrationMetaState,
} from "@/stores/hydration-registry";

// ===== TYPE DEFINITIONS =====

/**
 * Chat-specific provider/model override configuration
 * 
 * This interface defines the structure for per-chat provider and model settings.
 * When a chat has an override, it will use these settings instead of the global
 * provider/model configuration.
 */
export interface ChatOverride {
  /** The AI provider to use for this specific chat (apple, openai, openrouter, ollama) */
  provider: ProviderId;
  /** The specific model to use within the selected provider */
  model: string;
}

/**
 * Internal state interface for the chat override store
 * 
 * Contains the core state data for managing chat-specific overrides.
 * The overrides object maps chat IDs to their respective override configurations.
 */
interface ChatOverrideState {
  /** 
   * Record mapping chat IDs to their override configurations
   * Key: chat ID (string), Value: ChatOverride configuration
   */
  overrides: Record<string, ChatOverride>;
  /** Internal hydration and runtime write metadata */
  __meta: HydrationMetaState;
}

/**
 * Action interface for the chat override store
 * 
 * Defines all available operations for managing chat-specific overrides.
 * These actions provide CRUD operations for the overrides system.
 */
interface ChatOverrideActions {
  /** 
   * Set or update a provider/model override for a specific chat
   * @param chatId - The ID of the chat to set override for
   * @param provider - The provider to override to
   * @param model - The model to override to
   */
  setChatOverride: (chatId: string, provider: ProviderId, model: string) => void;
  
  /** 
   * Clear/remove the override for a specific chat, reverting to global settings
   * @param chatId - The ID of the chat to clear override for
   */
  clearChatOverride: (chatId: string) => void;
  
  /** 
   * Get the current override configuration for a specific chat
   * @param chatId - The ID of the chat to get override for
   * @returns The override configuration if it exists, null otherwise
   */
  getChatOverride: (chatId: string) => ChatOverride | null;
  
  /** 
   * Clear all chat overrides across all chats
   * Useful for reset functionality or cleanup operations
   */
  clearAllOverrides: () => void;
}

// ===== SECURE STORAGE CONFIGURATION =====

/**
 * Secure storage adapter for Zustand persistence
 * 
 * This adapter bridges Expo's SecureStore with Zustand's storage interface.
 * It provides error handling to ensure the app doesn't crash if secure storage
 * operations fail (e.g., due to device limitations or security policies).
 * 
 * Security: Uses device's secure storage mechanism (Keychain on iOS, Keystore on Android)
 * Persistence: Data survives app restarts and device reboots
 * Error handling: Silent failures to prevent app crashes
 */
const secureStorage = {
  /**
   * Retrieve an item from secure storage
   * @param name - The key/name of the item to retrieve
   * @returns Promise resolving to the stored value or null if not found/error
   */
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      // Silent failure - return null if secure storage fails
      return null;
    }
  },
  
  /**
   * Store an item in secure storage
   * @param name - The key/name to store the value under
   * @param value - The value to store
   */
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      // Silent failure - don't crash if storage fails
    }
  },
  
  /**
   * Remove an item from secure storage
   * @param name - The key/name of the item to remove
   */
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      // Silent failure - don't crash if removal fails
    }
  },
};

// ===== CHAT OVERRIDE STORE =====

/**
 * Zustand store for managing chat-specific provider/model overrides
 * 
 * This store maintains a persistent record of which chats have custom provider/model
 * configurations. It uses Expo SecureStore for persistence to ensure that chat-specific
 * settings survive app restarts and device reboots.
 * 
 * Features:
 * - Automatic persistence using Zustand persist middleware
 * - Secure storage for sensitive configuration data
 * - TypeScript type safety for all operations
 * - Immutable updates following React best practices
 * 
 * Storage key: "chat-override-storage"
 * Storage type: SecureStore (device keychain/keystore)
 */
export const useChatOverrideStore = create<ChatOverrideState & ChatOverrideActions>()(
  persist(
    (set, get) => ({
      // Initial state - empty overrides object
      overrides: {},
      __meta: INITIAL_HYDRATION_META,
      
      /**
       * Set or update a provider/model override for a specific chat
       * 
       * Uses immutable update pattern to ensure React re-renders work correctly.
       * Creates a new overrides object with the updated chat configuration.
       * 
       * @param chatId - Unique identifier for the chat
       * @param provider - AI provider to use for this chat
       * @param model - Specific model within the provider
       */
      setChatOverride: (chatId: string, provider: ProviderId, model: string) => {
        set((state) =>
          applyRuntimeWriteVersion(state, {
            overrides: {
              ...state.overrides, // Preserve existing overrides
              [chatId]: { provider, model }, // Add/update specific override
            },
          }),
        );
      },
      
      /**
       * Clear/remove the override for a specific chat
       * 
       * Uses object destructuring to remove the specific chat ID from overrides
       * while preserving all other chat configurations.
       * 
       * @param chatId - The chat ID to remove override for
       */
      clearChatOverride: (chatId: string) => {
        set((state) => {
          const { [chatId]: _, ...rest } = state.overrides; // Remove specific key
          return applyRuntimeWriteVersion(state, {
            overrides: rest,
          });
        });
      },
      
      /**
       * Retrieve the override configuration for a specific chat
       * 
       * Direct state access using get() method from Zustand.
       * Returns null if no override exists for the given chat ID.
       * 
       * @param chatId - The chat ID to retrieve override for
       * @returns ChatOverride configuration or null
       */
      getChatOverride: (chatId: string) => {
        return get().overrides[chatId] || null;
      },
      
      /**
       * Clear all chat overrides across the entire application
       * 
       * Useful for reset functionality, cleanup operations, or when
       * migrating to a new override system.
       */
      clearAllOverrides: () => {
        set((state) =>
          applyRuntimeWriteVersion(state, {
            overrides: {},
          }),
        ); // Reset to empty object
      },
    }),
    {
      // Persistence configuration
      name: "chat-override-storage", // Unique storage key
      storage: createJSONStorage(() => ({
        // Bridge our secureStorage to Zustand's expected interface
        getItem: (name) => secureStorage.getItem(name) as Promise<string | null>,
        setItem: (name, value) => secureStorage.setItem(name, value),
        removeItem: (name) => secureStorage.removeItem(name),
      })),
      partialize: (state) => ({
        overrides: state.overrides,
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

        state.__meta = markHydrationReady(state.__meta, "chatOverride");
      },
    }
  )
);

function canUseChatOverrides(): boolean {
  return isStoreHydrated("chatOverride") && areStoreDependenciesHydrated("chatOverride");
}

// ===== RESULT TYPES =====

/**
 * Result type for effective provider/model resolution
 * 
 * This interface represents the final resolved provider/model configuration
 * for a chat, taking into account both global settings and chat-specific overrides.
 * 
 * The isOverridden flag indicates whether the result comes from a chat-specific
 * override (true) or from global settings (false), which is useful for UI
 * display and user feedback.
 */
export interface EffectiveProviderModel {
  /** The effective provider to use for this chat */
  provider: ProviderId;
  /** The effective model to use for this chat */
  model: string;
  /** Whether this configuration comes from a chat-specific override */
  isOverridden: boolean;
}

// ===== MAIN CHAT STATE HOOK =====

/**
 * Main hook for managing chat state with unified provider/model resolution
 * 
 * This hook provides the primary interface for interacting with chat state management.
 * It unifies global provider settings with chat-specific overrides, providing a single
 * source of truth for what provider/model should be used for any given chat.
 * 
 * Key responsibilities:
 * - Resolve effective provider/model considering both global and chat-specific settings
 * - Provide methods to set/clear chat-specific overrides
 * - Handle the special case of "new" chats (always use global settings)
 * - Sync with database values when loading existing chats
 * - Memoize values to prevent unnecessary re-renders
 * 
 * @param chatId - The ID of the chat (null/"new" for new chats, string ID for existing)
 * @returns Object containing resolved values and management functions
 */
export function useChatState(chatId: string | null) {
  // Access global provider/model settings from the main provider store
  const { selectedProvider, selectedModel } = useProviderStore();
  
  // Access chat override store for chat-specific configurations
  const { 
    overrides,           // All current overrides (for hasOverride check)
    setChatOverride,     // Function to set a new override
    clearChatOverride,   // Function to clear an existing override
    getChatOverride     // Function to retrieve a specific override
  } = useChatOverrideStore();

  // ===== EFFECTIVE PROVIDER/MODEL RESOLUTION =====

  /**
   * Resolve the effective provider and model for the current chat
   * 
   * This is the core resolution logic that follows the hierarchy:
   * 1. If chat is new (null or "new"), always use global settings
   * 2. If chat has an override, use the override configuration
   * 3. Otherwise, fall back to global settings
   * 
   * The isOverridden flag indicates whether we're using step 2 (true) or steps 1/3 (false).
   * This is useful for UI indicators showing when a chat has custom settings.
   * 
   * @returns EffectiveProviderModel with resolved configuration and override status
   */
  const getEffectiveProviderModel = useCallback((): EffectiveProviderModel => {
    // Special case: new chats always use global settings
    // This prevents users from accidentally setting overrides on new chats
    if (!chatId || chatId === "new") {
      return {
        provider: selectedProvider,
        model: selectedModel,
        isOverridden: false, // Never overridden for new chats
      };
    }

    // Guard against cross-store hydration ordering races
    if (!canUseChatOverrides()) {
      return {
        provider: selectedProvider,
        model: selectedModel,
        isOverridden: false,
      };
    }

    // Check if this specific chat has an override
    const override = getChatOverride(chatId);
    if (override) {
      return {
        provider: override.provider, // Use override provider
        model: override.model,       // Use override model
        isOverridden: true,           // Mark as overridden for UI feedback
      };
    }

    // No override exists - use global settings as default
    return {
      provider: selectedProvider,
      model: selectedModel,
      isOverridden: false, // Using global settings, not overridden
    };
  }, [chatId, selectedProvider, selectedModel, getChatOverride]); // Dependencies for memoization

    /**
   * Memoized effective provider/model configuration
   * 
   * This prevents unnecessary recalculations of the effective provider/model
   * when the hook re-renders due to other state changes. The memoization
   * ensures that the same object reference is returned unless any of the
   * dependencies in getEffectiveProviderModel change.
   * 
   * This is important for preventing unnecessary re-renders in components
   * that consume this hook and depend on stable object references.
   */
  const effectiveProviderModel = useMemo(() => {
    return getEffectiveProviderModel();
  }, [getEffectiveProviderModel]); // Re-calculate only when resolution dependencies change

  // ===== OVERRIDE MANAGEMENT FUNCTIONS =====

  /**
   * Set a chat-specific override for provider and model
   * 
   * This function creates a custom provider/model configuration for a specific chat.
   * It includes safety checks to prevent setting overrides on new chats, which
   * should always use global settings.
   * 
   * @param provider - The provider to override to
   * @param model - The model to override to
   */
  const setOverride = useCallback(
    (provider: ProviderId, model: string) => {
      // Prevent setting overrides on new chats - they should always use global settings
      if (!chatId || chatId === "new") {
        return;
      }
      setChatOverride(chatId, provider, model);
    },
    [chatId, setChatOverride] // Dependencies: chat ID for validation, store function for updates
  );

    /**
   * Clear the chat-specific override, reverting to global settings
   * 
   * This function removes any custom provider/model configuration for a specific chat,
   * causing it to fall back to the global settings. Like setOverride, it includes
   * safety checks to prevent operations on new chats.
   * 
   * After calling this function, the chat will use whatever provider/model is
   * currently set in the global provider store.
   */
  const clearOverride = useCallback(() => {
    // Prevent clearing overrides on new chats - they don't have overrides anyway
    if (!chatId || chatId === "new") {
      return;
    }
    clearChatOverride(chatId);
  }, [chatId, clearChatOverride]); // Dependencies: chat ID for validation, store function for clearing

    /**
   * Check if this chat currently has a provider/model override
   * 
   * This memoized boolean indicates whether the chat is using custom settings
   * or global settings. It's useful for UI indicators, such as showing when
   * a chat has custom provider/model configurations.
   * 
   * New chats always return false since they never have overrides.
   */
  const hasOverride = useMemo(() => {
    // New chats never have overrides
    if (!chatId || chatId === "new") {
      return false;
    }

    if (!canUseChatOverrides()) {
      return false;
    }

    // Check if the overrides object contains an entry for this chat ID
    return !!overrides[chatId];
  }, [chatId, overrides]); // Dependencies: chat ID for validation, overrides object for lookup

  /**
   * Sync override from database values (called when loading existing chat)
   * 
   * This function is used when loading an existing chat from the database.
   * It ensures that chat-specific provider/model settings from the database
   * are properly synchronized with the override store.
   * 
   * Importantly, it only creates an override if the database values differ
   * from the current global settings. This prevents unnecessary overrides
   * when a chat is using the same provider/model as the global settings.
   * 
   * @param dbProvider - Provider ID from database (may be null)
   * @param dbModel - Model name from database (may be null)
   */
  const syncFromDatabase = useCallback(
    (dbProvider: ProviderId | null, dbModel: string | null) => {
      // Skip database sync for new chats
      if (!chatId || chatId === "new") {
        return;
      }

      if (!canUseChatOverrides()) {
        return;
      }
      
      // Only process if database has valid provider and model values
      if (dbProvider && dbModel) {
        // Check if database values differ from current global settings
        const isDifferentFromGlobal = 
          dbProvider !== selectedProvider || dbModel !== selectedModel;
        
        // Only create an override if there's an actual difference
        if (isDifferentFromGlobal) {
          setChatOverride(chatId, dbProvider, dbModel);
        }
      }
    },
    [chatId, selectedProvider, selectedModel, setChatOverride] // Dependencies for comparison and updates
  );

  // ===== HOOK RETURN VALUE =====
  return {
    // Current effective values (what should actually be used for this chat)
    provider: effectiveProviderModel.provider,    // Resolved provider (override or global)
    model: effectiveProviderModel.model,         // Resolved model (override or global)
    isOverridden: effectiveProviderModel.isOverridden, // Whether we're using an override
    
    // Global values for reference (useful for UI comparisons)
    globalProvider: selectedProvider,             // Currently selected global provider
    globalModel: selectedModel,                  // Currently selected global model
    
    // Actions for managing overrides
    setOverride,                                  // Set a new override for this chat
    clearOverride,                                // Clear existing override
    syncFromDatabase,                             // Sync override from database values
    
    // State checks for UI logic
    hasOverride,                                  // Whether this chat currently has an override
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Utility function to get effective provider/model outside of React components
 * 
 * This function provides the same resolution logic as the hook but can be used
 * in non-React contexts where hooks cannot be called (e.g., in utility functions,
 * event handlers, or outside of component scope).
 * 
 * It uses the getState() method from Zustand stores to synchronously access
 * the current state without subscribing to updates.
 * 
 * Use cases:
 * - Provider factory configuration
 * - Non-component utility functions
 * - Event handlers outside React scope
 * - Background processing tasks
 * 
 * @param chatId - The ID of the chat (null/"new" for new chats)
 * @returns EffectiveProviderModel with resolved configuration
 */
export function getEffectiveProviderModelSync(chatId: string | null): EffectiveProviderModel {
  // Synchronously access current global provider/model state
  const { selectedProvider, selectedModel } = useProviderStore.getState();
  
  // Synchronously access current override state
  const { overrides } = useChatOverrideStore.getState();

  // Apply the same resolution logic as the hook
  if (!chatId || chatId === "new") {
    return {
      provider: selectedProvider,
      model: selectedModel,
      isOverridden: false,
    };
  }

  if (!canUseChatOverrides()) {
    return {
      provider: selectedProvider,
      model: selectedModel,
      isOverridden: false,
    };
  }

  // Check for chat-specific override
  const override = overrides[chatId];
  if (override) {
    return {
      provider: override.provider,
      model: override.model,
      isOverridden: true,
    };
  }

  // Fall back to global settings
  return {
    provider: selectedProvider,
    model: selectedModel,
    isOverridden: false,
  };
}

/*
 * ===== OVERALL ARCHITECTURE SUMMARY =====
 * 
 * The useChatState hook system provides a unified interface for managing
 * chat-specific AI provider and model configurations. It operates on a
 * hierarchical system where:
 * 
 * 1. New chats always use global settings (prevents accidental overrides)
 * 2. Existing chats can have per-chat overrides stored in SecureStore
 * 3. The resolution logic prioritizes overrides over global settings
 * 4. Both hook-based and synchronous utility functions are provided
 * 
 * Key design principles:
 * - Persistent storage using SecureStore for security
 * - Immutable updates for React performance
 * - Comprehensive error handling to prevent crashes
 * - Type safety throughout the system
 * - Memoization to prevent unnecessary re-renders
 * - Separation of concerns (resolution vs storage vs UI)
 * 
 * This system enables users to customize AI providers and models on a per-chat
 * basis while maintaining sensible defaults for new chats.
 */
