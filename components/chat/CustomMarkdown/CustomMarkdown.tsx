import React, { useCallback, useMemo } from "react";
import { Linking, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { useTheme } from "@/components/ui/ThemeProvider";
import { coerceMessageContentToString } from "@/lib/chat-message-normalization";
import { createMarkdownStyles } from "./styles/markdownStyles";

interface CustomMarkdownProps {
    content: unknown;
    style?: ViewStyle;
    isUser?: boolean;
}

interface MarkdownErrorBoundaryState {
    hasError: boolean;
}

class MarkdownErrorBoundary extends React.Component<
    {
        children: React.ReactNode;
        fallback: React.ReactNode;
        resetKey: string;
    },
    MarkdownErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode; fallback: React.ReactNode; resetKey: string }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): MarkdownErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error("CustomMarkdown renderer error:", error);
    }

    componentDidUpdate(
        prevProps: Readonly<{ children: React.ReactNode; fallback: React.ReactNode; resetKey: string }>
    ) {
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }

        return this.props.children;
    }
}

const CustomMarkdownInner: React.FC<CustomMarkdownProps> = ({
    content,
    style,
    isUser = false,
}) => {
    const { theme } = useTheme();
    const normalizedContent = content as string;
    const markdownStyles = useMemo(() => createMarkdownStyles(theme), [theme]);

    const handleLinkPress = useCallback(async ({ url }: { url: string }) => {
        if (!url) {
            return;
        }

        try {
            const canOpenUrl = await Linking.canOpenURL(url);
            if (canOpenUrl) {
                await Linking.openURL(url);
            }
        } catch (error) {
            console.warn("Unable to open markdown link", error);
        }
    }, []);

    return (
        <View
            testID="custom-markdown-container"
            style={[styles.container, isUser ? styles.containerUser : null, style]}
        >
            <EnrichedMarkdownText
                markdown={normalizedContent}
                flavor="github"
                markdownStyle={markdownStyles}
                onLinkPress={handleLinkPress}
                allowTrailingMargin={false}
                containerStyle={isUser ? styles.markdownLayerUser : styles.markdownLayerAssistant}
            />
        </View>
    );
};

const MarkdownErrorFallback: React.FC<CustomMarkdownProps> = ({
    content,
    style,
    isUser = false,
}) => {
    const { theme } = useTheme();
    const normalizedContent = content as string;

    return (
        <View style={[styles.container, isUser ? styles.containerUser : null, style]}>
            <Text selectable style={[styles.fallbackText, { color: theme.colors.text }]}>
                {normalizedContent}
            </Text>
        </View>
    );
};

export const CustomMarkdown: React.FC<CustomMarkdownProps> = (props) => {
    const normalizedContent = useMemo(
        () => coerceMessageContentToString(props.content),
        [props.content]
    );

    return (
        <MarkdownErrorBoundary
            fallback={<MarkdownErrorFallback {...props} content={normalizedContent} />}
            resetKey={normalizedContent}
        >
            <CustomMarkdownInner {...props} content={normalizedContent} />
        </MarkdownErrorBoundary>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "relative",
        overflow: "hidden",
    },
    containerUser: {
        alignSelf: "flex-start",
    },
    markdownLayerAssistant: {
        minWidth: "100%",
    },
    markdownLayerUser: {
        alignSelf: "flex-start",
    },
    fallbackText: {
        fontSize: 16,
        lineHeight: 24,
    },
});
