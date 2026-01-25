import React from "react";
import { TextField as HeroUITextField } from "heroui-native";

import { useTheme } from "@/components/ui/ThemeProvider";

/**
 * @file GlassInput.tsx
 * @purpose Glass-styled text input component with theming support
 * 
 * This component provides a customizable text input with glass-like styling
 * that integrates with the app's theme system. It wraps HeroUI's TextField
 * component and applies consistent styling across the application.
 */

// ============================================================================
// COMPONENT INTERFACE DEFINITION
// ============================================================================

/**
 * Props interface for the GlassInput component
 * Defines all configurable properties for the text input
 */
interface GlassInputProps {
    /** Placeholder text displayed when input is empty */
    placeholder?: string;
    /** Current value of the text input */
    value: string;
    /** Callback function called when text changes */
    onChangeText: (text: string) => void;
    /** Whether to obscure text for password input */
    secureTextEntry?: boolean;
    /** Whether to allow multiple lines of text */
    multiline?: boolean;
    /** Number of lines for multiline input (deprecated, uses default) */
    numberOfLines?: number;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Auto-capitalization behavior for keyboard */
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    /** Additional styles to apply to the input */
    style?: any;
    /** Test identifier for testing purposes */
    testID?: string;
}

// ============================================================================
// MAIN COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * GlassInput - A themed text input component with glass styling
 * 
 * This component provides a consistent text input interface that integrates
 * with the app's theme system and provides glass-like visual styling.
 */
export const GlassInput: React.FC<GlassInputProps> = ({
    placeholder,
    value,
    onChangeText,
    secureTextEntry = false,
    multiline = false,
    disabled = false,
    style,
    testID,
}) => {
    // ========================================================================
    // THEME AND STYLING SETUP
    // ========================================================================
    
    /** Get current theme values from ThemeProvider context */
    const { theme } = useTheme();
    
    // ========================================================================
    // INPUT PROPS CONFIGURATION
    // ========================================================================
    
    /**
     * Core input properties that are passed to HeroUI's TextField.Input
     * Combines user props with theme-based styling for consistency
     */
    const inputProps: any = {
        placeholder,
        value,
        onChangeText,
        secureTextEntry,
        testID,
        placeholderTextColor: theme.colors.textSecondary,
    };

    // ========================================================================
    // STYLING CONFIGURATION
    // ========================================================================
    
    /**
     * Base styling for the input field
     * Combines theme values with glass-like appearance
     */
    const inputStyle = [
        {
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderRadius: theme.borderRadius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm + 2,
        },
        style,
    ];

    // ========================================================================
    // MULTILINE CONFIGURATION
    // ========================================================================
    
    /**
     * Configure multiline behavior when enabled
     * Sets multiline flag and default number of lines
     */
    if (multiline) {
        inputProps.multiline = true;
        inputProps.numberOfLines = 4;
    }

    // ========================================================================
    // COMPONENT RENDER
    // ========================================================================
    
    /**
     * Render the input using HeroUI's TextField wrapper
     * Applies disabled state and passes all configured props to Input
     */
    return (
        <HeroUITextField
            isDisabled={disabled}
        >
            <HeroUITextField.Input {...inputProps} style={inputStyle} />
        </HeroUITextField>
    );
};
