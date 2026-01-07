import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { GlassInput } from "./GlassInput";
import { useTheme } from "./ThemeProvider";

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
        <View style={[{ paddingHorizontal: theme.spacing.sm + 2 }, style]}>
            <Text
                style={{
                    color: theme.colors.text,
                    fontSize: 20,
                    paddingBottom: theme.spacing.xs + 1,
                }}
            >
                {label}
            </Text>
            <GlassInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                secureTextEntry={secureTextEntry}
                style={{ marginVertical: theme.spacing.xs + 1 }}
            />
        </View>
    );
};
