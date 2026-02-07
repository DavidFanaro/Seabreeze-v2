/**
 * @file SaveErrorBanner.tsx
 * @purpose Displays save error notification with retry option
 * @description
 * Shows a banner when message saving fails, providing user-friendly error
 * messaging and a retry action. This ensures users are aware when their
 * chat history might not be persisted and gives them control to retry.
 *
 * Features:
 * - Displays user-friendly error message
 * - Provides retry button for failed save operations
 * - Non-blocking: allows continued chat even if save fails
 * - Auto-dismisses when save succeeds
 *
 * @used-by Chat screen for save error feedback
 * @connects-to useMessagePersistence (hasSaveError, userFriendlyError, triggerSave)
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";

/**
 * Props for the SaveErrorBanner component
 */
interface SaveErrorBannerProps {
    /** Whether to show the banner (true when save has failed) */
    visible: boolean;
    /** User-friendly error message to display */
    errorMessage: string | null;
    /** Callback to retry the save operation */
    onRetry: () => void;
    /** Callback to dismiss the banner */
    onDismiss?: () => void;
    /** Number of retry attempts made so far */
    attempts?: number;
}

/**
 * SaveErrorBanner - Displays save failures with retry option
 *
 * This banner appears when message persistence fails, alerting the user
 * that their chat history may not be saved. It provides a retry action
 * and remains non-blocking to allow continued chat usage.
 *
 * @example
 * ```tsx
 * <SaveErrorBanner
 *   visible={hasSaveError}
 *   errorMessage={userFriendlyError}
 *   onRetry={triggerSave}
 *   attempts={saveAttempts}
 * />
 * ```
 */
export function SaveErrorBanner({
    visible,
    errorMessage,
    onRetry,
    onDismiss,
    attempts = 0,
}: SaveErrorBannerProps) {
    const { theme } = useTheme();

    // Early return: only render if there's an error to show
    if (!visible || !errorMessage) return null;

    return (
        // Main container: error banner with semi-transparent error background
        // - Horizontal padding (px-4) and vertical padding (py-3) for comfortable spacing
        // - Rounded corners (rounded-md) for visual polish
        // - Margin (mx-4 mb-2) for positioning relative to parent
        // - Background uses theme error color at 15% opacity for subtle alert appearance
        <View
            className="px-4 py-3 rounded-md mx-4 mb-2"
            style={{ backgroundColor: theme.colors.error + "26" }}
        >
            {/* Content container: vertical layout for message and actions */}
            <View className="gap-2">
                {/* Error message row: icon + text */}
                <View className="flex-row items-start gap-3">
                    {/* Warning icon */}
                    <SymbolView
                        name="exclamationmark.triangle"
                        size={20}
                        tintColor={theme.colors.error}
                    />

                    {/* Error message text */}
                    <Text
                        className="flex-1 text-[14px]"
                        style={{ color: theme.colors.text }}
                        numberOfLines={2}
                    >
                        {errorMessage}
                        {attempts > 0 && (
                            <Text style={{ color: theme.colors.textSecondary }}>
                                {" "}
                                (Attempt {attempts}/3)
                            </Text>
                        )}
                    </Text>
                </View>

                {/* Action buttons row */}
                <View className="flex-row justify-end gap-4 pl-8">
                    {/* Dismiss button (if onDismiss provided) */}
                    {onDismiss && (
                        <TouchableOpacity onPress={onDismiss}>
                            <Text
                                className="text-[14px]"
                                style={{ color: theme.colors.textSecondary }}
                            >
                                Dismiss
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Retry button */}
                    <TouchableOpacity
                        onPress={onRetry}
                        className="flex-row items-center gap-1.5"
                    >
                        <Text
                            className="text-[14px] font-semibold"
                            style={{ color: theme.colors.accent }}
                        >
                            Retry Save
                        </Text>
                        <SymbolView
                            name="arrow.clockwise"
                            size={14}
                            tintColor={theme.colors.accent}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

export default SaveErrorBanner;
