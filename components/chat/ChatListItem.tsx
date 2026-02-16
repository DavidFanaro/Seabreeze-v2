/**
 * @file ChatListItem.tsx
 * @purpose Renders an individual chat item in the chat list with swipe-to-delete functionality,
 * title/preview display, and timestamp formatting.
 */

import React, { useEffect, useRef, useState } from "react";
import { Text, View, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Pressable } from "react-native-gesture-handler";
import ReanimatedSwipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import Animated, { SharedValue, useAnimatedStyle, withSpring, interpolate } from "react-native-reanimated";

import { getChatTitleForDisplay } from "@/lib/chat-title";
import { useTheme } from "@/components/ui/ThemeProvider";

/** Props for the ChatListItem component */
interface ChatListItemProps {
    id: number; // Unique identifier for the chat
    title: string | null; // Display name of the chat
    preview?: string | null; // Preview of the latest message
    timestamp?: Date | null; // Last updated timestamp
    onDelete: (id: number) => void; // Callback triggered when user swipes to delete
    onOpen?: (id: number) => void; // Callback triggered when user taps to open chat
    isDeleting?: boolean; // Whether delete flow is currently in progress for this row
    isScreenFocused: boolean; // Indicates if the parent screen is currently focused
    style?: ViewStyle; // Optional custom styling
}

/** Props for the RightAction (delete button) component shown on swipe */
interface RightActionProps {
    dragX: SharedValue<number>; // Animated value tracking swipe drag distance
    onPress: () => void; // Callback when delete button is pressed
    theme: ReturnType<typeof useTheme>["theme"]; // Theme object for styling
}

/**
 * RightAction Component
 * Renders the animated delete button that appears when swiping a chat item to the left.
 * Features:
 * - Opacity animation based on swipe distance
 * - Scale animation with spring physics
 * - Press state feedback (opacity & scale changes)
 */
const RightAction: React.FC<RightActionProps> = ({ dragX, onPress, theme }) => {
    // Animate opacity and scale based on swipe distance
    // dragX ranges from 0 to -80, opacity ranges from 0 to 1
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(dragX.value, [-80, -40, 0], [1, 0.5, 0], "clamp"),
        transform: [{ scale: withSpring(1, { damping: 20, stiffness: 300 }) }],
    }));

    // Base styling for the delete button - circular with error color background
    const buttonBaseStyle = {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: theme.colors.error,
        shadowColor: theme.colors.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3, // Android shadow elevation
    };

    return (
        // Animated container for the delete button with dynamic opacity
        <Animated.View
            style={[
                animatedStyle,
                {
                    width: 52,
                    paddingRight: 8,
                    alignItems: "flex-end",
                    justifyContent: "center",
                },
            ]}
        >
            {/* Delete button with press state feedback */}
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    buttonBaseStyle,
                    {
                        // Provide visual feedback when button is pressed
                        opacity: pressed ? 0.8 : 1,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                ]}
            >
                {/* Trash icon for delete action */}
                <SymbolView name="trash" size={24} tintColor={theme.colors.surface} />
            </Pressable>
        </Animated.View>
    );
};

/**
 * ChatListItem Component
 * Displays a single chat item in a list with:
 * - Tap to navigate to chat detail
 * - Swipe left to delete with haptic feedback
 * - Formatted timestamp display (relative time format)
 * - Message preview truncated to 2 lines
 */
