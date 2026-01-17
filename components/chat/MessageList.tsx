import React, { useRef, useEffect } from "react";
import { ScrollView, View, ViewStyle } from "react-native";
import { ModelMessage } from "ai";
import { MessageBubble } from "./MessageBubble";
import { useTheme } from "@/components/ui/ThemeProvider";

interface MessageListProps {
    messages: ModelMessage[];
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
}

export const MessageList: React.FC<MessageListProps> = ({
    messages,
    style,
    contentContainerStyle,
}) => {
    const scrollRef = useRef<ScrollView>(null);
    const { theme } = useTheme();

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    return (
        <ScrollView
            ref={scrollRef}
            className="flex-1"
            style={style}
            contentContainerStyle={[
                { paddingTop: 125, paddingBottom: theme.spacing.sm, flexGrow: 1 },
                contentContainerStyle,
            ]}
            onContentSizeChange={() => {
                scrollRef.current?.scrollToEnd();
            }}
            showsVerticalScrollIndicator={false}
        >
            {messages.length === 0 ? (
                <View className="flex-1" />
            ) : (
                messages.map((message, idx) => (
                    <MessageBubble
                        key={idx}
                        content={message.content as string}
                        isUser={message.role === "user"}
                    />
                ))
            )}
        </ScrollView>
    );
};
