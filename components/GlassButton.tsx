import React from "react";
import {
    TouchableOpacity,
    Text,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
} from "react-native";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "./ThemeProvider";

interface GlassButtonProps {
    title: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    title,
    onPress,
    variant = "primary",
    disabled = false,
    loading = false,
    style,
    textStyle,
}) => {
    const { theme } = useTheme();

    const getBackgroundColor = () => {
        if (disabled) return theme.colors.surface;
        switch (variant) {
            case "primary":
                return theme.colors.accent;
            case "secondary":
                return "transparent";
            case "danger":
                return theme.colors.error;
            default:
                return theme.colors.accent;
        }
    };

    const getTextColor = () => {
        if (disabled) return theme.colors.textSecondary;
        switch (variant) {
            case "secondary":
                return theme.colors.accent;
            default:
                return "#ffffff";
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            <GlassView
                isInteractive
                style={[
                    {
                        backgroundColor: getBackgroundColor(),
                        paddingVertical: theme.spacing.sm,
                        paddingHorizontal: theme.spacing.md,
                        borderRadius: theme.borderRadius.lg,
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 44,
                    },
                    style,
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={getTextColor()} />
                ) : (
                    <Text
                        style={[
                            {
                                color: getTextColor(),
                                fontSize: 16,
                                fontWeight: "600",
                            },
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                )}
            </GlassView>
        </TouchableOpacity>
    );
};
