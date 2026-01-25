import React from "react";
import { View, TextInput, TouchableOpacity, ViewStyle } from "react-native";
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
 * @property {ViewStyle} [style] - Optional custom styles to merge with the container
 */
interface MessageInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
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

    return (
        // ====================================================================
        // SECTION: Container
        // ====================================================================
        // Main container view that acts as the background for the entire input area.
        // Layout: flex-row with items aligned to bottom
        // Styling: rounded corners (xl), horizontal margins, padding, and theme surface color
        <View
            className="flex-row items-end mx-4 my-2 pl-4 pr-1 py-1 rounded-xl min-h-12"
            style={[{ backgroundColor: theme.colors.surface }, style]}
        >
            {/* ================================================================
                SECTION: Text Input Field
                ================================================================
                Multi-line text input that captures user message content.
                - Flex: takes up available horizontal space (flex-1)
                - Height: expands up to 120px max, then becomes scrollable
                - Text styling: uses theme colors for text and placeholder
                - Behavior: disabled state tied to component's disabled prop
                - Content: supports multi-line text for longer messages
            */}
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
                onPress={handleSend}
                disabled={!canSend}
                activeOpacity={0.7}
                className="w-9 h-9 rounded-full justify-center items-center ml-2 self-center"
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
