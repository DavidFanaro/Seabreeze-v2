import React from "react";
import {
    TouchableOpacity,
    Text,
    ViewStyle,
    ActivityIndicator,
} from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import useHapticFeedback from "@/hooks/useHapticFeedback";

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
    const { triggerSuccess, triggerPress } = useHapticFeedback();
    const isDisabled = disabled || loading;

    const handlePress = () => {
        triggerPress("medium");
        onPress();
        triggerSuccess();
    };

    return (
        <TouchableOpacity
            className="justify-center items-center mx-4 my-2 py-3 px-6 rounded-md min-h-[50px]"
            style={[
                {
                    backgroundColor: isDisabled
                        ? theme.colors.textSecondary
                        : theme.colors.accent,
                    shadowColor: theme.colors.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDisabled ? 0 : 0.3,
                    shadowRadius: 8,
                    elevation: isDisabled ? 0 : 4,
                },
                style,
            ]}
            onPress={handlePress}
            disabled={isDisabled}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color="#ffffff" />
            ) : (
                <Text className="text-white text-[17px] font-semibold">
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};
