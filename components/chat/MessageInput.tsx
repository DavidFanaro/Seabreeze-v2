import React from "react";
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ViewStyle,
    type NativeSyntheticEvent,
    type TextInputSubmitEditingEventData,
} from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import { SymbolView } from "expo-symbols";
import useHapticFeedback from "@/hooks/useHapticFeedback";
import { attachmentLabel } from "@/lib/chat-attachments";
import type { ChatAttachment, ChatSendInput } from "@/types/chat.types";

// ============================================================================
// SECTION: Props Interface
// ============================================================================
/**
 * Props interface for the MessageInput component.
 *
 * @property {string} value - The current text value of the input field
 * @property {function} onChangeText - Callback fired whenever the input text changes
 * @property {function} onSend - Callback fired when the send button is pressed
 * @property {string} [placeholder] - Placeholder text displayed when input is empty
 * @property {boolean} [disabled] - Whether the input field and send button are disabled
 * @property {boolean} [isStreaming] - Whether a response is currently streaming
 * @property {function} [onCancel] - Callback fired when the stop button is pressed during streaming
 * @property {ViewStyle} [style] - Optional custom styles to merge with the input container
 */
interface MessageInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: (input?: ChatSendInput) => void;
    attachments?: ChatAttachment[];
    onAddAttachment?: () => void;
    onRemoveAttachment?: (attachmentId: string) => void;
    placeholder?: string;
    disabled?: boolean;
    isStreaming?: boolean;
    onCancel?: () => void;
    style?: ViewStyle;
}

// ============================================================================
// SECTION: Main Component
// ============================================================================
/**
 * MessageInput Component
 *
 * A composable text input field with an integrated send button. Features include:
 * - Theme-aware styling using the app's color scheme
 * - Multi-line text support with maximum height constraint (120px)
 * - Send button that's conditionally enabled/disabled based on input content
 * - Haptic feedback on send action
 * - Accessibility support through native TextInput and TouchableOpacity
 */
export const MessageInput: React.FC<MessageInputProps> = ({
    value,
    onChangeText,
    onSend,
    attachments = [],
    onAddAttachment,
    onRemoveAttachment,
    placeholder = "Message...",
    disabled = false,
    isStreaming = false,
    onCancel,
    style,
}) => {
    // ============================================================================
    // SECTION: Hooks
    // ============================================================================
    // Access theme colors and styling for consistent UI appearance
    const { theme } = useTheme();
    // Hook for triggering haptic feedback when user interacts with the send button
    const { triggerPress } = useHapticFeedback();
    // Determine if the send button should be enabled:
    // - Only enabled if input has non-whitespace text AND component is not disabled
    const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled;

    // ============================================================================
    // SECTION: Event Handlers
    // ============================================================================
    /**
     * Handler for the send button press event.
     *
     * Behavior:
     * - Validates that the button can be pressed (non-empty input and not disabled)
     * - Triggers a light haptic feedback for user confirmation
     * - Invokes the parent component's onSend callback to handle the message
     */
    const handleSend = () => {
        if (canSend) {
            triggerPress("light");
            onSend({
                text: value,
                attachments,
            });
        }
    };

    /**
     * Handler for the stop button press during streaming.
     * Triggers haptic feedback and invokes the cancel callback.
     */
    const handleCancel = () => {
        triggerPress("light");
        onCancel?.();
    };

    const handleSubmitEditing = (
        event: NativeSyntheticEvent<TextInputSubmitEditingEventData>
    ) => {
        const submittedText = event.nativeEvent.text;
        const hasText = submittedText.trim().length > 0;
        if ((!hasText && attachments.length === 0) || disabled) {
            return;
        }

        triggerPress("light");
        if (attachments.length > 0) {
            onSend({
                text: submittedText,
                attachments,
            });
            return;
        }

        onSend(submittedText);
    };

    const handleAddAttachment = () => {
        if (!disabled) {
            triggerPress("light");
            onAddAttachment?.();
        }
    };

    const handleRemoveAttachment = (attachmentId: string) => {
        triggerPress("light");
        onRemoveAttachment?.(attachmentId);
    };

    return (
        <View
            testID="message-input-wrapper"
            className="w-full px-4 my-2"
        >
            {attachments.length > 0 ? (
                <View testID="message-input-attachments" className="flex-row flex-wrap mb-2">
                    {attachments.map((attachment) => (
                        <View
                            key={attachment.id}
                            testID="message-input-attachment-chip"
                            className="flex-row items-center rounded-full px-3 py-1 mr-2 mb-2"
                            style={{
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border ?? theme.colors.surface,
                                borderWidth: 1,
                            }}
                        >
                            <SymbolView
                                name={attachment.kind === "video" ? "video" : "photo"}
                                size={12}
                                tintColor={theme.colors.textSecondary}
                            />
                            <Text
                                className="ml-2 mr-1 text-xs max-w-[140px]"
                                style={{ color: theme.colors.text }}
                                numberOfLines={1}
                            >
                                {attachmentLabel(attachment)}
                            </Text>
                            <TouchableOpacity
                                testID={`message-input-remove-attachment-${attachment.id}`}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${attachmentLabel(attachment)}`}
                                onPress={() => handleRemoveAttachment(attachment.id)}
                                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            >
                                <SymbolView
                                    name="xmark"
                                    size={10}
                                    tintColor={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            ) : null}

            <View className="flex-row items-end w-full">
                <TouchableOpacity
                    testID="message-input-add"
                    onPress={handleAddAttachment}
                    disabled={disabled || !onAddAttachment}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Add attachment"
                    accessibilityHint="Add photos or videos"
                    accessibilityState={{ disabled: disabled || !onAddAttachment }}
                    className="w-11 h-11 rounded-full justify-center items-center mr-2"
                    style={{ backgroundColor: theme.colors.surface }}
                >
                    <SymbolView
                        name="plus"
                        size={18}
                        tintColor={theme.colors.text}
                    />
                </TouchableOpacity>

                <View
                    testID="message-input-field"
                    className="flex-1 pl-4 pr-2 py-1 rounded-xl min-h-12"
                    style={[{ backgroundColor: theme.colors.surface }, style]}
                >
                    <TextInput
                        testID="message-input-text-input"
                        className="py-2 max-h-[120px] text-base"
                        style={{ color: theme.colors.text }}
                        onChangeText={onChangeText}
                        value={value}
                        placeholder={placeholder}
                        placeholderTextColor={theme.colors.textSecondary}
                        editable={!disabled}
                        returnKeyType="send"
                        enablesReturnKeyAutomatically
                        onSubmitEditing={handleSubmitEditing}
                        multiline
                    />
                </View>

                {isStreaming ? (
                    <TouchableOpacity
                        testID="message-input-stop"
                        onPress={handleCancel}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel="Stop streaming"
                        accessibilityHint="Stops the current response generation"
                        className="w-11 h-11 rounded-full justify-center items-center ml-2"
                        style={{ backgroundColor: theme.colors.surface }}
                    >
                        <SymbolView
                            name="stop"
                            size={16}
                            tintColor={theme.colors.text}
                        />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        testID="message-input-send"
                        onPress={handleSend}
                        disabled={!canSend}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                        accessibilityHint="Sends the current message"
                        accessibilityState={{ disabled: !canSend }}
                        className="w-11 h-11 rounded-full justify-center items-center ml-2"
                        style={{ backgroundColor: canSend ? theme.colors.accent : theme.colors.surface }}
                    >
                        <SymbolView
                            name="arrow.up"
                            size={18}
                            tintColor={canSend ? theme.colors.surface : theme.colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};
