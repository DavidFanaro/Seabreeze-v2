import React from "react";
import { View, TextInput, TouchableOpacity, ViewStyle } from "react-native";
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
        <View
            className="flex-row items-end mx-4 my-2 pl-4 pr-1 py-1 rounded-xl min-h-12"
            style={[{ backgroundColor: theme.colors.surface }, style]}
        >
            <TextInput
                className="flex-1 py-2 max-h-[120px] self-center text-base"
                style={{ color: theme.colors.text }}
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
                className="w-9 h-9 rounded-full justify-center items-center ml-2 self-center"
                style={{ backgroundColor: canSend ? theme.colors.accent : theme.colors.surface }}
            >
                <SymbolView name="arrow.up" size={18} tintColor={canSend ? theme.colors.surface : theme.colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );
};
