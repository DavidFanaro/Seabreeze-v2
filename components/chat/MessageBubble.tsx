/**
 * @file MessageBubble.tsx
 * @purpose Component for rendering individual chat messages with markdown support and theme awareness.
 * Handles both user and AI messages with different styling, streaming states, and markdown rendering.
 */

import React, { memo, useCallback, useEffect, useState } from "react";
import { Pressable, Text, View, ViewStyle } from "react-native";
import { CustomMarkdown } from "./CustomMarkdown";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Props interface for MessageBubble component
 * @interface MessageBubbleProps
 * @property {string} content - The message text content to display (can include markdown)
 * @property {boolean} isUser - Flag indicating if the message is from the user (true) or AI assistant (false)
 * @property {boolean} [isStreaming=false] - Optional flag indicating if the message is currently streaming
 * @property {ViewStyle} [style] - Optional additional styles to apply to the container
 */
interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
  thinkingOutput?: string;
  style?: ViewStyle;
}

/**
 * MessageBubble component
 * 
 * Renders a chat message bubble with adaptive styling based on message source (user vs AI).
 * Memoized to prevent unnecessary re-renders when props don't change.
 * 
 * Features:
 * - User messages are right-aligned with background color
 * - AI messages are left-aligned with transparent background
 * - Markdown content rendering with optional line numbers
 * - Streaming state indication for in-progress messages
 * - Theme-aware styling with responsive width constraints
 */
export const MessageBubble: React.FC<MessageBubbleProps> = memo(
  ({ content, isUser, isStreaming = false, thinkingOutput, style }) => {
    // ========== Hooks Section ==========
    // Retrieve theme colors and spacing values for consistent styling across the app
    const { theme } = useTheme();
    
    // Fetch user preference for displaying line numbers in code blocks
    const showCodeLineNumbers = useSettingsStore(
      (state) => state.showCodeLineNumbers,
    );

    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
    const [hasAutoExpandedThinking, setHasAutoExpandedThinking] = useState(false);
    const normalizedThinkingOutput = thinkingOutput?.trim() ?? "";
    const hasThinkingOutput = !isUser && normalizedThinkingOutput.length > 0;
    const shouldDeferThinkingMarkdown = isStreaming && content.includes("```");

    const toggleThinkingOutput = useCallback(() => {
      setIsThinkingExpanded((prev) => !prev);
    }, []);

    useEffect(() => {
      if (!isUser && isStreaming && hasThinkingOutput && !hasAutoExpandedThinking) {
        setIsThinkingExpanded(true);
        setHasAutoExpandedThinking(true);
      }
    }, [hasAutoExpandedThinking, hasThinkingOutput, isStreaming, isUser]);

    useEffect(() => {
      if (hasAutoExpandedThinking && !isStreaming) {
        setIsThinkingExpanded(false);
        setHasAutoExpandedThinking(false);
      }
    }, [hasAutoExpandedThinking, isStreaming]);

    return (
      <View className="my-1 px-4" style={style}>
        {hasThinkingOutput && (
          <View className="mb-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isThinkingExpanded ? "Hide thinking output" : "Show thinking output"
              }
              onPress={toggleThinkingOutput}
              className="flex-row items-center justify-between rounded-md px-2 py-1"
              style={{
                backgroundColor: theme.colors.glass ?? theme.colors.surface,
                borderColor: theme.colors.border ?? theme.colors.textSecondary ?? theme.colors.text,
                borderWidth: 1,
              }}
              testID="thinking-output-toggle"
            >
              <Text
                style={{
                  color: theme.colors.textSecondary ?? theme.colors.text,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Thinking
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary ?? theme.colors.text,
                  fontSize: 12,
                }}
              >
                {isThinkingExpanded ? "Hide" : "Show"}
              </Text>
            </Pressable>
            {isThinkingExpanded && (
              <View
                className="mt-2 rounded-md px-3 py-2"
                style={{
                  backgroundColor: theme.colors.glass ?? theme.colors.surface,
                  borderColor: theme.colors.border ?? theme.colors.textSecondary ?? theme.colors.text,
                  borderWidth: 1,
                }}
                testID="thinking-output-content"
              >
                {shouldDeferThinkingMarkdown ? (
                  <Text
                    style={{
                      color: theme.colors.textSecondary ?? theme.colors.text,
                      fontSize: 12,
                      fontFamily: "Menlo",
                    }}
                    testID="thinking-output-content-plain"
                  >
                    {normalizedThinkingOutput}
                  </Text>
                ) : (
                  <CustomMarkdown
                    content={normalizedThinkingOutput}
                    isStreaming={isStreaming}
                    showLineNumbers={showCodeLineNumbers}
                    showCopyAll={false}
                    isUser={false}
                  />
                )}
              </View>
            )}
          </View>
        )}
        {/* ========== Outer Container Section ========== */}
        {/* Provides consistent vertical and horizontal spacing around the message bubble */}

        <View
          style={{
            /* ========== Message Bubble Container Section ========== */
            /* Dynamic container that adapts styling based on message source (user vs AI) */
            
            /* Alignment: User messages right-aligned, AI messages left-aligned */
            alignSelf: isUser ? "flex-end" : "flex-start",
            /* Width constraint: User messages max 85% width, AI messages full width for flexibility */
            maxWidth: isUser ? "85%" : "100%",
            /* Background styling: User messages have theme surface color, AI messages transparent */
            backgroundColor: isUser ? theme.colors.surface : "transparent",
            /* Rounded corners using theme spacing for consistency */
            borderRadius: theme.borderRadius.md,
            /* Vertical padding for visual spacing inside the bubble */
            paddingVertical: 4,
            /* Horizontal padding: User messages have more padding (8), AI messages minimal (2) */
            paddingHorizontal: isUser ? 8 : 2,
          }}
        >
          {/* ========== Content Rendering Section ========== */}
          {/* CustomMarkdown component handles rendering markdown content with syntax highlighting */}
          <CustomMarkdown
            content={content}
            isStreaming={isStreaming}
            showLineNumbers={showCodeLineNumbers}
            showCopyAll={!isStreaming && !isUser}
            isUser={isUser}
          />
        </View>
      </View>
    );
  },
);

/* Component display name for debugging and React DevTools inspection */
MessageBubble.displayName = "MessageBubble";
