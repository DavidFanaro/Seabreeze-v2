import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/components";
import { ProviderId, PROVIDERS } from "@/types/provider.types";
import { useProviderStore } from "@/stores";

interface ModelSelectorProps {
    providerId: ProviderId;
    selectedModel: string;
    onModelSelect: (model: string) => void;
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

    const models = useMemo(() => {
        const providerModels = availableModels[providerId] || PROVIDERS[providerId].defaultModels;
        return providerModels;
    }, [availableModels, providerId]);

    return (
        <View className="gap-2">
            <Text className="text-[14px] font-medium" style={{ color: theme.colors.text }}>
                Model
            </Text>
            <View className="flex-row flex-wrap gap-2">
                {models.map((model) => {
                    const isSelected = model === selectedModel;
                    return (
                        <Pressable
                            key={model}
                            className="px-3 py-2 rounded-md border max-w-[150px]"
                            style={{
                                backgroundColor: isSelected
                                    ? theme.colors.accent
                                    : theme.colors.surface,
                                borderColor: isSelected
                                    ? theme.colors.accent
                                    : theme.colors.border,
                            }}
                            onPress={() => onModelSelect(model)}
                            disabled={disabled}
                        >
                            <Text
                                className="text-[13px] font-medium"
                                style={{
                                    color: isSelected
                                        ? theme.colors.surface
                                        : theme.colors.text,
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
