import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useTheme } from "@/components";
import { ProviderIcon } from "@/components/ui/ProviderIcons";
import { ProviderId, PROVIDERS } from "@/types/provider.types";
import { isProviderConfigured } from "@/stores";

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
        <View className="gap-2">
            <Text className="text-[14px] font-medium" style={{ color: theme.colors.text }}>AI Provider</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 py-1"
            >
                {providers.map((providerId) => {
                    const info = PROVIDERS[providerId];
                    const isSelected = providerId === selectedProvider;
                    const configured = isProviderConfigured(providerId);
                    const isApple = providerId === "apple";

                    return (
                        <Pressable
                            key={providerId}
                            className="px-4 py-3 rounded-md border items-center min-w-[120px]"
                            style={{
                                backgroundColor: isSelected
                                    ? theme.colors.accent
                                    : theme.colors.surface,
                                borderColor: isSelected
                                    ? theme.colors.accent
                                    : theme.colors.border,
                            }}
                            onPress={() => onProviderSelect(providerId)}
                            disabled={disabled}
                        >
                            <ProviderIcon
                                providerId={providerId}
                                size={20}
                                color={isSelected ? theme.colors.surface : theme.colors.text}
                            />
                            <Text
                                className="text-[14px] font-semibold mt-1"
                                style={{
                                    color: isSelected
                                        ? theme.colors.surface
                                        : theme.colors.text,
                                }}
                            >
                                {info.name}
                            </Text>
                            {!isApple && !configured && (
                                <Text
                                    className="text-[11px] mt-1"
                                    style={{
                                        color: isSelected
                                            ? theme.colors.surface
                                            : theme.colors.textSecondary,
                                    }}
                                >
                                    Not configured
                                </Text>
                            )}
                            {isApple && (
                                <Text
                                    className="text-[11px] mt-1"
                                    style={{
                                        color: isSelected
                                            ? theme.colors.surface
                                            : theme.colors.accent,
                                    }}
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
