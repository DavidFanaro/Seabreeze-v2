import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
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
        <View style={styles.container}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
                Model
            </Text>
            <View style={styles.modelGrid}>
                {models.map((model) => {
                    const isSelected = model === selectedModel;
                    return (
                        <Pressable
                            key={model}
                            style={[
                                styles.modelButton,
                                {
                                    backgroundColor: isSelected
                                        ? theme.colors.accent
                                        : theme.colors.surface,
                                    borderColor: isSelected
                                        ? theme.colors.accent
                                        : theme.colors.border,
                                },
                            ]}
                            onPress={() => onModelSelect(model)}
                            disabled={disabled}
                        >
                            <Text
                                style={[
                                    styles.modelText,
                                    {
                                        color: isSelected
                                            ? theme.colors.surface
                                            : theme.colors.text,
                                    },
                                ]}
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

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
    },
    modelGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    modelButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        maxWidth: 150,
    },
    modelText: {
        fontSize: 13,
        fontWeight: "500",
    },
});
