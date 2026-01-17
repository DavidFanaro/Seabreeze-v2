import React from "react";
import {
    TouchableOpacity,
    Text,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
} from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import useHapticFeedback from "@/hooks/useHapticFeedback";

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
    const { triggerPress, triggerError } = useHapticFeedback();

    const handlePress = () => {
        switch (variant) {
            case "primary":
                triggerPress("medium");
                break;
            case "secondary":
                triggerPress("light");
                break;
            case "danger":
                triggerPress("heavy");
                triggerError();
                break;
        }
        onPress();
    };

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
            onPress={handlePress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            className="items-center justify-center min-h-11 py-2 px-4 rounded-lg"
            style={[{ backgroundColor: getBackgroundColor() }, style]}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text
                    className="text-base font-semibold"
                    style={[{ color: getTextColor() }, textStyle]}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};
