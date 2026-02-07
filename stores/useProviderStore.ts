/**
 * @file useProviderStore.ts
 * @purpose Provider and model selection state management
 * @connects-to UI components, provider factory
 * 
 * OVERVIEW:
 * This store manages all state related to AI providers and their models. It handles:
 * - Provider selection (Apple Intelligence, OpenAI, OpenRouter, Ollama)
 * - Model selection within each provider
 * - Custom model management (add, edit, delete)
 * - Model hiding/showing functionality
 * - Persistent storage using secure storage
 * 
 * ARCHITECTURE:
 * - Built with Zustand for lightweight state management
 * - Uses persist middleware with secure storage for data persistence
 * - Follows a clear separation between state and actions
 * - Provides intelligent defaults and fallback mechanisms
 * 
 * DATA FLOW:
 * 1. Initial state loads from persisted storage or defaults
 * 2. User interactions trigger actions that update state
 * 3. State changes are automatically persisted to secure storage
 * 4. UI components react to state changes and re-render accordingly
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import type { ProviderId } from "@/types/provider.types";
import {
  applyRuntimeWriteVersion,
  INITIAL_HYDRATION_META,
  markHydrationReady,
  resolveHydrationMerge,
  type HydrationMetaState,
} from "@/stores/hydration-registry";

// ============================================================================
// STATE INTERFACES
// ============================================================================

/**
 * Defines the shape of provider-related state managed by this store
 * @interface ProviderState
 * @description Contains all immutable state values for provider management
 */
interface ProviderState {
  /** Currently selected AI provider (apple, openai, openrouter, ollama) */
  selectedProvider: ProviderId;
  /** Currently selected model within the active provider */
  selectedModel: string;
  /** Available models fetched from each provider's API */
  availableModels: Record<ProviderId, string[]>;
  /** User-defined custom models added to each provider */
  customModels: Record<ProviderId, string[]>;
  /** Models that have been hidden from the UI for each provider */
  hiddenModels: Record<ProviderId, string[]>;
  /** Internal hydration and runtime write metadata */
  __meta: HydrationMetaState;
}

/**
 * Defines all available actions for modifying provider state
 * @interface ProviderActions
 * @description Contains all functions that can modify the provider state
 */
interface ProviderActions {
  /** Sets the active provider and updates selected model to provider's default */
  setSelectedProvider: (provider: ProviderId) => void;
  /** Updates the currently selected model */
  setSelectedModel: (model: string) => void;
  /** Updates the available models list for a specific provider */
  setAvailableModels: (provider: ProviderId, models: string[]) => void;
  /** Adds a new custom model to a provider's custom model list */
  addCustomModel: (provider: ProviderId, model: string) => void;
  /** Edits an existing custom model name and updates selection if needed */
  editCustomModel: (provider: ProviderId, oldModel: string, newModel: string) => void;
  /** Removes a custom model from a provider's custom model list */
  deleteCustomModel: (provider: ProviderId, model: string) => void;
  /** Hides a model (if default) or removes it (if custom) from a provider */
  deleteModel: (provider: ProviderId, model: string) => void;
  /** Sets the hidden models configuration for all providers */
  setHiddenModels: (models: Record<ProviderId, string[]>) => void;
  /** Resets all state to initial default values */
  resetToDefaults: () => void;
}

// ============================================================================
// SECURE STORAGE ADAPTER
// ============================================================================

/**
 * Secure storage adapter for Zustand persistence middleware
 * @description Provides a bridge between Zustand's expected storage interface
 * and Expo's SecureStore. All operations are wrapped in try-catch blocks
 * to ensure graceful degradation if secure storage is unavailable.
 */
const secureStorage = {
  /**
   * Retrieves a value from secure storage
   * @param name - The key to retrieve
   * @returns Promise<string | null> - The stored value or null if not found/error
   */
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      // Silently fail and return null if secure storage is unavailable
      return null;
    }
  },
  /**
   * Stores a value in secure storage
   * @param name - The key to store under
   * @param value - The value to store
   * @returns Promise<void> - Resolves when storage is complete (fails silently)
   */
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      // Silently fail if storage is unavailable - app continues to work
    }
  },
  /**
   * Removes a value from secure storage
   * @param name - The key to remove
   * @returns Promise<void> - Resolves when removal is complete (fails silently)
   */
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      // Silently fail if storage is unavailable
    }
  },
};

// ============================================================================
// DEFAULT CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Default models available for each provider
 * @description These are the built-in models that come pre-configured
 * for each provider. They serve as the initial available models and
 * also as the fallback list when custom models are removed.
 */
