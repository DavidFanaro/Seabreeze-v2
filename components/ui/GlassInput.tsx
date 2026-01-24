import React from "react";
import { TextField as HeroUITextField } from "heroui-native";

import { useTheme } from "@/components/ui/ThemeProvider";

interface GlassInputProps {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    secureTextEntry?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    disabled?: boolean;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    style?: any;
    testID?: string;
}

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
    const { theme } = useTheme();
    const inputProps: any = {
        placeholder,
        value,
        onChangeText,
        secureTextEntry,
        testID,
        placeholderTextColor: theme.colors.textSecondary,
    };

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

    if (multiline) {
        inputProps.multiline = true;
        inputProps.numberOfLines = 4;
    }

    return (
        <HeroUITextField
            isDisabled={disabled}
        >
            <HeroUITextField.Input {...inputProps} style={inputStyle} />
        </HeroUITextField>
    );
};
