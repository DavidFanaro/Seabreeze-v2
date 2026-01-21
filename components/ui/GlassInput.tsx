import React from "react";
import { TextField as HeroUITextField } from "heroui-native";

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
    return (
        <HeroUITextField
            isDisabled={disabled}
        >
            <HeroUITextField.Label>{placeholder}</HeroUITextField.Label>
            <HeroUITextField.Input
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                multiline={multiline}
                numberOfLines={multiline ? 4 : 1}
                testID={testID}
            />
        </HeroUITextField>
    );
};
