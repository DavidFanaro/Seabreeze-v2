import React from "react";
import { SymbolView } from "expo-symbols";
import { Button as HeroUIButton } from "heroui-native";

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
    color = "#007AFF",
    onPress,
    disabled = false,
    style,
}) => {
    return (
        <HeroUIButton
            variant="ghost"
            size="md"
            onPress={onPress}
            isDisabled={disabled}
            isIconOnly
        >
            <SymbolView
                name={icon as any}
                size={size}
                tintColor={color}
            />
        </HeroUIButton>
    );
};
