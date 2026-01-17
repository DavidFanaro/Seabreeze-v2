/**
 * @file RetryBanner.tsx
 * @purpose Displays retry option when AI response fails
 * @connects-to useChat (retryLastMessage, canRetry)
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";

interface RetryBannerProps {
    canRetry: boolean;
    onRetry: () => void;
    errorMessage?: string;
}

export function RetryBanner({ canRetry, onRetry, errorMessage }: RetryBannerProps) {
    const { theme } = useTheme();
    
    if (!canRetry) return null;

    return (
        <View
            className="px-4 py-3 rounded-md mx-4 mb-2"
            style={{ backgroundColor: theme.colors.error + "20" }}
        >
            <View className="flex-row items-center justify-between gap-3">
                <SymbolView name="exclamationmark.triangle" size={20} tintColor={theme.colors.error} />
                <TouchableOpacity onPress={onRetry} className="flex-row items-center gap-1.5">
                    <Text className="text-[16px] font-semibold" style={{ color: theme.colors.accent }}>Retry</Text>
                    <SymbolView name="arrow.clockwise" size={16} tintColor={theme.colors.accent} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
