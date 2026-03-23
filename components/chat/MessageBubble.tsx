/**
 * @file MessageBubble.tsx
 * @purpose Component for rendering individual chat messages with markdown support and theme awareness.
 * Handles both user and AI messages with different styling, streaming states, and markdown rendering.
 */

import React, { memo, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import type { ModelMessage } from "ai";

import { CustomMarkdown } from "./CustomMarkdown/CustomMarkdown";
import { useTheme } from "@/components/ui/ThemeProvider";
import { parseMessageContent } from "@/lib/chat-content-parts";
import { isImageMediaType, isVideoMediaType } from "@/lib/chat-attachments";
import { withAlpha } from "@/lib/color-utils";
import type { ChatWebSearchAnnotation } from "@/types/chat.types";

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
  webSearch?: ChatWebSearchAnnotation | null;
  isError?: boolean;
  style?: ViewStyle;
}

const formatSearchSummary = (webSearch: ChatWebSearchAnnotation): string => {
  if (webSearch.status === "searching") {
    return "Searching the web";
  }

  const queryLabel = webSearch.queries.length === 1 ? "query" : "queries";
  const sourceLabel = webSearch.totalSources === 1 ? "source" : "sources";

  if (webSearch.status === "error" && webSearch.totalSources === 0) {
    return `${webSearch.queries.length} ${queryLabel} attempted`;
  }

  return `${webSearch.totalSources} ${sourceLabel} from ${webSearch.queries.length} ${queryLabel}`;
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
 * - Markdown content rendering with theme-aware styling
 * - Streaming state indication for in-progress messages
 * - Theme-aware styling with responsive width constraints
 */
export const MessageBubble: React.FC<MessageBubbleProps> = memo(
  ({ content, isUser, isStreaming = false, thinkingOutput, webSearch = null, isError = false, style }) => {
    // ========== Hooks Section ==========
    // Retrieve theme colors and spacing values for consistent styling across the app
    const { theme } = useTheme();
    
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
    const [hasAutoExpandedThinking, setHasAutoExpandedThinking] = useState(false);
    const [isWebSearchExpanded, setIsWebSearchExpanded] = useState(false);
    const [hasAutoExpandedWebSearch, setHasAutoExpandedWebSearch] = useState(false);
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
    const normalizedContent = parsedContent.text;
    const normalizedThinkingOutput = thinkingOutput?.trim() ?? "";
    const hasThinkingOutput = !isUser && normalizedThinkingOutput.length > 0;
    const hasWebSearch = !isUser && webSearch !== null && webSearch.queries.length > 0;
    const isAssistantError = !isUser && isError;
    const errorColor = theme.colors.error ?? "#dc2626";
    const errorBackgroundColor = withAlpha(errorColor, 0.14, "rgba(220, 38, 38, 0.14)");
    const latestSearchQuery = hasWebSearch ? webSearch.queries[webSearch.queries.length - 1] : null;
    const isSearchRunning = webSearch?.status === "searching";

    const toggleThinkingOutput = useCallback(() => {
      setIsThinkingExpanded((prev) => !prev);
    }, []);

    const toggleWebSearch = useCallback(() => {
      setIsWebSearchExpanded((prev) => !prev);
    }, []);

    const handleOpenSource = useCallback((url: string) => {
      void Linking.openURL(url).catch(() => undefined);
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

    useEffect(() => {
      if (hasWebSearch && isSearchRunning && !hasAutoExpandedWebSearch) {
        setIsWebSearchExpanded(true);
        setHasAutoExpandedWebSearch(true);
      }
    }, [hasAutoExpandedWebSearch, hasWebSearch, isSearchRunning]);

    useEffect(() => {
      if (hasAutoExpandedWebSearch && !isSearchRunning) {
        setIsWebSearchExpanded(false);
        setHasAutoExpandedWebSearch(false);
      }
    }, [hasAutoExpandedWebSearch, isSearchRunning]);

    return (
      <View className="my-1 px-4" style={style}>
        {hasWebSearch && webSearch ? (
          <View className="mb-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isWebSearchExpanded ? "Hide web search details" : "Show web search details"
              }
              onPress={toggleWebSearch}
              className="rounded-2xl px-3 py-3"
              style={{
                backgroundColor: theme.colors.glass ?? theme.colors.surface,
                borderColor: webSearch.status === "error"
                  ? errorColor
                  : theme.colors.border ?? theme.colors.textSecondary ?? theme.colors.text,
                borderWidth: 1,
              }}
              testID="web-search-card-toggle"
            >
              <View className="flex-row items-center justify-between">
                <View className="mr-3 flex-1">
                  <View className="flex-row items-center">
                    {isSearchRunning ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.accent}
                        testID="web-search-card-spinner"
                      />
                    ) : (
                      <Text
                        style={{
                          color: webSearch.status === "error" ? errorColor : theme.colors.accent,
                          fontSize: 12,
                          fontWeight: "700",
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                        }}
                      >
                        Web Search
                      </Text>
                    )}
                    {!isSearchRunning ? (
                      <Text
                        className="ml-2"
                        style={{
                          color: theme.colors.textSecondary ?? theme.colors.text,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {formatSearchSummary(webSearch)}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    className="mt-1"
                    style={{
                      color: theme.colors.text,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {isSearchRunning ? "Searching the web..." : formatSearchSummary(webSearch)}
                  </Text>
                  {latestSearchQuery ? (
                    <Text
                      className="mt-1"
                      style={{
                        color: theme.colors.textSecondary ?? theme.colors.text,
                        fontSize: 12,
                      }}
                    >
                      Query: {latestSearchQuery.query}
                    </Text>
                  ) : null}
                </View>

                <Text
                  style={{
                    color: theme.colors.textSecondary ?? theme.colors.text,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {isWebSearchExpanded ? "Hide" : "Show"}
                </Text>
              </View>

              {isWebSearchExpanded ? (
                <View className="mt-3 gap-3" testID="web-search-card-content">
                  {webSearch.queries.map((queryRun, queryIndex) => (
                    <View
                      key={`${queryRun.query}-${queryIndex}`}
                      className="rounded-2xl px-3 py-3"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border ?? theme.colors.textSecondary ?? theme.colors.text,
                        borderWidth: 1,
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text
                          className="mr-2 flex-1"
                          style={{
                            color: theme.colors.text,
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          {queryRun.query}
                        </Text>
                        <Text
                          style={{
                            color: queryRun.status === "error"
                              ? errorColor
                              : theme.colors.textSecondary ?? theme.colors.text,
                            fontSize: 11,
                            fontWeight: "600",
                            textTransform: "uppercase",
                          }}
                        >
                          {queryRun.status}
                        </Text>
                      </View>
                      {queryRun.error ? (
                        <Text
                          className="mt-2"
                          style={{
                            color: errorColor,
                            fontSize: 12,
                          }}
                        >
                          {queryRun.error}
                        </Text>
                      ) : null}

                      {queryRun.sources.length > 0 ? (
                        <View className="mt-2 gap-2">
                          {queryRun.sources.map((source, sourceIndex) => (
                            <Pressable
                              key={`${source.url}-${sourceIndex}`}
                              onPress={() => handleOpenSource(source.url)}
                              className="rounded-xl px-3 py-2"
                              style={{
                                backgroundColor: theme.colors.background,
                              }}
                              accessibilityRole="link"
                            >
                              <Text
                                style={{
                                  color: theme.colors.accent,
                                  fontSize: 12,
                                  fontWeight: "700",
                                }}
                                numberOfLines={2}
                              >
                                {source.title}
                              </Text>
                              {source.snippet ? (
                                <Text
                                  className="mt-1"
                                  style={{
                                    color: theme.colors.textSecondary ?? theme.colors.text,
                                    fontSize: 11,
                                  }}
                                  numberOfLines={3}
                                >
                                  {source.snippet}
                                </Text>
                              ) : null}
                              <Text
                                className="mt-1"
                                style={{
                                  color: theme.colors.textSecondary ?? theme.colors.text,
                                  fontSize: 10,
                                }}
                                numberOfLines={1}
                              >
                                {source.engine ? `${source.engine} · ` : ""}{source.url}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}
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
                <CustomMarkdown
                  content={normalizedThinkingOutput}
                  isUser={false}
                />
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
