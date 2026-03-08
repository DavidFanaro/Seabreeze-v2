import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Linking,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
    type ViewStyle,
} from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { useTheme } from "@/components/ui/ThemeProvider";
import { normalizeMessageContentForRender } from "@/lib/chat-message-normalization";
import { createMarkdownStyles } from "./styles";

interface CustomMarkdownProps {
    content: unknown;
    isStreaming?: boolean;
    style?: ViewStyle;
    isUser?: boolean;
    animationSurfaceColor?: string;
}

interface MarkdownErrorBoundaryState {
    hasError: boolean;
}

interface RevealRegion {
    top: number;
    height: number;
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

const APPEND_FADE_MS = 100;
const APPEND_REVEAL_START_OPACITY = 0.58;
const HEIGHT_EPSILON = 0.5;

const CustomMarkdownInner: React.FC<CustomMarkdownProps> = ({
    content,
    isStreaming = false,
    style,
    isUser = false,
    animationSurfaceColor,
}) => {
    const { theme } = useTheme();
    const normalizedContent = content as string;
    const markdownStyles = useMemo(() => createMarkdownStyles(theme), [theme]);

    const [revealRegion, setRevealRegion] = useState<RevealRegion | null>(null);

    const previousMarkdownRef = useRef(normalizedContent);
    const measuredHeightRef = useRef(0);
    const pendingRevealTopRef = useRef<number | null>(null);
    const activeRevealTopRef = useRef<number | null>(null);
    const revealOpacity = useRef(new Animated.Value(0)).current;
    const animationVersionRef = useRef(0);

    const revealOverlayColor = animationSurfaceColor
        ?? (isUser ? theme.colors.surface : theme.colors.background);

    const clearRevealAnimation = useCallback(() => {
        animationVersionRef.current += 1;
        pendingRevealTopRef.current = null;
        activeRevealTopRef.current = null;
        revealOpacity.stopAnimation();
        revealOpacity.setValue(0);
        setRevealRegion(null);
    }, [revealOpacity]);

    useLayoutEffect(() => {
        const previousMarkdown = previousMarkdownRef.current;

        if (normalizedContent === previousMarkdown) {
            return;
        }

        const isAppendOnlyUpdate =
            isStreaming
            && normalizedContent.startsWith(previousMarkdown)
            && normalizedContent.length > previousMarkdown.length;

        if (isAppendOnlyUpdate) {
            pendingRevealTopRef.current = activeRevealTopRef.current
                ?? pendingRevealTopRef.current
                ?? measuredHeightRef.current;
        } else {
            clearRevealAnimation();
        }

        previousMarkdownRef.current = normalizedContent;
    }, [clearRevealAnimation, isStreaming, normalizedContent]);

    useEffect(
        () => () => {
            clearRevealAnimation();
        },
        [clearRevealAnimation]
    );

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

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const nextHeight = event.nativeEvent.layout.height;
        measuredHeightRef.current = nextHeight;

        const revealTop = activeRevealTopRef.current ?? pendingRevealTopRef.current;
        if (revealTop === null || nextHeight <= revealTop + HEIGHT_EPSILON) {
            return;
        }

        activeRevealTopRef.current = revealTop;
        pendingRevealTopRef.current = null;
        setRevealRegion({ top: revealTop, height: nextHeight - revealTop });

        const nextAnimationVersion = animationVersionRef.current + 1;
        animationVersionRef.current = nextAnimationVersion;

        revealOpacity.stopAnimation();
        revealOpacity.setValue(APPEND_REVEAL_START_OPACITY);

        Animated.timing(revealOpacity, {
            toValue: 0,
            duration: APPEND_FADE_MS,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished && animationVersionRef.current === nextAnimationVersion) {
                activeRevealTopRef.current = null;
                setRevealRegion(null);
            }
        });
    }, [revealOpacity]);

    return (
        <View
            testID="custom-markdown-container"
            onLayout={handleLayout}
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

            {revealRegion ? (
                <Animated.View
                    pointerEvents="none"
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                        styles.revealOverlay,
                        {
                            top: revealRegion.top,
                            height: revealRegion.height,
                            backgroundColor: revealOverlayColor,
                            opacity: revealOpacity,
                        },
                    ]}
                />
            ) : null}
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
        () => normalizeMessageContentForRender(props.content),
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
    revealOverlay: {
        position: "absolute",
        left: 0,
        right: 0,
    },
    fallbackText: {
        fontSize: 16,
        lineHeight: 24,
    },
});

export default CustomMarkdown;
