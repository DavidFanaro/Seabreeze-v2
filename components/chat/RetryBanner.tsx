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
    
    // Early return: only render banner if retry is available
    if (!canRetry) return null;

    return (
        // Main container: error banner with semi-transparent error background
        // - Horizontal padding (px-4) and vertical padding (py-3) for spacing
        // - Rounded corners (rounded-md) for visual polish
        // - Margin (mx-4 mb-2) for positioning relative to parent
        // - Background uses theme error color at 20% opacity for subtle alert appearance
        <View
            className="px-4 py-3 rounded-md mx-4 mb-2"
            style={{ backgroundColor: theme.colors.error + "20" }}
        >
            {/* Content row container: flexbox layout for banner content */}
            {/* - flex-row: arranges children horizontally */}
            {/* - items-center: vertically centers all children */}
            {/* - justify-between: spaces icon and button to opposite ends */}
            {/* - gap-3: adds consistent spacing between children */}
            <View className="flex-row items-center justify-between gap-3">
                {/* Icon section: warning/error indicator */}
                {/* - Displays exclamation triangle symbol in error color */}
                {/* - Size 20px provides visual prominence without overwhelming banner */}
                {/* - Uses theme error color to reinforce error state */}
                <SymbolView name="exclamationmark.triangle" size={20} tintColor={theme.colors.error} />
                
                {/* Retry button: interactive element to retry the failed action */}
                {/* - TouchableOpacity provides visual feedback on press */}
                {/* - flex-row items-center: horizontally aligns icon and text */}
                {/* - gap-1.5: small spacing between retry text and icon */}
                <TouchableOpacity onPress={onRetry} className="flex-row items-center gap-1.5">
                    {/* Retry label text */}
                    {/* - text-[16px]: larger font size for readability */}
                    {/* - font-semibold: bold weight to emphasize action */}
                    {/* - Styled with theme accent color to indicate interactive element */}
                    <Text className="text-[16px] font-semibold" style={{ color: theme.colors.accent }}>Retry</Text>
                    
                    {/* Retry action icon: refresh/clockwise arrow */}
                    {/* - arrow.clockwise: visually communicates retry/refresh action */}
                    {/* - Size 16px complements the text size */}
                    {/* - Uses theme accent color for visual consistency with button text */}
                    <SymbolView name="arrow.clockwise" size={16} tintColor={theme.colors.accent} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
