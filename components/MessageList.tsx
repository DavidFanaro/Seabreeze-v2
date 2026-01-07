import React, { useRef, useEffect } from "react";
import { ScrollView, ViewStyle } from "react-native";
import { ModelMessage } from "ai";
import { MessageBubble } from "./MessageBubble";

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

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    return (
        <ScrollView
            ref={scrollRef}
            style={[{ flex: 1, paddingTop: 50 }, style]}
            contentContainerStyle={contentContainerStyle}
            onContentSizeChange={() => {
                scrollRef.current?.scrollToEnd();
            }}
        >
            {messages.map((message, idx) => (
                <MessageBubble
                    key={idx}
                    content={message.content as string}
                    isUser={message.role === "user"}
                />
            ))}
        </ScrollView>
    );
};
