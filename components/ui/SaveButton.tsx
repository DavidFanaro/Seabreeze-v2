import React from "react";
import { Button as HeroUIButton, Spinner } from "heroui-native";

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
    return (
        <HeroUIButton
            variant="primary"
            size="lg"
            onPress={onPress}
            isDisabled={disabled || loading}
            testID={testID}
        >
            {loading ? <Spinner /> : title}
        </HeroUIButton>
    );
};
