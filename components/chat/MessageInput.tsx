import React from "react";
import {
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
 * @property {ViewStyle} [style] - Optional custom styles to merge with the input container
 */
interface MessageInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: (textOverride?: string) => void;
    placeholder?: string;
    disabled?: boolean;
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
    placeholder = "Message...",
    disabled = false,
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
    const canSend = value.trim().length > 0 && !disabled;

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
            onSend();
        }
    };

    const handleSubmitEditing = (
        event: NativeSyntheticEvent<TextInputSubmitEditingEventData>
    ) => {
        const submittedText = event.nativeEvent.text;
        if (submittedText.trim().length === 0 || disabled) {
            return;
        }

        triggerPress("light");
        onSend(submittedText);
    };

    return (
        // ====================================================================
        // SECTION: Layout Wrapper
        // ====================================================================
        <View
            testID="message-input-wrapper"
            className="flex-row items-end w-full px-4 my-2"
        >
            {/* ================================================================
                SECTION: Text Input Container
                ================================================================
                Visual container for the text input to keep it distinct from the
                send button. Provides surface styling and padding.
            */}
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

            {/* ================================================================
                SECTION: Send Button
                ================================================================
                Circular button that triggers the onSend callback when pressed.
                - Size: 9x9 (36x36 pixels)
                - Shape: rounded-full (circular appearance)
                - Styling:
                  * Background: accent color when enabled, surface color when disabled
                  * Icon: arrow.up symbol, color matches button state
                  * Opacity: 0.7 when pressed for visual feedback
                - State:
                  * Disabled: when input is empty or component is disabled
                  * Active: full opacity, accent background color
                - Spacing: left margin of 2 units, vertically centered
            */}
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
        </View>
    );
};
