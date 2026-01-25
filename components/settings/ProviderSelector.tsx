/**
 * @file ProviderSelector.tsx
 * @purpose UI component for selecting AI providers with configuration status indicators
 */

import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import { ProviderIcon } from "@/components/ui/ProviderIcons";
import { ProviderId, PROVIDERS } from "@/types/provider.types";
import { isProviderConfigured } from "@/stores";

// Props interface for the ProviderSelector component
interface ProviderSelectorProps {
    selectedProvider: ProviderId; // Currently selected provider ID
    onProviderSelect: (provider: ProviderId) => void; // Callback when provider is selected
    disabled?: boolean; // Whether the selector is disabled (optional)
}

export function ProviderSelector({
    selectedProvider,
    onProviderSelect,
    disabled = false,
}: ProviderSelectorProps) {
    const { theme } = useTheme();
    const providers: ProviderId[] = ["apple", "openai", "openrouter", "ollama"];

    return (
        // Main container for the provider selector with consistent spacing
        <View className="gap-2">
            {/* Section title - Label for the AI provider selection */}
            <Text className="text-[14px] font-medium" style={{ color: theme.colors.text }}>AI Provider</Text>
            {/* Horizontal scrollable container for provider options */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 py-1"
            >
                {/* Map through available providers to render selection buttons */}
                {providers.map((providerId) => {
                    // Get provider configuration details from the PROVIDERS constant
                    const info = PROVIDERS[providerId];
                    // Determine if this provider is currently selected
                    const isSelected = providerId === selectedProvider;
                    // Check if provider has been configured with required credentials
                    const configured = isProviderConfigured(providerId);
                    // Special flag for Apple provider (built-in, no configuration required)
                    const isApple = providerId === "apple";

                    return (
                        // Individual provider selection button with dynamic styling
                        <Pressable
                            key={providerId}
                            className="px-4 py-3 rounded-md border items-center min-w-[120px]"
                            style={{
                                // Dynamic background: accent color when selected, surface otherwise
                                backgroundColor: isSelected
                                    ? theme.colors.accent
                                    : theme.colors.surface,
                                // Dynamic border: matches background for visual consistency
                                borderColor: isSelected
                                    ? theme.colors.accent
                                    : theme.colors.border,
                            }}
                            onPress={() => onProviderSelect(providerId)}
                            disabled={disabled}
                        >
                            {/* Provider icon with dynamic color based on selection state */}
                            <ProviderIcon
                                providerId={providerId}
                                size={20}
                                color={isSelected ? theme.colors.surface : theme.colors.text}
                            />
                            {/* Provider name with contrasting color for readability */}
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
                            {/* Configuration status indicator for non-Apple providers */}
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
                            {/* Default indicator for Apple provider (always available) */}
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
