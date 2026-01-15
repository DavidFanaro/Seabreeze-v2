import React, { useMemo } from "react";
import { View } from "react-native";
import { ContextMenu, Submenu, Host, Button } from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import { useTheme } from "./ThemeProvider";
import { useAIProviderStore, isProviderConfigured } from "@/stores/useAIStore";
import {
  ProviderId,
  PROVIDERS,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
  OLLAMA_MODELS,
} from "@/lib/types/provider-types";
import useHapticFeedback from "@/hooks/useHapticFeedback";

interface ChatContextMenuProps {
  onReset: () => void;
}

// Get default models for a provider
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

// Map display model to stored model value
const getStoredModelValue = (
  providerId: ProviderId,
  displayModel: string
): string => {
  if (providerId === "apple") {
    return "system-default";
  }
  return displayModel;
};

export function ChatContextMenu({ onReset }: ChatContextMenuProps) {
  const { theme } = useTheme();
  const { triggerPress } = useHapticFeedback();
  const {
    selectedProvider,
    selectedModel,
    customModels,
    hiddenModels,
    setSelectedProvider,
    setSelectedModel,
  } = useAIProviderStore();

  const providers: ProviderId[] = ["apple", "openai", "openrouter", "ollama"];

  // Build models list for each provider
  const getModelsForProvider = useMemo(() => {
    return (providerId: ProviderId): string[] => {
      const defaultModels = getDefaultModelsForProvider(providerId);
      const hidden = hiddenModels[providerId] || [];
      const custom = customModels[providerId] || [];

      if (providerId === "apple") {
        return defaultModels;
      }

      const visibleDefaults = defaultModels.filter((m) => !hidden.includes(m));
      return [...visibleDefaults, ...custom];
    };
  }, [customModels, hiddenModels]);

  const handleModelSelect = (providerId: ProviderId, model: string) => {
    triggerPress("light");
    setSelectedProvider(providerId);
    const storedValue = getStoredModelValue(providerId, model);
    setSelectedModel(storedValue);
  };

  const handleReset = () => {
    triggerPress("medium");
    onReset();
  };

  const isModelSelected = (providerId: ProviderId, model: string): boolean => {
    if (selectedProvider !== providerId) return false;
    if (providerId === "apple") {
      return selectedModel === "system-default";
    }
    return selectedModel === model;
  };

  return (
    <Host style={{}}>
      <ContextMenu>
        <ContextMenu.Items>
          <Button systemImage="arrow.clockwise" onPress={handleReset}>
            Reset Chat
          </Button>

          {providers.map((providerId) => {
            const info = PROVIDERS[providerId];
            const configured = isProviderConfigured(providerId);
            const models = getModelsForProvider(providerId);
            const isCurrentProvider = selectedProvider === providerId;
            const providerLabel = configured
              ? info.name
              : `${info.name} (Not configured)`;

            return (
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
                {models.map((model) => (
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
        <ContextMenu.Trigger>
          <View style={{ paddingLeft: 7 }}>
            <SymbolView
              name="ellipsis.circle"
              size={22}
              tintColor={theme.colors.text}
              style={{}}
            />
          </View>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}
