import React, { memo } from "react";
import { View, ViewStyle } from "react-native";
import { CustomMarkdown } from "./CustomMarkdown";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useSettingsStore } from "@/stores/useSettingsStore";

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
  style?: ViewStyle;
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(
  ({ content, isUser, isStreaming = false, style }) => {
    const { theme } = useTheme();
    const showCodeLineNumbers = useSettingsStore(
      (state) => state.showCodeLineNumbers,
    );

    return (
      <View className="my-1 px-4" style={style}>
        <View
          style={{
            alignSelf: isUser ? "flex-end" : "flex-start",
            maxWidth: isUser ? "85%" : "100%",
            backgroundColor: isUser ? theme.colors.surface : "transparent",
            borderRadius: theme.borderRadius.md,
            paddingVertical: 4,
            paddingHorizontal: isUser ? 8 : 2,
          }}
        >
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

MessageBubble.displayName = "MessageBubble";
