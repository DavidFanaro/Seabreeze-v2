import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { GlassInput } from "../ui/GlassInput";
import { useTheme } from "@/components/ui/ThemeProvider";

interface SettingInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    style?: ViewStyle;
}

export const SettingInput: React.FC<SettingInputProps> = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    style,
}) => {
    const { theme } = useTheme();

    return (
        <View style={[{ paddingHorizontal: theme.spacing.md }, style]}>
            <Text
                style={{
                    color: theme.colors.textSecondary,
                    fontSize: 13,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: theme.spacing.xs + 2,
                }}
            >
                {label}
            </Text>
            <GlassInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                secureTextEntry={secureTextEntry}
            />
        </View>
    );
};
