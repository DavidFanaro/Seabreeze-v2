import React from "react";
import { TextInput, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import useHapticFeedback from "@/hooks/useHapticFeedback";

interface GlassInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    multiline?: boolean;
    style?: ViewStyle;
    inputStyle?: TextStyle;
    editable?: boolean;
}

export const GlassInput: React.FC<GlassInputProps> = ({
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    autoCapitalize = "none",
    multiline = false,
    style,
    inputStyle,
    editable = true,
}) => {
    const { theme } = useTheme();
    const { triggerPress } = useHapticFeedback();

    const handleFocus = () => {
        triggerPress("light");
    };

    return (
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            editable={editable}
            onFocus={handleFocus}
            className="rounded-md px-4 py-3 text-[17px] min-h-6"
            style={[{ color: theme.colors.text }, style]}
        />
    );
};
