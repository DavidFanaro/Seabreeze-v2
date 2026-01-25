import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { GlassInput } from "../ui/GlassInput";
import { useTheme } from "@/components/ui/ThemeProvider";

/**
 * Props interface for the SettingInput component
 * Defines all the configurable properties for a settings input field
 */
interface SettingInputProps {
    /** Label text displayed above the input field */
    label: string;
    /** Current value of the input field */
    value: string;
    /** Callback function triggered when text changes */
    onChangeText: (text: string) => void;
    /** Placeholder text shown when input is empty */
    placeholder?: string;
    /** Whether to hide text for sensitive input (passwords) */
    secureTextEntry?: boolean;
    /** Text capitalization behavior for the input */
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    /** Additional styles applied to the container view */
    style?: ViewStyle;
}

export const SettingInput: React.FC<SettingInputProps> = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    autoCapitalize,
    style,
}) => {
    // Get the current theme context for styling
    const { theme } = useTheme();

    return (
        // Main container view with horizontal padding and optional custom styles
        <View className="px-4" style={style}>
            {/* 
             * Label section - Displays the field label above the input
             * Uses uppercase text with custom styling for consistency across settings
             */}
            <Text
                className="text-[13px] font-bold uppercase tracking-wide"
                style={{
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.xs + 2,
                    letterSpacing: 0.5,
                }}
            >
                {label}
            </Text>
            
            {/* 
             * Input section - The actual text input field
             * Uses GlassInput component for consistent glass morphism styling
             */}
            <GlassInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                secureTextEntry={secureTextEntry}
                autoCapitalize={autoCapitalize}
            />
        </View>
    );
};
