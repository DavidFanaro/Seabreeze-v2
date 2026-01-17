import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { ThemedMarkdown } from "./ThemedMarkdown";
import { useTheme } from "@/components/ui/ThemeProvider";

interface MessageBubbleProps {
    content: string;
    isUser: boolean;
    style?: ViewStyle;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    content,
    isUser,
    style,
}) => {
    const { theme } = useTheme();

    if (isUser) {
        return (
            <View
                className="items-end px-4 my-1"
                style={style}
            >
                <View
                    className="rounded-lg max-w-[85%]"
                    style={{ backgroundColor: theme.colors.surface }}
                >
                    <Text
                        selectable
                        className="px-4 py-3 text-base leading-[22px]"
                        style={{ color: theme.colors.text }}
                    >
                        {content}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View
            className="my-1"
            style={style}
        >
            <ThemedMarkdown content={content} />
        </View>
    );
};
