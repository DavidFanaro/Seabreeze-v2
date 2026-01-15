/**
 * @file RetryBanner.tsx
 * @purpose Displays retry option when AI response fails
 * @connects-to useChat (retryLastMessage, canRetry)
 */

import React from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
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
        <View style={[styles.container, { backgroundColor: theme.colors.error + '20' }]}>
            <View style={styles.content}>
                <SymbolView name="exclamationmark.triangle" size={20} tintColor={theme.colors.error} />
                <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
                    <Text style={[styles.retryText, { color: theme.colors.accent }]}>Retry</Text>
                    <SymbolView name="arrow.clockwise" size={16} tintColor={theme.colors.accent} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 8,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    retryText: {
        fontSize: 16,
        fontWeight: "600",
    },
});
