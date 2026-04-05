import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Keyboard,
    Modal,
    Pressable,
    Dimensions,
    ViewStyle,
    type LayoutChangeEvent,
    type NativeSyntheticEvent,
    type TextInputSubmitEditingEventData,
} from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from "react-native-reanimated";
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
    onTakePhoto?: () => void;
    onChooseFromLibrary?: () => void;
    onRemoveAttachment?: (attachmentId: string) => void;
    placeholder?: string;
    disabled?: boolean;
    isStreaming?: boolean;
    onCancel?: () => void;
    onLayout?: (event: LayoutChangeEvent) => void;
    style?: ViewStyle;
    toolbar?: React.ReactNode;
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
 * - Animated media picker popover that emerges from the add button
 * - Haptic feedback on interactions
 * - Accessibility support through native TextInput and TouchableOpacity
 */
export const MessageInput: React.FC<MessageInputProps> = ({
    value,
    onChangeText,
    onSend,
    attachments = [],
    onTakePhoto,
    onChooseFromLibrary,
    onRemoveAttachment,
    placeholder = "Message...",
    disabled = false,
    isStreaming = false,
    onCancel,
    onLayout,
    style,
    toolbar,
}) => {
    // ============================================================================
    // SECTION: Hooks & State
    // ============================================================================
    const { theme } = useTheme();
    const { triggerPress } = useHapticFeedback();
    const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled;

    // Media menu popover state
    const [showMediaMenu, setShowMediaMenu] = useState(false);
    const hasMediaCallbacks = !!(onTakePhoto || onChooseFromLibrary);

    // Anchor position for the popover modal
    const addButtonRef = useRef<View>(null);
    const pendingMediaActionRef = useRef<(() => void) | null>(null);
    const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

    const measureAnchor = useCallback((onMeasured?: () => void) => {
        if (!addButtonRef.current?.measureInWindow) {
            onMeasured?.();
            return;
        }

        addButtonRef.current.measureInWindow((x, y) => {
            setPopoverAnchor({ x, y });
            onMeasured?.();
        });
    }, []);

    // Animated rotation for the "+" icon (rotates 45deg to become "x" when open)
    const menuRotation = useSharedValue(0);

    useEffect(() => {
        menuRotation.value = withTiming(showMediaMenu ? 1 : 0, {
            duration: 150,
            easing: Easing.out(Easing.ease),
        });
    }, [showMediaMenu, menuRotation]);

    // Close the popover when the input becomes disabled
    useEffect(() => {
        if (disabled) {
            pendingMediaActionRef.current = null;
            setShowMediaMenu(false);
        }
    }, [disabled]);

    const flushPendingMediaAction = useCallback(() => {
        const action = pendingMediaActionRef.current;
        pendingMediaActionRef.current = null;
        action?.();
    }, []);

    useEffect(() => {
        if (showMediaMenu || !pendingMediaActionRef.current) {
            return;
        }

        const timeout = setTimeout(() => {
            flushPendingMediaAction();
        }, 0);

        return () => clearTimeout(timeout);
    }, [flushPendingMediaAction, showMediaMenu]);

    const iconAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${menuRotation.value * 45}deg` }],
    }));

    // ============================================================================
    // SECTION: Event Handlers
    // ============================================================================
    const handleSend = () => {
        if (canSend) {
            triggerPress("light");
            setShowMediaMenu(false);
            onSend({
                text: value,
                attachments,
            });
        }
    };

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
        setShowMediaMenu(false);
        if (attachments.length > 0) {
            onSend({
                text: submittedText,
                attachments,
            });
            return;
        }

        onSend(submittedText);
    };

    const toggleMediaMenu = () => {
        if (!disabled && hasMediaCallbacks) {
            triggerPress("light");
            if (!showMediaMenu) {
                Keyboard.dismiss();
                setShowMediaMenu(true);
                measureAnchor();
                return;
            }

            setShowMediaMenu(false);
        }
    };

    const closeMediaMenuAndRun = (action?: () => void) => {
        pendingMediaActionRef.current = action ?? null;
        setShowMediaMenu(false);
    };

    const handleTakePhotoPress = () => {
        triggerPress("light");
        closeMediaMenuAndRun(onTakePhoto);
    };

    const handleChooseFromLibraryPress = () => {
        triggerPress("light");
        closeMediaMenuAndRun(onChooseFromLibrary);
    };

    const handleRemoveAttachment = (attachmentId: string) => {
        triggerPress("light");
        onRemoveAttachment?.(attachmentId);
    };

    // ============================================================================
    // SECTION: Render
    // ============================================================================
    return (
        <View
            testID="message-input-wrapper"
            onLayout={onLayout}
            className="w-full px-4 my-2"
        >
            {/* Toolbar slot – rendered above input row when provided */}
            {toolbar ? (
                <View className="mb-1">
                    {toolbar}
                </View>
            ) : null}

            {/* Attachment chips */}
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

            {/* Input row */}
            <View className="flex-row items-end w-full">
                {/* "+" / "x" button with popover */}
                <View ref={addButtonRef} className="mr-2">
                    <TouchableOpacity
                        testID="message-input-add"
                        onPress={toggleMediaMenu}
                        disabled={disabled || !hasMediaCallbacks}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel={showMediaMenu ? "Close attachment menu" : "Add attachment"}
                        accessibilityHint="Add photos or videos"
                        accessibilityState={{ disabled: disabled || !hasMediaCallbacks }}
                        className="w-11 h-11 rounded-full justify-center items-center"
                        style={{ backgroundColor: theme.colors.surface }}
                    >
                        <Animated.View style={iconAnimatedStyle}>
                            <SymbolView
                                name="plus"
                                size={18}
                                tintColor={theme.colors.text}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </View>

                {/* Media picker popover — rendered in a transparent modal so taps outside dismiss it */}
                <Modal
                    visible={showMediaMenu && hasMediaCallbacks}
                    transparent
                    animationType="none"
                    onDismiss={flushPendingMediaAction}
                    onRequestClose={() => setShowMediaMenu(false)}
                >
                    {/* Full-screen dismiss layer */}
                    <Pressable
                        testID="media-menu-backdrop"
                        style={{ flex: 1 }}
                        onPress={() => setShowMediaMenu(false)}
                    />

                    {/* Popover anchored above the + button */}
                    <Animated.View
                        testID="media-menu-popover"
                        entering={FadeIn.duration(150)}
                        exiting={FadeOut.duration(100)}
                        style={{
                            position: "absolute",
                            // Fall back to a stable bottom-left placement if measurement is unavailable.
                            bottom: popoverAnchor
                                ? Dimensions.get("window").height - popoverAnchor.y + 8
                                : 116,
                            left: popoverAnchor?.x ?? 16,
                            minWidth: 220,
                            backgroundColor: theme.colors.surface,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: theme.colors.border ?? theme.colors.surface,
                            paddingVertical: 4,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 12,
                            elevation: 8,
                        }}
                    >
                            {onTakePhoto ? (
                                <TouchableOpacity
                                    testID="media-menu-take-photo"
                                    onPress={handleTakePhotoPress}
                                    activeOpacity={0.6}
                                    className="flex-row items-center px-4 py-3"
                                >
                                    <SymbolView
                                        name="camera"
                                        size={20}
                                        tintColor={theme.colors.text}
                                    />
                                    <Text
                                        className="ml-3 text-base font-medium"
                                        style={{ color: theme.colors.text }}
                                    >
                                        Take Photo
                                    </Text>
                                </TouchableOpacity>
                            ) : null}

                            {onTakePhoto && onChooseFromLibrary ? (
                                <View
                                    style={{
                                        height: 1,
                                        backgroundColor: theme.colors.border ?? theme.colors.surface,
                                        marginHorizontal: 16,
                                    }}
                                />
                            ) : null}

                            {onChooseFromLibrary ? (
                                <TouchableOpacity
                                    testID="media-menu-choose-library"
                                    onPress={handleChooseFromLibraryPress}
                                    activeOpacity={0.6}
                                    className="flex-row items-center px-4 py-3"
                                >
                                    <SymbolView
                                        name="photo.on.rectangle"
                                        size={20}
                                        tintColor={theme.colors.text}
                                    />
                                    <Text
                                        className="ml-3 text-base font-medium"
                                        style={{ color: theme.colors.text }}
                                    >
                                        Choose from Library
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                    </Animated.View>
                </Modal>

                {/* Text input */}
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
                        onFocus={() => setShowMediaMenu(false)}
                        multiline
                    />
                </View>

                {/* Send / Stop button */}
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
