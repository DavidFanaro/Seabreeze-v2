import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useTheme } from "@/components";
import { ProviderIcon } from "@/components/ProviderIcons";
import { ProviderId, PROVIDERS } from "@/lib/types/provider-types";
import { isProviderConfigured } from "@/stores/useAIStore";

interface ProviderSelectorProps {
    selectedProvider: ProviderId;
    onProviderSelect: (provider: ProviderId) => void;
    disabled?: boolean;
}

export function ProviderSelector({
    selectedProvider,
    onProviderSelect,
    disabled = false,
}: ProviderSelectorProps) {
    const { theme } = useTheme();
    const providers: ProviderId[] = ["apple", "openai", "openrouter", "ollama"];

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: theme.colors.text }]}>AI Provider</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.providerRow}
            >
                {providers.map((providerId) => {
                    const info = PROVIDERS[providerId];
                    const isSelected = providerId === selectedProvider;
                    const configured = isProviderConfigured(providerId);
                    const isApple = providerId === "apple";

                    return (
                        <Pressable
                            key={providerId}
                            style={[
                                styles.providerButton,
                                {
                                    backgroundColor: isSelected
                                        ? theme.colors.accent
                                        : theme.colors.surface,
                                    borderColor: isSelected
                                        ? theme.colors.accent
                                        : theme.colors.border,
                                },
                            ]}
                            onPress={() => onProviderSelect(providerId)}
                            disabled={disabled}
                        >
                            <ProviderIcon
                                providerId={providerId}
                                size={20}
                                color={isSelected ? theme.colors.surface : theme.colors.text}
                            />
                            <Text
                                style={[
                                    styles.providerName,
                                    {
                                        color: isSelected
                                            ? theme.colors.surface
                                            : theme.colors.text,
                                    },
                                ]}
                            >
                                {info.name}
                            </Text>
                            {!isApple && !configured && (
                                <Text
                                    style={[
                                        styles.configBadge,
                                        {
                                            color: isSelected
                                                ? theme.colors.surface
                                                : theme.colors.textSecondary,
                                        },
                                    ]}
                                >
                                    Not configured
                                </Text>
                            )}
                            {isApple && (
                                <Text
                                    style={[
                                        styles.configBadge,
                                        {
                                            color: isSelected
                                                ? theme.colors.surface
                                                : theme.colors.accent,
                                        },
                                    ]}
                                >
                                    Default
                                </Text>
                            )}
                        </Pressable>
                    );
                })}
            </ScrollView>
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
    providerRow: {
        gap: 8,
        paddingVertical: 4,
    },
    providerButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
        minWidth: 120,
    },
    providerName: {
        fontSize: 14,
        fontWeight: "600",
        marginTop: 4,
    },
    configBadge: {
        fontSize: 11,
        marginTop: 4,
    },
});
