import React from "react";
import {
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { useTheme } from "@/components/ui/ThemeProvider";

interface RenameChatModalProps {
    visible: boolean;
    value: string;
    onChangeText: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}

export function RenameChatModal({
    visible,
    value,
    onChangeText,
    onClose,
    onSubmit,
}: RenameChatModalProps) {
    const { theme } = useTheme();
    const isIos = Platform.OS === "ios";

    return (
        <Modal
            animationType="fade"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={isIos ? "translate-with-padding" : "padding"}
                keyboardVerticalOffset={isIos ? -10 : 0}
                className="flex-1"
            >
                <View
                    className="flex-1 justify-center px-6"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.35)" }}
                >
                    <Pressable
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                        onPress={onClose}
                    />

                    <View
                        style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            borderWidth: 1,
                            borderRadius: 16,
                            padding: 16,
                        }}
                    >
                        <Text
                            style={{
                                color: theme.colors.text,
                                fontSize: 18,
                                fontWeight: "600",
                            }}
                        >
                            Rename Chat
                        </Text>

                        <Text
                            style={{
                                color: theme.colors.textSecondary,
                                fontSize: 14,
                                marginTop: 6,
                                marginBottom: 12,
                            }}
                        >
                            Choose a new title for this thread.
                        </Text>

                        <TextInput
                            value={value}
                            onChangeText={onChangeText}
                            placeholder="Enter chat title"
                            placeholderTextColor={theme.colors.textSecondary}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={onSubmit}
                            style={{
                                borderColor: theme.colors.border,
                                borderWidth: 1,
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: isIos ? 10 : 8,
                                color: theme.colors.text,
                                backgroundColor: theme.colors.background,
                            }}
                            maxLength={120}
                        />

                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "flex-end",
                                marginTop: 14,
                            }}
                        >
                            <Pressable
                                onPress={onClose}
                                style={{
                                    borderColor: theme.colors.border,
                                    borderWidth: 1,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                }}
                            >
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                onPress={onSubmit}
                                style={{
                                    marginLeft: 10,
                                    borderColor: theme.colors.accent,
                                    backgroundColor: theme.colors.accent,
                                    borderWidth: 1,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                }}
                            >
                                <Text style={{ color: theme.colors.surface }}>Save</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