const DEFAULT_MODELS: Record<ProviderId, string[]> = {
  apple: ["system-default"], // Apple Intelligence uses a single system default model
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"], // Main OpenAI models
  openrouter: [
    "openai/gpt-4o", // OpenAI models via OpenRouter
    "openai/gpt-4o-mini",
    "anthropic/claude-sonnet-4-20250514", // Anthropic models via OpenRouter
  ],
  ollama: ["llama3.2", "mistral", "codellama", "qwen2.5"], // Popular local models
};

/**
 * Default custom models configuration for each provider
 * @description All providers start with no custom models. Users can
 * add their own models through the UI, which will be stored here.
 */
const DEFAULT_CUSTOM_MODELS: Record<ProviderId, string[]> = {
  apple: [], // Apple Intelligence doesn't support custom models
  openai: [], // Can be extended with user-defined OpenAI-compatible models
  openrouter: [], // Can be extended with additional OpenRouter-compatible models
  ollama: [], // Often extended with locally installed models
};

/**
 * Default hidden models configuration for each provider
 * @description No models are hidden by default. Users can hide models
 * they don't want to see in the UI, which will be stored here.
 */
const DEFAULT_HIDDEN_MODELS: Record<ProviderId, string[]> = {
  apple: [], // No models hidden initially
  openai: [], // All default OpenAI models shown initially
  openrouter: [], // All default OpenRouter models shown initially
  ollama: [], // All default Ollama models shown initially
};

// ============================================================================
// ZUSTAND STORE CREATION
// ============================================================================

/**
 * Main provider store with state persistence
 * @description Creates a Zustand store that combines state and actions,
 * with persistence to secure storage. The store automatically saves
 * and restores state across app launches.
 */
