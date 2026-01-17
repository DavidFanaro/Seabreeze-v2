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
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
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
    const { theme } = useTheme();

    return (
        <View className="px-4" style={style}>
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
