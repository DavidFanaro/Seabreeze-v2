/**
 * @file components/chat/ChatContextMenu.tsx
 * @purpose Context menu UI for chat operations - provides provider/model selection and reset functionality
 */

import React, { useMemo } from "react";
import { View } from "react-native";
import { ContextMenu, Submenu, Host, Button } from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useProviderStore, isProviderConfigured } from "@/stores";
import { useSettingsStore } from "@/stores/useSettingsStore";
import {
  ProviderId,
  PROVIDERS,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
  OLLAMA_MODELS,
} from "@/types/provider.types";
import useHapticFeedback from "@/hooks/useHapticFeedback";

/**
 * Properties for the ChatContextMenu component
 */
interface ChatContextMenuProps {
  /** Callback function triggered when user selects the reset option */
  onReset: () => void;
}

/**
 * Get the default list of available models for a given provider
 * Each provider has its own set of supported models
 *
 * @param providerId - The AI provider identifier
 * @returns Array of available model names for the provider
 */
const getDefaultModelsForProvider = (providerId: ProviderId): string[] => {
  switch (providerId) {
    case "apple":
      return ["Apple Intelligence"];
    case "openai":
      return OPENAI_MODELS;
    case "openrouter":
      return OPENROUTER_MODELS;
    case "ollama":
      return OLLAMA_MODELS;
    default:
      return [];
  }
};

/**
 * Map a display model name to its stored value in the provider store
 * Apple Intelligence uses a special "system-default" value regardless of display name
 * Other providers store the model name as-is
 *
 * @param providerId - The AI provider identifier
 * @param displayModel - The model name as displayed to the user
 * @returns The value to store in the provider store
 */
const getStoredModelValue = (
  providerId: ProviderId,
  displayModel: string
): string => {
  if (providerId === "apple") {
    return "system-default";
  }
  return displayModel;
};

/**
 * ChatContextMenu Component
 *
 * Renders a context menu with options to:
 * - Reset the chat
 * - Select different AI providers (Apple, OpenAI, OpenRouter, Ollama)
 * - Select specific models from each provider
 *
 * Uses haptic feedback for user interactions and displays checkmarks for active selections
 */
export function ChatContextMenu({ onReset }: ChatContextMenuProps) {
  // ============================================================================
  // STATE & HOOKS
  // ============================================================================

  /** Theme configuration for color values */
  const { theme } = useTheme();

  /** Haptic feedback trigger function */
  const { triggerPress } = useHapticFeedback();

  /** Provider store containing selected provider/model and configuration state */
  const {
    selectedProvider,
    selectedModel,
    customModels,
    hiddenModels,
    availableModels,
    setSelectedProvider,
    setSelectedModel,
  } = useProviderStore();

  const thinkingEnabled = useSettingsStore((state) => state.thinkingEnabled);
  const setThinkingEnabled = useSettingsStore((state) => state.setThinkingEnabled);

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  /** List of all available AI providers in the application */
  const providers: ProviderId[] = ["apple", "openai", "openrouter", "ollama"];

  // ============================================================================
  // COMPUTED STATE
  // ============================================================================

  /**
   * Memoized function that builds a filtered list of models for each provider
   * Combines default models, custom models, and handles hidden/available overrides
   * Special handling for Ollama which can dynamically discover models
   *
   * Returns a function that accepts a providerId and returns its available models
   */
  const getModelsForProvider = useMemo(() => {
    return (providerId: ProviderId): string[] => {
      const defaultModels = getDefaultModelsForProvider(providerId);
      const hidden = hiddenModels[providerId] || [];
      const custom = customModels[providerId] || [];
      const available = availableModels[providerId] || [];

      // Apple Intelligence has a fixed single model
      if (providerId === "apple") {
        return defaultModels;
      }

      // For Ollama, dynamically discovered models take precedence over defaults
      const baseModels = providerId === "ollama" && available.length > 0 
        ? available 
        : defaultModels;

      // Filter out hidden models and append custom models
      const visibleDefaults = baseModels.filter((m) => !hidden.includes(m));
      return [...visibleDefaults, ...custom];
    };
  }, [customModels, hiddenModels, availableModels]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle model selection from the context menu
   * Updates both provider and model selections with haptic feedback
   *
   * @param providerId - The selected provider
   * @param model - The selected model name
   */
  const handleModelSelect = (providerId: ProviderId, model: string) => {
    triggerPress("light");
    setSelectedProvider(providerId);
    const storedValue = getStoredModelValue(providerId, model);
    setSelectedModel(storedValue);
  };

  /**
   * Handle reset button press
   * Triggers medium intensity haptic feedback and calls the onReset callback
   */
  const handleReset = () => {
    triggerPress("medium");
    onReset();
  };

  /**
   * Toggle model thinking output capture
   */
  const handleThinkingToggle = () => {
    triggerPress("light");
    setThinkingEnabled(!thinkingEnabled);
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Determine if a specific model is currently selected
   * Accounts for provider-specific storage conventions (e.g., Apple uses "system-default")
   *
   * @param providerId - The provider to check
   * @param model - The model to check
   * @returns true if this provider/model combination is currently selected
   */
  const isModelSelected = (providerId: ProviderId, model: string): boolean => {
    if (selectedProvider !== providerId) return false;
    if (providerId === "apple") {
      return selectedModel === "system-default";
    }
    return selectedModel === model;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Host style={{}}>
      {/* Root context menu container */}
      <ContextMenu>
        {/* Context menu content section containing all menu items */}
        <ContextMenu.Items>
          {/* ====================================================================
              RESET BUTTON SECTION
              ==================================================================== */}

          {/* Button to reset the current chat session */}
          <Button systemImage="arrow.clockwise" onPress={handleReset}>
            Reset Chat
          </Button>

          {/* Button to toggle model thinking output capture */}
          <Button
            systemImage={thinkingEnabled ? "checkmark" : undefined}
            onPress={handleThinkingToggle}
          >
            Thinking Output
          </Button>

          {/* ====================================================================
              PROVIDER & MODEL SELECTION SECTION
              ==================================================================== */}

          {/* Map over all available providers and create submenus for each */}
          {providers.map((providerId) => {
            const info = PROVIDERS[providerId];
            const configured = isProviderConfigured(providerId);
            const models = getModelsForProvider(providerId);
            const isCurrentProvider = selectedProvider === providerId;
            const providerLabel = configured
              ? info.name
              : `${info.name} (Not configured)`;

            return (
              // Submenu for each provider with a checkmark on active selection
              <Submenu
                key={providerId}
                button={
                  <Button
                    systemImage={isCurrentProvider ? "checkmark" : undefined}
                  >
                    {providerLabel}
                  </Button>
                }
              >
                {/* List of models for the current provider */}
                {models.map((model) => (
                  // Each model as a selectable button with checkmark indicator
                  <Button
                    key={model}
                    systemImage={isModelSelected(providerId, model) ? "checkmark" : undefined}
                    onPress={() => handleModelSelect(providerId, model)}
                  >
                    {model}
                  </Button>
                ))}
              </Submenu>
            );
          })}
        </ContextMenu.Items>

        {/* ====================================================================
            TRIGGER SECTION
            ==================================================================== */}

        {/* Context menu trigger button - displays as ellipsis icon */}
        <ContextMenu.Trigger>
          <View className="pl-1.5">
            {/* Three-dot menu icon (ellipsis) in a circle */}
            <SymbolView
              name="ellipsis.circle"
              size={22}
              tintColor={theme.colors.text}
            />
          </View>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}
