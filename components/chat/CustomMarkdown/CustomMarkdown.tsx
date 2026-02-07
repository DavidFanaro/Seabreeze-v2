/**
 * @file CustomMarkdown.tsx
 * @purpose Main markdown orchestrator component with streaming support
 */

import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ViewStyle } from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import { createMarkdownStyles } from "./styles";
import {
    parseMarkdown,
    type BlockToken,
    type ParsedMarkdown,
} from "./parsers";
import { createStreamingBuffer, formatMarkdownForCopy } from "./utils";
import {
    MarkdownText,
    MarkdownHeader,
    MarkdownBlockquote,
    CodeBlock,
    ImageComponent,
    TableComponent,
    CopyButton,
} from "./components";

interface CustomMarkdownProps {
    content: string;
    isStreaming?: boolean;
    showCopyAll?: boolean;
    showLineNumbers?: boolean;
    style?: ViewStyle;
    isUser?: boolean;
}

interface MarkdownErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface MarkdownErrorBoundaryProps {
    children: React.ReactNode;
    fallback: React.ReactNode;
}

/**
 * Error Boundary for Markdown rendering
 * Catches errors during markdown parsing/rendering and shows raw text fallback
 */
class MarkdownErrorBoundary extends React.Component<
    MarkdownErrorBoundaryProps,
    MarkdownErrorBoundaryState
