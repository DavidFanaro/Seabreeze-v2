/**
 * @file GlassButton.tsx
 * @purpose Reusable glass morphism button component with loading states and multiple variants
 */

import React from "react";
import { Button as HeroUIButton, Spinner } from "heroui-native";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Props interface for the GlassButton component
 * Defines all configurable properties for button appearance and behavior
 */
interface GlassButtonProps {
    /** Text content displayed on the button */
    title: string;
    /** Visual style variant affecting button appearance */
    variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "danger-soft";
    /** Button size affecting padding and font size */
    size?: "sm" | "md" | "lg";
    /** Callback function triggered when button is pressed */
    onPress?: () => void;
    /** Whether button should be disabled and non-interactive */
    disabled?: boolean;
    /** Whether button should show loading spinner */
    loading?: boolean;
    /** Additional inline styles to apply to the button */
    style?: any;
    /** Test identifier for testing purposes */
    testID?: string;
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * GlassButton - A styled button component with glass morphism effects
 * 
 * Features:
 * - Multiple visual variants (primary, secondary, tertiary, ghost, danger)
 * - Three size options (sm, md, lg)
 * - Loading state with spinner
 * - Disabled state handling
 * - Fully accessible with test ID support
 */
export const GlassButton: React.FC<GlassButtonProps> = ({
    title,
    variant = "primary",
    size = "md",
    onPress,
    disabled = false,
    loading = false,
    style,
    testID,
}) => {
    // ========================================================================
    // RENDER
    // ========================================================================
    
    return (
        <HeroUIButton
            // Visual appearance settings
            variant={variant}
            size={size}
            
            // Event handlers
            onPress={onPress}
            
            // State management - disabled when explicitly disabled OR loading
            isDisabled={disabled || loading}
            
            // Custom styling and testing
            style={style}
            testID={testID}
        >
            {/* 
             * Button content section
             * Shows loading spinner when loading state is true
             * Otherwise displays the button title text
             */}
            {loading ? (
                // Loading state: show spinner in accent foreground color
                <Spinner color="accent-foreground" />
            ) : (
                // Normal state: display button title using HeroUI Label component
                <HeroUIButton.Label>{title}</HeroUIButton.Label>
            )}
        </HeroUIButton>
    );
};
