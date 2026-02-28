/**
 * @file MessageBubble.tsx
 * @purpose Component for rendering individual chat messages with markdown support and theme awareness.
 * Handles both user and AI messages with different styling, streaming states, and markdown rendering.
 */

import React, { memo, useCallback, useEffect, useState } from "react";
import { Pressable, Text, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import type { ModelMessage } from "ai";

import { CustomMarkdown } from "./CustomMarkdown";
import { useTheme } from "@/components/ui/ThemeProvider";
import { parseMessageContent } from "@/lib/chat-content-parts";
import { normalizeMessageContentForRender } from "@/lib/chat-message-normalization";
import { isImageMediaType, isVideoMediaType } from "@/lib/chat-attachments";
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
  content: ModelMessage["content"];
  isUser: boolean;
  isStreaming?: boolean;
  thinkingOutput?: string;
  isError?: boolean;
  style?: ViewStyle;
}

const withAlpha = (color: string, alpha: number): string => {
  const normalizedAlpha = Math.min(Math.max(alpha, 0), 1);
  const trimmed = color.trim();
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
  }

  const rgbMatch = trimmed.match(/^rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
  }

  return `rgba(220, 38, 38, ${normalizedAlpha})`;
};

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
  ({ content, isUser, isStreaming = false, thinkingOutput, isError = false, style }) => {
    // ========== Hooks Section ==========
    // Retrieve theme colors and spacing values for consistent styling across the app
    const { theme } = useTheme();
    
    // Fetch user preference for displaying line numbers in code blocks
    const showCodeLineNumbers = useSettingsStore(
      (state) => state.showCodeLineNumbers,
    );

    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
    const [hasAutoExpandedThinking, setHasAutoExpandedThinking] = useState(false);
    const parsedContent = parseMessageContent(content);
    const mediaImageParts = [
      ...parsedContent.images,
      ...parsedContent.files
        .filter((filePart) => isImageMediaType(filePart.mediaType))
        .map((filePart) => ({
          uri: filePart.uri,
          mediaType: filePart.mediaType,
        })),
    ];
    const fileParts = parsedContent.files.filter(
      (filePart) => !isImageMediaType(filePart.mediaType),
    );
    const hasStructuredMedia = mediaImageParts.length > 0 || fileParts.length > 0;
    const normalizedContent = parsedContent.text.length > 0
      ? parsedContent.text
      : (hasStructuredMedia ? "" : normalizeMessageContentForRender(content));
    const normalizedThinkingOutput = thinkingOutput?.trim() ?? "";
    const hasThinkingOutput = !isUser && normalizedThinkingOutput.length > 0;
    const shouldDeferThinkingMarkdown = isStreaming && normalizedContent.includes("```");
    const isAssistantError = !isUser && isError;
    const errorColor = theme.colors.error ?? "#dc2626";
    const errorBackgroundColor = withAlpha(errorColor, 0.14);

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
          testID="message-bubble-container"
          style={{
            alignSelf: isUser ? "flex-end" : "flex-start",
            maxWidth: isUser ? "85%" : "100%",
            backgroundColor: isUser
              ? theme.colors.surface
              : (isAssistantError ? errorBackgroundColor : "transparent"),
            borderWidth: isAssistantError ? 1 : 0,
            borderColor: isAssistantError ? errorColor : "transparent",
            borderRadius: theme.borderRadius.md,
            paddingVertical: 4,
            paddingHorizontal: isUser || isAssistantError ? 8 : 2,
          }}
        >
          {/* ========== Content Rendering Section ========== */}
          {/* CustomMarkdown component handles rendering markdown content with syntax highlighting */}
          {normalizedContent.length > 0 || !hasStructuredMedia ? (
            <CustomMarkdown
              content={normalizedContent}
              isStreaming={isStreaming}
              showLineNumbers={showCodeLineNumbers}
              showCopyAll={!isStreaming && !isUser}
              isUser={isUser}
            />
          ) : null}

          {mediaImageParts.length > 0 ? (
            <View className="mt-2">
              {mediaImageParts.map((imagePart, index) => (
                <View
                  key={`${imagePart.uri}-${index}`}
                  testID="message-bubble-image"
                  className="mb-2 overflow-hidden"
                  style={{
                    borderRadius: theme.borderRadius.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border ?? theme.colors.surface,
                  }}
                >
                  <Image
                    source={{ uri: imagePart.uri }}
                    style={{ width: 220, height: 160 }}
                    contentFit="cover"
                    transition={150}
                  />
                </View>
              ))}
            </View>
          ) : null}

          {fileParts.length > 0 ? (
            <View className="mt-2">
              {fileParts.map((filePart, index) => (
                <View
                  key={`${filePart.uri}-${index}`}
                  testID="message-bubble-file"
                  className="mb-2 px-3 py-2"
                  style={{
                    borderRadius: theme.borderRadius.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border ?? theme.colors.surface,
                    backgroundColor: isUser
                      ? theme.colors.glass ?? theme.colors.surface
                      : theme.colors.surface,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {isVideoMediaType(filePart.mediaType) ? "Video attachment" : "File attachment"}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary ?? theme.colors.text,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {filePart.filename ?? filePart.mediaType}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  },
);

/* Component display name for debugging and React DevTools inspection */
MessageBubble.displayName = "MessageBubble";
