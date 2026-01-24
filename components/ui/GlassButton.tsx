import React from "react";
import { Button as HeroUIButton, Spinner } from "heroui-native";

interface GlassButtonProps {
    title: string;
    variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "danger-soft";
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
            {loading ? (
                <Spinner color="accent-foreground" />
            ) : (
                <HeroUIButton.Label>{title}</HeroUIButton.Label>
            )}
        </HeroUIButton>
    );
};
