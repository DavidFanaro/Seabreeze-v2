import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { GlassView } from "expo-glass-effect";
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
                style={[
                    {
                        alignItems: "flex-end",
                        paddingHorizontal: theme.spacing.md,
                        marginVertical: theme.spacing.xs,
                    },
                    style,
                ]}
            >
                <GlassView
                    isInteractive
                    style={{
                        borderRadius: theme.borderRadius.lg,
                        maxWidth: "85%",
                    }}
                >
                    <Text
                        selectable
                        style={{
                            color: theme.colors.text,
                            paddingHorizontal: theme.spacing.md,
                            paddingVertical: theme.spacing.sm + 4,
                            fontSize: 16,
                            lineHeight: 22,
                        }}
                    >
                        {content}
                    </Text>
                </GlassView>
            </View>
        );
    }

    return (
        <View
            style={[
                {
                    marginVertical: theme.spacing.xs,
                },
                style,
            ]}
        >
            <ThemedMarkdown content={content} />
        </View>
    );
};
