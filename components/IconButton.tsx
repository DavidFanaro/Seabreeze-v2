import React from "react";
import { TouchableOpacity, ViewStyle } from "react-native";
import { SymbolView } from "expo-symbols";
import { useTheme } from "./ThemeProvider";
import useHapticFeedback from "@/hooks/useHapticFeedback";

interface IconButtonProps {
    icon: string;
    onPress: () => void;
    size?: number;
    color?: string;
    style?: ViewStyle;
    disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
    icon,
    onPress,
    size = 26,
    color,
    style,
    disabled = false,
}) => {
    const { theme } = useTheme();
    const { triggerPress } = useHapticFeedback();
    const iconColor = color ?? theme.colors.text;

    const handlePress = () => {
        triggerPress("light");
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.7}
            style={[
                {
                    opacity: disabled ? 0.5 : 1,
                },
                style,
            ]}
        >
            <SymbolView
                style={{
                    width: size,
                    height: size,
                }}
                name={icon as any}
                size={size}
                tintColor={iconColor}
            />
        </TouchableOpacity>
    );
};
