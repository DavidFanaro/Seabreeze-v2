/**
 * @file MessageList.tsx
 * @purpose Renders a scrollable list of chat messages using FlashList for performance optimization.
 * Handles both user and assistant messages with streaming support for real-time responses.
 */

import React, { useRef, useCallback } from "react";
import { FlashList } from "@shopify/flash-list";
import type { FlashListRef } from "@shopify/flash-list";
import { ActivityIndicator, Text, View, ViewStyle } from "react-native";
import { ModelMessage } from "ai";
import { MessageBubble } from "./MessageBubble";
import { useTheme } from "@/components/ui/ThemeProvider";

/**
 * Props for the MessageList component
 * @property messages - Array of chat messages to display
 * @property style - Optional style applied to the FlashList container
 * @property contentContainerStyle - Optional style for the list content container
 * @property isStreaming - Flag indicating if a response is currently being streamed
 */
interface MessageListProps {
    messages: ModelMessage[];
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
    thinkingOutput?: string[];
    isStreaming?: boolean;
    isThinking?: boolean;
}

/**
 * MessageList Component
 *
 * A high-performance scrollable list of chat messages that efficiently renders large message
 * histories using FlashList. The component:
 * - Automatically scrolls to the latest message
 * - Shows streaming indicators on the most recent assistant message
 * - Optimizes re-renders through memoization and useCallback hooks
 * - Provides empty state when no messages are present
 */
export const MessageList: React.FC<MessageListProps> = ({
    messages,
    style,
    contentContainerStyle,
    thinkingOutput = [],
    isStreaming = false,
    isThinking = false,
}) => {
    // ============================================================================
    // STATE & REFS SECTION
    // ============================================================================
    // Reference to the FlashList component for potential scroll interactions
    const flashListRef = useRef<FlashListRef<ModelMessage>>(null);
    // Theme object containing spacing, colors, and other design tokens
    const { theme } = useTheme();
    const emptyStateColor = theme.colors.textSecondary ?? theme.colors.text;

    // ============================================================================
    // RENDER ITEM SECTION
    // ============================================================================
    /**
     * Renders individual message items in the list
     *
     * Determines message bubble presentation based on:
     * - Message role (user vs assistant)
     * - Position in the list (last message)
     * - Current streaming status
     *
     * The streaming state is only applied to the last message if it's from the
     * assistant to show the "typing" or animation effect.
     */
    const renderItem = useCallback(({ item, index }: { item: ModelMessage; index: number }) => {
        // Determine if this is the most recent message in the conversation
        const isLastMessage = index === messages.length - 1;
        // Only show streaming indicator for assistant's last message during active streaming
        const isStreamingThisMessage = isLastMessage && item.role === "assistant" && isStreaming;
        const messageThinkingOutput = thinkingOutput[index] ?? "";

        return (
            <MessageBubble
                key={index}
                content={item.content as string}
                isUser={item.role === "user"}
                isStreaming={isStreamingThisMessage}
                thinkingOutput={messageThinkingOutput}
            />
        );
    }, [messages.length, isStreaming, thinkingOutput]);

    // ============================================================================
    // KEY EXTRACTOR SECTION
    // ============================================================================
    /**
     * Generates unique keys for each message item to optimize list rendering
     *
     * Creates a composite key using:
     * - Message role (to distinguish user vs assistant)
     * - Index (for position identification)
     * - First 20 characters of content (for content-based identification)
     *
     * This ensures proper list item tracking and prevents rendering issues
     */
    const keyExtractor = useCallback((item: ModelMessage, index: number) => {
        return `${item.role}-${index}-${item.content?.slice(0, 20)}`;
    }, []);

    // ============================================================================
    // EMPTY STATE SECTION
    // ============================================================================
    /**
     * Renders the empty state when no messages are present
     *
     * Shows a flexible empty view that expands to fill available space,
     * providing a clean appearance before any messages are added to the chat
     */
    const isGenerating = isStreaming && !isThinking;
    const listEmptyComponent = useCallback(() => (
        <View className="flex-1 items-center justify-center" testID="message-list-empty">
            {(isThinking || isGenerating) ? (
                <View className="flex-row items-center">
                    <ActivityIndicator color={emptyStateColor} testID="message-list-loading" />
                    {isThinking && (
                        <Text
                            style={{
                                color: emptyStateColor,
                                marginLeft: theme.spacing.sm,
                                fontSize: 14,
                            }}
                            testID="message-list-thinking"
                        >
                            Thinking...
                        </Text>
                    )}
                </View>
            ) : null}
        </View>
    ), [emptyStateColor, isThinking, isGenerating, theme.spacing.sm]);

    // ============================================================================
    // LIST CONTAINER SECTION
    // ============================================================================
    /**
     * Main FlashList component that renders the message list
     *
     * Configuration details:
     * - Uses FlashList for O(1) rendering performance with large message histories
     * - Applies padding: 125px top (space for chat header), small bottom (spacing)
     * - Hides vertical scroll indicator for cleaner UI
     * - Dismisses keyboard on scroll interaction
     * - Renders messages in reverse chronological order (latest at bottom)
     */
    return (
        <FlashList
            ref={flashListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={listEmptyComponent}
            contentContainerStyle={[
                { paddingTop: 125, paddingBottom: theme.spacing.sm },
                contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            style={style}
        />
    );
};
