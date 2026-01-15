import React from "react";
import { TextInput, ViewStyle, TextStyle } from "react-native";
import { GlassView } from "expo-glass-effect";
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
        <GlassView
            isInteractive
            style={[
                {
                    borderRadius: theme.borderRadius.md,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm + 4,
                },
                style,
            ]}
        >
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
                style={[
                    {
                        color: theme.colors.text,
                        minHeight: 24,
                        fontSize: 17,
                    },
                    inputStyle,
                ]}
            />
        </GlassView>
    );
};
