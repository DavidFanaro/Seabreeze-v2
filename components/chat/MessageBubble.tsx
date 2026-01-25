/**
 * @file MessageBubble.tsx
 * @purpose Component for rendering individual chat messages with markdown support and theme awareness.
 * Handles both user and AI messages with different styling, streaming states, and markdown rendering.
 */

import React, { memo } from "react";
import { View, ViewStyle } from "react-native";
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
  ({ content, isUser, isStreaming = false, style }) => {
    // ========== Hooks Section ==========
    // Retrieve theme colors and spacing values for consistent styling across the app
    const { theme } = useTheme();
    
    // Fetch user preference for displaying line numbers in code blocks
    const showCodeLineNumbers = useSettingsStore(
      (state) => state.showCodeLineNumbers,
    );

    return (
      <View className="my-1 px-4" style={style}>
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
