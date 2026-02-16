/**
 * @file MessageList.tsx
 * @purpose Renders a scrollable list of chat messages using FlashList for performance optimization.
 * Handles both user and assistant messages with streaming support for real-time responses.
 */

import React, { useRef, useCallback, useEffect } from "react";
import { FlashList } from "@shopify/flash-list";
import type { FlashListRef } from "@shopify/flash-list";
import {
    ActivityIndicator,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Text,
    View,
    ViewStyle,
} from "react-native";
import { ModelMessage } from "ai";
import { MessageBubble } from "./MessageBubble";
import { useTheme } from "@/components/ui/ThemeProvider";
import { normalizeMessageContentForRender } from "@/lib/chat-message-normalization";

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

const NEAR_BOTTOM_THRESHOLD_PX = 100;
const AUTO_SCROLL_THROTTLE_MS = 100;
const TERMINAL_SETTLE_WINDOW_MS = 500;
const TERMINAL_SETTLE_DELAY_MS = 120;

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
    const isNearBottomRef = useRef(true);
    const lastAutoScrollAtRef = useRef(0);
    const previousMessageCountRef = useRef(messages.length);
    const previousLastMessageContentRef = useRef<string>(
        normalizeMessageContentForRender(messages[messages.length - 1]?.content)
    );
    const previousWasStreamingRef = useRef(isStreaming);
    const terminalSettleUntilRef = useRef(0);
    const terminalSettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

        const normalizedContent = normalizeMessageContentForRender(item.content);

        return (
            <MessageBubble
                content={normalizedContent}
                isUser={item.role === "user"}
                isStreaming={isStreamingThisMessage}
                thinkingOutput={messageThinkingOutput}
            />
        );
    }, [messages.length, isStreaming, thinkingOutput]);

    const scrollToBottom = useCallback((force = false, animated = true, bypassThrottle = false) => {
        if (!force && !isNearBottomRef.current) {
            return;
        }

        const now = Date.now();
        if (!bypassThrottle && now - lastAutoScrollAtRef.current < AUTO_SCROLL_THROTTLE_MS) {
            return;
        }

        lastAutoScrollAtRef.current = now;
        flashListRef.current?.scrollToEnd({ animated });
    }, []);

    const scheduleTerminalSettleScroll = useCallback(() => {
        if (!isNearBottomRef.current) {
            return;
        }

        terminalSettleUntilRef.current = Date.now() + TERMINAL_SETTLE_WINDOW_MS;

        if (terminalSettleTimeoutRef.current) {
            clearTimeout(terminalSettleTimeoutRef.current);
            terminalSettleTimeoutRef.current = null;
        }

        scrollToBottom(false, false, true);

        terminalSettleTimeoutRef.current = setTimeout(() => {
            terminalSettleTimeoutRef.current = null;
            scrollToBottom(false, false, true);
        }, TERMINAL_SETTLE_DELAY_MS);
    }, [scrollToBottom]);

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const {
            contentSize,
            contentOffset,
            layoutMeasurement,
        } = event.nativeEvent;

        const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
        isNearBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX;
    }, []);

    const handleContentSizeChange = useCallback(() => {
        if (Date.now() > terminalSettleUntilRef.current) {
            return;
        }

        scrollToBottom(false, false, true);
    }, [scrollToBottom]);

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        const lastMessageContent = normalizeMessageContentForRender(lastMessage?.content);
        const previousMessageCount = previousMessageCountRef.current;
        const previousLastMessageContent = previousLastMessageContentRef.current;
        const previousWasStreaming = previousWasStreamingRef.current;

        const messageCountIncreased = messages.length > previousMessageCount;
        const isNewUserMessage = messageCountIncreased && lastMessage?.role === "user";
        const isStreamingAssistantUpdate =
            isStreaming
            && lastMessage?.role === "assistant"
            && lastMessageContent !== previousLastMessageContent;
        const didStreamingEnd = previousWasStreaming && !isStreaming;

        if (isNewUserMessage) {
            scrollToBottom(true);
        } else if (isStreamingAssistantUpdate) {
            scrollToBottom();
        } else if (didStreamingEnd) {
            scrollToBottom();
            scheduleTerminalSettleScroll();
        }

        previousMessageCountRef.current = messages.length;
        previousLastMessageContentRef.current = lastMessageContent;
        previousWasStreamingRef.current = isStreaming;
    }, [messages, isStreaming, scheduleTerminalSettleScroll, scrollToBottom]);

    useEffect(() => {
        return () => {
            if (terminalSettleTimeoutRef.current) {
                clearTimeout(terminalSettleTimeoutRef.current);
                terminalSettleTimeoutRef.current = null;
            }
        };
    }, []);

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
        return `${item.role}-${index}`;
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
            extraData={isStreaming}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={listEmptyComponent}
            contentContainerStyle={[
                { paddingTop: 125, paddingBottom: theme.spacing.sm },
                contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            onScroll={handleScroll}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={16}
            style={style}
        />
    );
};
