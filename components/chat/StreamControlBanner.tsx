/**
 * @file StreamControlBanner.tsx
 * @purpose Displays stream control actions: cancel button during streaming and 'Stopped' indicator when cancelled
 * @connects-to useChat (cancel, streamState, isStreaming)
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";

interface StreamControlBannerProps {
  /**
   * Whether the stream is currently active/ongoing
   */
  isStreaming: boolean;
  /**
   * Current stream state from useStreamLifecycle
   */
  streamState: "idle" | "streaming" | "completing" | "completed" | "error" | "cancelled";
  /**
   * Callback to cancel the ongoing stream
   */
  onCancel: () => void;
  /**
   * Optional custom message for the stopped state
   */
  stoppedMessage?: string;
}

/**
 * StreamControlBanner Component
 *
 * A contextual banner that shows:
 * - A cancel button during active streaming (isStreaming=true)
 * - A "Stopped" indicator when streamState is 'cancelled'
 *
 * This helps users understand the stream status and provides
 * control over long-running AI responses.
 */
export function StreamControlBanner({
  isStreaming,
  streamState,
  onCancel,
  stoppedMessage = "Stopped",
}: StreamControlBannerProps) {
  const { theme } = useTheme();

  // Don't render if not streaming and not cancelled
  if (!isStreaming && streamState !== "cancelled") {
    return null;
  }

  // Show "Stopped" indicator when stream was cancelled
  if (streamState === "cancelled") {
    return (
      <View
        testID="stream-stopped-indicator"
        className="px-4 py-2 rounded-md mx-4 mb-2"
        style={{ backgroundColor: theme.colors.textSecondary + "20" }}
      >
        <View className="flex-row items-center justify-center gap-2">
          <SymbolView
            name="stop.fill"
            size={14}
            tintColor={theme.colors.textSecondary}
          />
          <Text
            testID="stream-stopped-text"
            className="text-sm font-medium"
            style={{ color: theme.colors.textSecondary }}
          >
            {stoppedMessage}
          </Text>
        </View>
      </View>
    );
  }

  // Show cancel button during active streaming
  return (
    <View
      testID="stream-cancel-banner"
      className="px-4 py-2 rounded-md mx-4 mb-2"
      style={{ backgroundColor: theme.colors.accent + "15" }}
    >
      <View className="flex-row items-center justify-between gap-3">
        {/* Left side: streaming indicator */}
        <View className="flex-row items-center gap-2">
          <SymbolView
            name="dot.radiowaves.left.and.right"
            size={16}
            tintColor={theme.colors.accent}
          />
          <Text
            className="text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            Streaming...
          </Text>
        </View>

        {/* Right side: cancel button */}
        <TouchableOpacity
          testID="stream-cancel-button"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel streaming"
          accessibilityHint="Stops the current response generation"
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: theme.colors.error + "20" }}
          activeOpacity={0.7}
        >
          <Text
            testID="stream-cancel-text"
            className="text-sm font-semibold"
            style={{ color: theme.colors.error }}
          >
            Cancel
          </Text>
          <SymbolView
            name="xmark"
            size={12}
            tintColor={theme.colors.error}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