export const ChatListItem: React.FC<ChatListItemProps> = ({
    id,
    title,
    preview,
    timestamp,
    onDelete,
    onOpen,
    isDeleting = false,
    isScreenFocused,
    style,
}) => {
    // Retrieve current theme for consistent styling
    const { theme } = useTheme();
    // Reference to swipeable component for programmatic control
    const swipeableRef = useRef<SwipeableMethods>(null);
    // Router for navigation to chat detail screen
    const router = useRouter();
    // Track if component is currently pressed for visual feedback
    const [isPressed, setIsPressed] = useState(false);

    // Display "No messages yet" if preview is empty
    const displayPreview = preview || "No messages yet";
    const displayTitle = getChatTitleForDisplay(title);

    /**
     * Format timestamp into human-readable relative time
     * Converts to: "Just now", "5m ago", "2h ago", "Yesterday", etc.
     * Falls back to full date if older than 7 days
     */
    const displayTime = timestamp
        ? (() => {
              const now = new Date();
              const diff = now.getTime() - timestamp.getTime();
              const minutes = Math.floor(diff / 60000);
              const hours = Math.floor(minutes / 60);
              const days = Math.floor(hours / 24);

              if (minutes < 1) return "Just now";
              if (minutes < 60) return `${minutes}m ago`;
              if (hours < 24) return `${hours}h ago`;
              if (days === 1) return "Yesterday";
              if (days < 7) return `${days}d ago`;
              return timestamp.toLocaleDateString();
          })()
        : null;

    /**
     * Handle navigation to the chat detail screen
     * Resets pressed state before navigating
     */
    const handleNavigate = () => {
        if (isDeleting) {
            return;
        }

        setIsPressed(false);
        if (onOpen) {
            onOpen(id);
            return;
        }

        router.push(`/chat/${id}`);
    };

    /**
     * Close swipeable and reset pressed state when screen loses focus
     * Ensures UI state is clean when returning to this screen
     */
    useEffect(() => {
        if (!isScreenFocused) {
            swipeableRef.current?.close();
            setIsPressed(false);
        }
    }, [isScreenFocused]);

    /**
     * Render the delete button on the right side of the swipeable
     * Includes haptic feedback and swipeable close action
     */
    const renderRightActions = (_progress: SharedValue<number>, dragX: SharedValue<number>) => {
        return (
            <RightAction
                dragX={dragX}
                theme={theme}
                onPress={() => {
                    if (isDeleting) {
                        return;
                    }

                    // Trigger error haptic feedback
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    // Call parent delete handler
                    onDelete(id);
                    // Close the swipeable animation
                    swipeableRef.current?.close();
                }}
            />
        );
    };

    return (
        // OUTER CONTAINER - Vertical spacing between list items
        <View style={{ marginBottom: 10 }}>
            {/* SWIPEABLE CONTAINER - Enables left swipe to reveal delete action */}
            <ReanimatedSwipeable
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                overshootRight={false}
                friction={2}
                rightThreshold={40}
                enabled={!isDeleting} // Disable swiping while deleting
                containerStyle={{ backgroundColor: "transparent" }}
            >
                {/* MAIN TOUCHABLE AREA - Navigates to chat detail on tap */}
            <Pressable
                    testID={`chat-list-item-${id}`}
                    onPress={handleNavigate}
                    disabled={isDeleting}
                    accessibilityRole="button"
                    accessibilityLabel={`Open chat ${displayTitle}`}
                    accessibilityState={{ disabled: isDeleting }}
                    onPressIn={() => {
                        if (isDeleting) {
                            return;
                        }

                        setIsPressed(true);
                        // Haptic feedback on press for tactile response
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                    onPressOut={() => setIsPressed(false)}
                    style={[
                        style,
                        {
                            // Reduce opacity for pressed state visual feedback
                            opacity: isDeleting ? 0.45 : isPressed ? 0.6 : 1,
                            paddingHorizontal: 20,
                            paddingVertical: 8,
                            minHeight: 100,
                            justifyContent: "center",
                        },
                    ]}
                >
                    {/* CARD BACKGROUND - Rounded container with border and glass effect */}
                    <View
                        className="rounded-lg min-h-[75px] justify-center border"
                        style={{
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.glass, // Semi-transparent glass background
                            paddingHorizontal: 20,
                            paddingVertical: 14,
                        }}
                    >
                        {/* HEADER SECTION - Title and timestamp row */}
                        <View className="flex-row justify-between items-center mb-2">
                            {/* Left side: Chat title container */}
                            <View className="flex-row items-center flex-1">
                                {/* Chat title - Truncated to 1 line with bold font */}
                                <Text
                                    className="text-[16px] font-bold flex-1 mr-2 tracking-tight"
                                    style={{
                                        color: theme.colors.text,
                                        letterSpacing: -0.3, // Tighter letter spacing for better fit
                                    }}
                                    numberOfLines={1}
                                >
                                    {displayTitle}
                                </Text>
                            </View>

                            {/* Right side: Timestamp badge - Only shown if timestamp exists */}
                            {displayTime ? (
                                <Text
                                    className="text-[11px] font-medium px-1.5 py-0.5 rounded overflow-hidden"
                                    style={{
                                        color: theme.colors.textSecondary,
                                        backgroundColor: theme.colors.glass,
                                    }}
                                >
                                    {displayTime}
                                </Text>
                            ) : null}
                        </View>

                        {/* MESSAGE PREVIEW SECTION - Shows latest message excerpt */}
                        <Text
                            className="text-[14px] mt-0.5 leading-[18px]"
                            style={{ color: theme.colors.textSecondary }}
                            numberOfLines={2} // Limit to 2 lines to maintain compact layout
                        >
                            {displayPreview}
                        </Text>
                    </View>
                </Pressable>
            </ReanimatedSwipeable>
        </View>
    );
};
