import React from "react";
import { Button as HeroUIButton, Spinner } from "heroui-native";

interface GlassButtonProps {
    title: string;
    variant?: "primary" | "secondary" | "danger";
    size?: "sm" | "md" | "lg";
    onPress?: () => void;
    disabled?: boolean;
    loading?: boolean;
    style?: any;
    testID?: string;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    title,
    variant = "primary",
    size = "md",
    onPress,
    disabled = false,
    loading = false,
    style,
    testID,
}) => {
    return (
        <HeroUIButton
            variant={variant}
            size={size}
            onPress={onPress}
            isDisabled={disabled || loading}
            style={style}
            testID={testID}
        >
            {loading ? <Spinner /> : title}
        </HeroUIButton>
    );
};
