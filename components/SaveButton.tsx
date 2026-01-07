import React from "react";
import {
    TouchableOpacity,
    Text,
    ViewStyle,
    ActivityIndicator,
} from "react-native";
import { useTheme } from "./ThemeProvider";

interface SaveButtonProps {
    onPress: () => void;
    title?: string;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
    onPress,
    title = "Save",
    loading = false,
    disabled = false,
    style,
}) => {
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            style={[
                {
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: disabled
                        ? theme.colors.textSecondary
                        : theme.colors.accent,
                    margin: theme.spacing.sm + 2,
                    padding: theme.spacing.sm + 2,
                    borderRadius: theme.borderRadius.lg,
                    minHeight: 44,
                },
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color="#ffffff" />
            ) : (
                <Text style={{ color: "#ffffff", fontSize: 20 }}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};
