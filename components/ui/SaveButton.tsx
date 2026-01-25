/**
 * @file SaveButton.tsx
 * @purpose Reusable save button component with loading states and theme support
 */

import React from "react";
import { Button as HeroUIButton, Spinner } from "heroui-native";

import { useTheme } from "@/components/ui/ThemeProvider";

/**
 * Props for the SaveButton component
 */
interface SaveButtonProps {
    /** Callback function triggered when button is pressed */
    onPress: () => void;
    /** Whether the button is in a loading state */
    loading?: boolean;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Custom button title text */
    title?: string;
    /** Test identifier for testing purposes */
    testID?: string;
}

/**
 * SaveButton component - A themed save button with loading spinner support
 * 
 * This component provides a consistent save button UI across the application
 * with support for loading states, disabled states, and theme-aware styling.
 */
export const SaveButton: React.FC<SaveButtonProps> = ({
    onPress,
    loading = false,
    disabled = false,
    title = "Save",
    testID,
}) => {
    // ==================== THEME INTEGRATION ====================
    // Access current theme context for consistent styling
    const { theme } = useTheme();
    
    // ==================== STATE MANAGEMENT ====================
    // Combine loading and disabled states for simplified logic
    const isInactive = disabled || loading;
    
    // ==================== THEME-BASED COLOR CALCULATION ====================
    // Determine label color based on theme mode (dark/light)
    const activeLabelColor = theme.isDark
        ? theme.colors.overlayForeground  // Dark mode: use overlay foreground
        : theme.colors.surface;           // Light mode: use surface color

    // ==================== BUTTON CONTAINER ====================
    // Main button wrapper with dynamic styling based on state
    return (
        <HeroUIButton
            variant="primary"
            size="lg"
            onPress={onPress}
            isDisabled={isInactive}
            testID={testID}
            style={{
                // Dynamic background: muted when inactive, accent when active
                backgroundColor: isInactive ? theme.colors.border : theme.colors.accent,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: theme.borderRadius.md,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
                alignSelf: "stretch",
            }}
        >
            {/* ==================== BUTTON CONTENT ==================== */}
            {/* Conditional rendering: loading spinner or text label */}
            {loading ? (
                // Loading state: show spinner with appropriate color
                <Spinner
                    color={isInactive ? theme.colors.textSecondary : activeLabelColor}
                />
            ) : (
                // Normal state: show text label with theme-appropriate color
                <HeroUIButton.Label
                    style={{
                        color: isInactive ? theme.colors.textSecondary : activeLabelColor,
                    }}
                >
                    {title}
                </HeroUIButton.Label>
            )}
        </HeroUIButton>
    );
};
