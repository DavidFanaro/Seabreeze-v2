import React from "react";
import { Button as HeroUIButton, Spinner } from "heroui-native";

import { useTheme } from "@/components/ui/ThemeProvider";

interface SaveButtonProps {
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    title?: string;
    testID?: string;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
    onPress,
    loading = false,
    disabled = false,
    title = "Save",
    testID,
}) => {
    const { theme } = useTheme();
    const isInactive = disabled || loading;
    const activeLabelColor = theme.isDark
        ? theme.colors.overlayForeground
        : theme.colors.surface;

    return (
        <HeroUIButton
            variant="primary"
            size="lg"
            onPress={onPress}
            isDisabled={isInactive}
            testID={testID}
            style={{
                backgroundColor: isInactive ? theme.colors.border : theme.colors.accent,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: theme.borderRadius.md,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
                alignSelf: "stretch",
            }}
        >
            {loading ? (
                <Spinner
                    color={isInactive ? theme.colors.textSecondary : activeLabelColor}
                />
            ) : (
                <HeroUIButton.Label
                    style={{
                        color: isInactive ? theme.colors.textSecondary : activeLabelColor,
                    }}
                >
                    {title}
                </HeroUIButton.Label>
            )}
        </HeroUIButton>
    );
};
