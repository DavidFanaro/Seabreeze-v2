import React from "react";
import { TextInput, Button, ViewStyle } from "react-native";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "./ThemeProvider";

interface MessageInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    placeholder?: string;
    disabled?: boolean;
    style?: ViewStyle;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    value,
    onChangeText,
    onSend,
    placeholder = "Type a message...",
    disabled = false,
    style,
}) => {
    const { theme } = useTheme();

    return (
        <GlassView
            isInteractive
            style={[
                {
                    flexDirection: "row",
                    marginHorizontal: theme.spacing.sm + 2,
                    padding: theme.spacing.sm + 2,
                    borderRadius: theme.borderRadius.lg,
                    marginTop: theme.spacing.sm + 2,
                },
                style,
            ]}
        >
            <TextInput
                style={{
                    flexGrow: 1,
                    flexShrink: 1,
                    color: theme.colors.text,
                }}
                onChangeText={onChangeText}
                value={value}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textSecondary}
                editable={!disabled}
            />
            <Button onPress={onSend} title="Send" disabled={disabled} />
        </GlassView>
    );
};
