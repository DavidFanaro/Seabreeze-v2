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
    const inputProps: any = {
        placeholder,
        value,
        onChangeText,
        secureTextEntry,
        testID,
    };

    if (multiline) {
        inputProps.multiline = true;
        inputProps.numberOfLines = 4;
    }

    return (
        <HeroUITextField
            isDisabled={disabled}
            style={style}
        >
            {placeholder && <HeroUITextField.Label>{placeholder}</HeroUITextField.Label>}
            <HeroUITextField.Input {...inputProps} />
        </HeroUITextField>
    );
};
