import React, { useRef, useCallback } from "react";
import { FlashList } from "@shopify/flash-list";
import type { FlashListRef } from "@shopify/flash-list";
import { View, ViewStyle } from "react-native";
import { ModelMessage } from "ai";
import { MessageBubble } from "./MessageBubble";
import { useTheme } from "@/components/ui/ThemeProvider";

interface MessageListProps {
    messages: ModelMessage[];
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
    isStreaming?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
    messages,
    style,
    contentContainerStyle,
    isStreaming = false,
}) => {
    const flashListRef = useRef<FlashListRef<ModelMessage>>(null);
    const { theme } = useTheme();

    const renderItem = useCallback(({ item, index }: { item: ModelMessage; index: number }) => {
        const isLastMessage = index === messages.length -1;
        const isStreamingThisMessage = isLastMessage && item.role === "assistant" && isStreaming;

        return (
            <MessageBubble
                key={index}
                content={item.content as string}
                isUser={item.role === "user"}
                isStreaming={isStreamingThisMessage}
            />
        );
    }, [messages.length, isStreaming]);

    const keyExtractor = useCallback((item: ModelMessage, index: number) => {
        return `${item.role}-${index}-${item.content?.slice(0, 20)}`;
    }, []);

    const listEmptyComponent = useCallback(() => (
        <View className="flex-1" />
    ), []);

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