export const useProviderStore = create<ProviderState & ProviderActions>()(
  persist(
    (set, get) => ({
      // ========================================================================
      // INITIAL STATE
      // ========================================================================
      
      /** Start with Apple Intelligence as the default provider */
      selectedProvider: "apple",
      /** Start with Apple's system default model */
      selectedModel: "system-default",
      /** Initialize with default built-in models */
      availableModels: DEFAULT_MODELS,
      /** Initialize with empty custom model lists */
      customModels: DEFAULT_CUSTOM_MODELS,
      /** Initialize with no hidden models */
      hiddenModels: DEFAULT_HIDDEN_MODELS,
      /** Runtime mutation and hydration metadata */
      __meta: INITIAL_HYDRATION_META,

      // ========================================================================
      // PROVIDER SELECTION ACTIONS
      // ========================================================================

      /**
       * Sets the active provider and updates selected model accordingly
       * @param provider - The provider ID to set as active
       * @description When changing providers, automatically selects the first
       * available model from the new provider to ensure a valid selection.
       */
      setSelectedProvider: (provider) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            selectedProvider: provider,
            selectedModel: DEFAULT_MODELS[provider][0] || "",
          }),
        ),

      /**
       * Updates the currently selected model
       * @param model - The model identifier to select
       * @description Directly updates the selected model without validation.
       * UI components should ensure the model is valid for the current provider.
       */
      setSelectedModel: (model) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            selectedModel: model,
          }),
        ),

      /**
       * Updates the available models list for a specific provider
       * @param provider - The provider to update models for
       * @param models - Array of model identifiers
       * @description Used when fetching updated model lists from provider APIs.
       * Does not affect custom models or hidden models.
       */
      setAvailableModels: (provider, models) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            availableModels: {
              ...state.availableModels,
              [provider]: models,
            },
          }),
        ),

      // ========================================================================
      // CUSTOM MODEL MANAGEMENT ACTIONS
      // ========================================================================

      /**
       * Adds a custom model to a provider's custom model list
       * @param provider - The provider to add the model to
       * @param model - The custom model identifier to add
       * @description Prevents duplicate models and automatically unhides
       * the model if it was previously hidden.
       */
      addCustomModel: (provider, model) =>
        set((state) => {
          const existing = state.customModels[provider] || [];
          // Prevent duplicate custom models
          if (existing.includes(model)) return state;
          const hidden = state.hiddenModels[provider] || [];
          return applyRuntimeWriteVersion(state, {
            customModels: {
              ...state.customModels,
              [provider]: [...existing, model],
            },
            hiddenModels: {
              ...state.hiddenModels,
              // Unhide the model if it was previously hidden
              [provider]: hidden.filter((m) => m !== model),
            },
          });
        }),

      /**
       * Edits an existing custom model name
       * @param provider - The provider containing the custom model
       * @param oldModel - The current model name to replace
       * @param newModel - The new model name to use
       * @description Updates the model name and automatically updates the
       * selected model if it was the one being edited.
       */
      editCustomModel: (provider, oldModel, newModel) =>
        set((state) => {
          const existing = state.customModels[provider] || [];
          const index = existing.indexOf(oldModel);
          // Only proceed if the old model exists in custom models
          if (index === -1) return state;
          const updated = [...existing];
          updated[index] = newModel;
          return applyRuntimeWriteVersion(state, {
            customModels: {
              ...state.customModels,
              [provider]: updated,
            },
            // Update selected model if it was the edited model
            selectedModel:
              state.selectedModel === oldModel ? newModel : state.selectedModel,
          });
        }),

      /**
       * Removes a custom model from a provider's custom model list
       * @param provider - The provider to remove the model from
       * @param model - The custom model identifier to remove
       * @description Removes the custom model and updates selection if needed.
       * Falls back to the first available visible model.
       */
      deleteCustomModel: (provider, model) =>
        set((state) => {
          const existing = state.customModels[provider] || [];
          const customModelsFiltered = existing.filter((m) => m !== model);
          // Calculate fallback model selection
          const allVisible = [
            ...DEFAULT_MODELS[provider].filter(
              (m) => !(state.hiddenModels[provider] || []).includes(m)
            ),
            ...customModelsFiltered,
          ];
          return applyRuntimeWriteVersion(state, {
            customModels: {
              ...state.customModels,
              [provider]: customModelsFiltered,
            },
            // Update selection if deleted model was selected
            selectedModel:
              state.selectedModel === model
                ? allVisible[0] || ""
                : state.selectedModel,
          });
        }),

      // ========================================================================
      // UNIVERSAL MODEL MANAGEMENT ACTIONS
      // ========================================================================

      /**
       * Deletes a model from either custom or default lists
       * @param provider - The provider containing the model
       * @param model - The model identifier to delete
       * @description Smart deletion that handles both custom and default models:
       * - Custom models are completely removed
       * - Default models are hidden (can be unhidden later)
       * Updates selected model to next available if needed.
       */
      deleteModel: (provider, model) =>
        set((state) => {
          const customModels = state.customModels[provider] || [];
          const hiddenModels = state.hiddenModels[provider] || [];
          const isCustom = customModels.includes(model);

          let newCustomModels = customModels;
          let newHiddenModels = hiddenModels;

          if (isCustom) {
            // Remove custom models entirely
            newCustomModels = customModels.filter((m) => m !== model);
          } else {
            // Hide default models (can be recovered)
            if (!hiddenModels.includes(model)) {
              newHiddenModels = [...hiddenModels, model];
            }
          }

          // Calculate available models after deletion
          const allVisible = [
            ...DEFAULT_MODELS[provider].filter((m) => !newHiddenModels.includes(m)),
            ...newCustomModels,
          ];

          return applyRuntimeWriteVersion(state, {
            customModels: {
              ...state.customModels,
              [provider]: newCustomModels,
            },
            hiddenModels: {
              ...state.hiddenModels,
              [provider]: newHiddenModels,
            },
            // Update selection if deleted model was selected
            selectedModel:
              state.selectedModel === model
                ? allVisible[0] || ""
                : state.selectedModel,
          });
        }),

      // ========================================================================
      // UTILITY ACTIONS
      // ========================================================================

      /**
       * Resets all store state to initial defaults
       * @description Clears all custom models, hidden models, and selections,
       * returning the store to its original state.
       */
      resetToDefaults: () =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            selectedProvider: "apple",
            selectedModel: "system-default",
            availableModels: DEFAULT_MODELS,
            customModels: DEFAULT_CUSTOM_MODELS,
            hiddenModels: DEFAULT_HIDDEN_MODELS,
          }),
        ),

      /**
       * Sets hidden models configuration for all providers
       * @param models - Complete hidden models record
       * @description Overwrites the entire hidden models configuration.
       * Used for bulk updates or restoring saved configurations.
       */
      setHiddenModels: (models) =>
        set((state) =>
          applyRuntimeWriteVersion(state, {
            hiddenModels: models,
          }),
        ),
    }),
    // ========================================================================
    // PERSISTENCE CONFIGURATION
    // ========================================================================
    
    {
      /** Storage key used in secure storage */
      name: "ai-provider-storage",
      /** Use secure storage adapter with JSON serialization */
      storage: createJSONStorage(() => ({
        getItem: (name) =>
          secureStorage.getItem(name) as Promise<string | null>,
        setItem: (name, value) => secureStorage.setItem(name, value),
        removeItem: (name) => secureStorage.removeItem(name),
      })),
      partialize: (state) => ({
        selectedProvider: state.selectedProvider,
        selectedModel: state.selectedModel,
        availableModels: state.availableModels,
        customModels: state.customModels,
        hiddenModels: state.hiddenModels,
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

        state.__meta = markHydrationReady(state.__meta, "provider");
      },
    },
  ),
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the default model for a given provider
 * @param provider - The provider to get the default model for
 * @returns The default model identifier or empty string if not found
 * @description Helper function that safely returns the first available
 * model for a provider, used throughout the app for fallback model selection.
 */
export function getDefaultModelForProvider(provider: ProviderId): string {
  return DEFAULT_MODELS[provider][0] || "";
}
