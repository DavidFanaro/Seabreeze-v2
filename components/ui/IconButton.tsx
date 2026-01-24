import React from "react";
import { SymbolView } from "expo-symbols";
import { Button as HeroUIButton } from "heroui-native";
import { useTheme } from "./ThemeProvider";

interface IconButtonProps {
    icon: string;
    size?: number;
    color?: string;
    onPress?: () => void;
    disabled?: boolean;
    style?: any;
}

export const IconButton: React.FC<IconButtonProps> = ({
    icon,
    size = 24,
    color,
    onPress,
    disabled = false,
    style,
}) => {
    const { theme } = useTheme();
    const iconColor = color ?? theme.colors.accent;

    return (
        <HeroUIButton
            variant="ghost"
            size="md"
            onPress={onPress}
            isDisabled={disabled}
            isIconOnly
            style={style}
        >
            <SymbolView
                name={icon as any}
                size={size}
                tintColor={iconColor}
            />
        </HeroUIButton>
    );
};
