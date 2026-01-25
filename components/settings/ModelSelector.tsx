import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/components";
import { ProviderId, PROVIDERS } from "@/types/provider.types";
import { useProviderStore } from "@/stores";

/**
 * @file ModelSelector.tsx
 * @purpose Model selection component for choosing AI models within a provider
 * 
 * This component renders a grid of selectable model buttons for a specific provider.
 * It displays both dynamically fetched models and fallback to default models.
 * Features include selection highlighting, disabled state, and responsive layout.
 */

interface ModelSelectorProps {
    /** The provider ID to display models for (e.g., 'openai', 'apple', 'openrouter') */
    providerId: ProviderId;
    /** Currently selected model name */
    selectedModel: string;
    /** Callback function when a model is selected */
    onModelSelect: (model: string) => void;
    /** Whether the entire selector should be disabled */
    disabled?: boolean;
}

export function ModelSelector({
    providerId,
    selectedModel,
    onModelSelect,
    disabled = false,
}: ModelSelectorProps) {
    const { theme } = useTheme();
    const { availableModels } = useProviderStore();

    // Model list derivation - uses available models from store or falls back to defaults
    const models = useMemo(() => {
        const providerModels = availableModels[providerId] || PROVIDERS[providerId].defaultModels;
        return providerModels;
    }, [availableModels, providerId]);

    return (
        // Main container with label section
        <View className="gap-2">
            {/* Section Label - identifies this as the model selection area */}
            <Text className="text-[14px] font-medium" style={{ color: theme.colors.text }}>
                Model
            </Text>
            
            {/* Model Buttons Grid - responsive row layout with wrapping */}
            <View className="flex-row flex-wrap gap-2">
                {models.map((model) => {
                    const isSelected = model === selectedModel;
                    return (
                        // Individual Model Button - interactive selection element
                        <Pressable
                            key={model}
                            className="px-3 py-2 rounded-md border max-w-[150px]"
                            style={{
                                // Dynamic styling based on selection state
                                backgroundColor: isSelected
                                    ? theme.colors.accent  // Highlighted when selected
                                    : theme.colors.surface, // Default surface color
                                borderColor: isSelected
                                    ? theme.colors.accent  // Matching border when selected
                                    : theme.colors.border, // Default border color
                            }}
                            onPress={() => onModelSelect(model)}
                            disabled={disabled}
                        >
                            {/* Model Name Display - truncated if too long */}
                            <Text
                                className="text-[13px] font-medium"
                                style={{
                                    color: isSelected
                                        ? theme.colors.surface // Contrasting text when selected
                                        : theme.colors.text,   // Default text color
                                }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {model}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
