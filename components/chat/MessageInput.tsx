import React from "react";
import { TextInput, TouchableOpacity, ViewStyle } from "react-native";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@/components/ui/ThemeProvider";
import { SymbolView } from "expo-symbols";
import useHapticFeedback from "@/hooks/useHapticFeedback";

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
    placeholder = "Message...",
    disabled = false,
    style,
}) => {
    const { theme } = useTheme();
    const { triggerPress } = useHapticFeedback();
    const canSend = value.trim().length > 0 && !disabled;

    const handleSend = () => {
        if (canSend) {
            triggerPress("light");
            onSend();
        }
    };

    return (
        <GlassView
            isInteractive
            style={[
                {
                    flexDirection: "row",
                    alignItems: "flex-end",
                    marginHorizontal: theme.spacing.md,
                    marginVertical: theme.spacing.sm,
                    paddingLeft: theme.spacing.md,
                    paddingRight: theme.spacing.xs,
                    paddingVertical: theme.spacing.xs,
                    borderRadius: theme.borderRadius.lg + 4,
                    minHeight: 48,
                },
                style,
            ]}
        >
            <TextInput
                style={{
                    flex: 1,
                    color: theme.colors.text,
                    fontSize: 16,
                    paddingVertical: theme.spacing.sm,
                    maxHeight: 120,
                    alignSelf: "center",
                }}
                onChangeText={onChangeText}
                value={value}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textSecondary}
                editable={!disabled}
                multiline
            />
            <TouchableOpacity
                onPress={handleSend}
                disabled={!canSend}
                activeOpacity={0.7}
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: canSend ? "#007AFF" : "#3A3A3C",
                    justifyContent: "center",
                    alignItems: "center",
                    marginLeft: theme.spacing.sm,
                    alignSelf: "center",
                }}
            >
                <SymbolView name="arrow.up" size={18} tintColor="#ffffff" />
            </TouchableOpacity>
        </GlassView>
    );
};