> {
    constructor(props: MarkdownErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): MarkdownErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log detailed error info for debugging
        console.error("[CustomMarkdown] Rendering error:", {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
        });
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

/**
 * Raw text fallback component shown when markdown rendering fails
 */
const MarkdownErrorFallback: React.FC<{ content: string; style?: ViewStyle; isUser?: boolean }> = ({
    content,
    style,
    isUser = false,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createMarkdownStyles(theme), [theme]);

    return (
        <View style={[styles.container, style]}>
            <Text style={[styles.text, { fontFamily: "monospace" }]}>
                {content}
            </Text>
            {!isUser && (
                <View
                    style={{
                        marginTop: 8,
                        padding: 8,
                        backgroundColor: theme.colors.error + "15",
                        borderRadius: 4,
                    }}
                >
                    <Text
                        style={{
                            color: theme.colors.error,
                            fontSize: 12,
                        }}
                    >
                        Note: Markdown rendering failed. Showing raw text.
                    </Text>
                </View>
            )}
        </View>
    );
};

const CustomMarkdownInner: React.FC<CustomMarkdownProps> = ({
    content,
    isStreaming = false,
    showCopyAll = true,
    showLineNumbers = false,
    style,
    isUser = false,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createMarkdownStyles(theme), [theme]);

    // Streaming buffer
    const bufferRef = useRef(createStreamingBuffer({ bufferSize: 50 }));
    const [renderedContent, setRenderedContent] = useState(content);

    // Handle streaming content
    useEffect(() => {
        if (isStreaming) {
            const result = bufferRef.current.push(content.slice(renderedContent.length));
            if (result.shouldUpdate) {
                setRenderedContent(result.renderContent);
            }
        } else {
            // Not streaming, render everything
            const finalContent = bufferRef.current.complete();
            setRenderedContent(finalContent || content);
            bufferRef.current.reset();
        }
    }, [content, isStreaming, renderedContent.length]);

    // Reset buffer when content changes significantly
    useEffect(() => {
        if (!isStreaming && content !== renderedContent) {
            setRenderedContent(content);
        }
    }, [content, isStreaming, renderedContent]);

    // Parse markdown
    const parsed = useMemo((): ParsedMarkdown => {
        return parseMarkdown(renderedContent);
    }, [renderedContent]);

    // Get plain text for copy all
    const copyAllContent = useMemo(
        () => formatMarkdownForCopy(content),
        [content]
    );

    // Render a single block
    const renderBlock = useCallback(
        (block: BlockToken, index: number): React.ReactNode => {
            switch (block.type) {
                case "header":
                    return (
                        <MarkdownHeader
                            key={index}
                            content={block.content}
                            level={block.level || 1}
                        />
                    );

                case "paragraph":
                    return (
                        <View key={index} style={styles.paragraph}>
                            <MarkdownText content={block.content} />
                        </View>
                    );

                case "codeBlock":
                    return (
                        <CodeBlock
                            key={index}
                            code={block.content}
                            language={block.language}
                            showLineNumbers={showLineNumbers}
                            isComplete={block.isComplete !== false}
                        />
                    );

                case "blockquote":
                    return (
                        <View key={index} style={styles.blockquote}>
                            <View style={styles.blockquoteBorder} />
                            <MarkdownBlockquote content={block.content} />
                        </View>
                    );

                case "unorderedList":
                    return (
                        <View key={index} style={styles.listContainer}>
                            {block.items?.map((item, itemIndex) => (
                                <View key={itemIndex} style={styles.listItem}>
                                    <Text style={styles.listBullet}>•</Text>
                                    <MarkdownText
                                        content={item.content}
                                        style={styles.listContent}
                                    />
                                </View>
                            ))}
                        </View>
                    );

                case "orderedList":
                    return (
                        <View key={index} style={styles.listContainer}>
                            {block.items?.map((item, itemIndex) => (
                                <View key={itemIndex} style={styles.listItem}>
                                    <Text style={styles.listNumber}>{itemIndex + 1}.</Text>
                                    <MarkdownText
                                        content={item.content}
                                        style={styles.listContent}
                                    />
                                </View>
                            ))}
                        </View>
                    );

                case "taskList":
                    return (
                        <View key={index} style={styles.listContainer}>
                            {block.items?.map((item, itemIndex) => (
                                <View key={itemIndex} style={styles.taskListItem}>
                                    <View
                                        style={[
                                            styles.taskCheckbox,
                                            item.checked
                                                ? styles.taskCheckboxChecked
                                                : styles.taskCheckboxUnchecked,
                                        ]}
                                    >
                                        {item.checked && (
                                            <Text style={{ color: theme.colors.surface, fontSize: 12 }}>
                                                ✓
                                            </Text>
                                        )}
                                    </View>
                                    <MarkdownText
                                        content={item.content}
                                        style={item.checked ? { ...styles.listContent, textDecorationLine: "line-through", opacity: 0.6 } : styles.listContent}
                                    />
                                </View>
                            ))}
                        </View>
                    );

                case "horizontalRule":
                    return <View key={index} style={styles.horizontalRule} />;

                case "table":
                    if (block.headers && block.rows) {
                        return (
                            <TableComponent
                                key={index}
                                headers={block.headers}
                                rows={block.rows}
                            />
                        );
                    }
                    return null;

                case "image":
                    if (block.images && block.images.length > 0) {
                        return <ImageComponent key={index} images={block.images} />;
                    }
                    return null;

                default:
                    return (
                        <View key={index} style={styles.paragraph}>
                            <MarkdownText content={block.content} />
                        </View>
                    );
            }
        },
        [styles, showLineNumbers, theme.colors.surface]
    );

    return (
        <View style={[styles.container, style]}>
            {/* Render markdown blocks */}
            {parsed.blocks.map(renderBlock)}

            {/* Copy all button - only show after streaming is complete */}
            {showCopyAll && !isStreaming && content.length > 0 && (
                <View
                    style={{
                        alignItems: "flex-end",
                        marginTop: 8,
                    }}
                >
                    <CopyButton content={copyAllContent} size={16} />
                </View>
            )}

            {/* Streaming indicator */}
            {isStreaming && parsed.hasIncompleteBlock && (
                <View style={{ marginTop: 8, opacity: 0.6 }}>
                    <Text style={[styles.text, { fontStyle: "italic" }]}>
                        ...
                    </Text>
                </View>
            )}
        </View>
    );
};

/**
 * Exported CustomMarkdown component wrapped with Error Boundary
 * Provides graceful degradation to raw text if markdown rendering fails
 */
export const CustomMarkdown: React.FC<CustomMarkdownProps> = (props) => {
    return (
        <MarkdownErrorBoundary
            fallback={
                <MarkdownErrorFallback
                    content={props.content}
                    style={props.style}
                    isUser={props.isUser}
                />
            }
        >
            <CustomMarkdownInner {...props} />
        </MarkdownErrorBoundary>
    );
};
