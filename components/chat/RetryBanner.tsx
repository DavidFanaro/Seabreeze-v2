/**
 * @file RetryBanner.tsx
 * @purpose Displays a retry button when the last message fails to send.
 * Shows error message details and allows the user to retry the failed message.
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import { SymbolView } from "expo-symbols";

interface RetryBannerProps {
    /** Whether the retry button should be shown */
    canRetry: boolean;
    /** Callback when the user taps the retry button */
    onRetry: () => void;
    /** Error message to display (optional) */
    errorMessage?: string | null;
}

/**
 * RetryBanner Component
 *
 * A non-intrusive banner that appears when a message fails to send.
 * Provides:
 * - Visual error indication with warning icon
 * - Optional error message details
 * - Retry button to re-send the failed message
 *
 * The banner only renders when canRetry is true, keeping the UI clean
 * during normal operation.
 *
 * @example
 * ```tsx
 * <RetryBanner
 *   canRetry={true}
 *   onRetry={() => retryLastMessage()}
 *   errorMessage="Network timeout"
 * />
 * ```
 */
export const RetryBanner: React.FC<RetryBannerProps> = ({
    canRetry,
    onRetry,
    errorMessage,
}) => {
    const { theme } = useTheme();

    // Don't render anything if retry is not available
    if (!canRetry) {
        return null;
    }

    return (
        <View
            className="flex-row items-center justify-between px-4 py-3 mx-4 mb-2 rounded-lg"
            style={{
                backgroundColor: theme.colors.error + "15",
                borderWidth: 1,
                borderColor: theme.colors.error + "30",
            }}
            testID="retry-banner"
        >
            <View className="flex-row items-center gap-3 flex-1">
                {/* Icon section: warning/error indicator */}
                <SymbolView
                    name="exclamationmark.triangle"
                    size={20}
                    tintColor={theme.colors.error}
                />

                {/* Text section: error description */}
                <View className="flex-1">
                    <Text style={{ color: theme.colors.text }}>
                        Message failed to send
                    </Text>
                    {errorMessage && (
                        <Text
                            style={{
                                color: theme.colors.textSecondary,
                                fontSize: 12,
                                marginTop: 2,
                            }}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {errorMessage}
                        </Text>
                    )}
                </View>
            </View>

            {/* Retry button */}
            <TouchableOpacity
                onPress={onRetry}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-md"
                style={{
                    backgroundColor: theme.colors.error + "25",
                }}
                testID="retry-button"
            >
                <SymbolView
                    name="arrow.clockwise"
                    size={14}
                    tintColor={theme.colors.error}
                />
                <Text
                    style={{
                        color: theme.colors.error,
                        fontWeight: "600",
                        fontSize: 14,
                    }}
                >
                    Retry
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default RetryBanner;
