import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { GlassView } from "expo-glass-effect";
import { ThemedMarkdown } from "./ThemedMarkdown";
import { useTheme } from "./ThemeProvider";

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
            <View style={[{ alignItems: "flex-end" }, style]}>
                <GlassView
                    isInteractive
                    style={{
                        margin: theme.spacing.xs,
                        borderRadius: theme.borderRadius.lg,
                    }}
                >
                    <Text
                        selectable
                        style={{
                            color: theme.colors.text,
                            padding: theme.spacing.sm + 4,
                        }}
                    >
                        {content}
                    </Text>
                </GlassView>
            </View>
        );
    }

    return <ThemedMarkdown content={content} />;
};
