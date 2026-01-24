/**
 * @file MarkdownText.tsx
 * @purpose Render inline markdown formatting (bold, italic, links, etc.)
 */

import React, { useMemo, useCallback } from "react";
import { Text, TextStyle, Linking } from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import { createMarkdownStyles } from "../styles";
import { parseInlineTokens } from "../parsers";

interface MarkdownTextProps {
    content: string;
    style?: TextStyle;
    selectable?: boolean;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({
    content,
    style,
    selectable = true,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createMarkdownStyles(theme), [theme]);

    const handleLinkPress = useCallback(async (url: string) => {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            }
        } catch {
            // Handle error silently
        }
    }, []);

    const tokens = useMemo(() => parseInlineTokens(content), [content]);

    // Render all tokens in a single Text element for proper iOS text selection
    return (
        <Text style={[styles.text, style]} selectable={selectable}>
            {tokens.map((token, index) => {
                const textStyle = style ? [styles.text, style] : styles.text;

                switch (token.type) {
                    case "text":
                        return (
                            <Text key={index} style={textStyle}>
                                {token.content}
                            </Text>
                        );
                    case "bold":
                        return (
                            <Text key={index} style={[textStyle, styles.bold]}>
                                {token.content}
                            </Text>
                        );
                    case "italic":
                        return (
                            <Text key={index} style={[textStyle, styles.italic]}>
                                {token.content}
                            </Text>
                        );
                    case "boldItalic":
                        return (
                            <Text key={index} style={[textStyle, styles.bold, styles.italic]}>
                                {token.content}
                            </Text>
                        );
                    case "strikethrough":
                        return (
                            <Text key={index} style={[textStyle, styles.strikethrough]}>
                                {token.content}
                            </Text>
                        );
                    case "inlineCode":
                        return (
                            <Text key={index} style={styles.inlineCode}>
                                {token.content}
                            </Text>
                        );
                    case "link":
                        return (
                            <Text
                                key={index}
                                style={[textStyle, styles.link]}
                                onPress={() => handleLinkPress(token.href || "")}
                            >
                                {token.content}
                            </Text>
                        );
                    case "image":
                        return (
                            <Text
                                key={index}
                                style={[textStyle, styles.link]}
                                onPress={() => handleLinkPress(token.content)}
                            >
                                {token.alt || "[Image]"}
                            </Text>
                        );
                    default:
                        return (
                            <Text key={index} style={textStyle}>
                                {token.content}
                            </Text>
                        );
                }
            })}
        </Text>
    );
};

/**
 * Render a header with appropriate styling
 */
interface MarkdownHeaderProps {
    content: string;
    level: number;
    selectable?: boolean;
}

export const MarkdownHeader: React.FC<MarkdownHeaderProps> = ({
    content,
    level,
    selectable = true,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createMarkdownStyles(theme), [theme]);

    const headerStyle = useMemo((): TextStyle => {
        switch (level) {
            case 1:
                return styles.h1;
            case 2:
                return styles.h2;
            case 3:
                return styles.h3;
            case 4:
                return styles.h4;
            case 5:
                return styles.h5;
            case 6:
                return styles.h6;
            default:
                return styles.h1;
        }
    }, [level, styles]);

    // Parse inline formatting within header
    const tokens = useMemo(() => parseInlineTokens(content), [content]);

    // Render all tokens in a single Text element for proper iOS text selection
    return (
        <Text style={headerStyle} selectable={selectable}>
            {tokens.map((token, index) => {
                switch (token.type) {
                    case "bold":
                        return (
                            <Text key={index} style={[headerStyle, styles.bold]}>
                                {token.content}
                            </Text>
                        );
                    case "italic":
                        return (
                            <Text key={index} style={[headerStyle, styles.italic]}>
                                {token.content}
                            </Text>
                        );
                    case "inlineCode":
                        return (
                            <Text key={index} style={[styles.inlineCode, { fontSize: headerStyle.fontSize }]}>
                                {token.content}
                            </Text>
                        );
                    default:
                        return (
                            <Text key={index} style={headerStyle}>
                                {token.content}
                            </Text>
                        );
                }
            })}
        </Text>
    );
};

/**
 * Render a blockquote
 */
interface MarkdownBlockquoteProps {
    content: string;
    selectable?: boolean;
}

export const MarkdownBlockquote: React.FC<MarkdownBlockquoteProps> = ({
    content,
    selectable = true,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createMarkdownStyles(theme), [theme]);

    return (
        <MarkdownText content={content} style={styles.blockquoteText} selectable={selectable} />
    );
};
