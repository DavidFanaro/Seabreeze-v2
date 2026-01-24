/**
 * @file CodeBlock.tsx
 * @purpose Syntax-highlighted code block with copy, line numbers, and scrolling
 */

import React, { useMemo, useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import { createMarkdownStyles, createSyntaxTheme } from "../styles";
import { getLanguageDisplayName } from "../parsers";
import {
    highlightCode,
    getTokenColor,
    formatCodeForCopy,
    type HighlightedLine,
} from "../utils";
import { CopyButton } from "./CopyButton";

interface CodeBlockProps {
    code: string;
    language?: string;
    showLineNumbers?: boolean;
    isComplete?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
    code,
    language = "text",
    showLineNumbers = false,
    isComplete = true,
}) => {
    const { theme, themeType } = useTheme();
    const styles = useMemo(() => createMarkdownStyles(theme), [theme]);
    const syntaxTheme = useMemo(() => createSyntaxTheme(theme, themeType), [theme, themeType]);

    const highlightedLines = useMemo(
        () => highlightCode(code, language),
        [code, language]
    );

    const formattedCode = useMemo(
        () => formatCodeForCopy(code, language),
        [code, language]
    );

    const languageDisplay = useMemo(
        () => getLanguageDisplayName(language),
        [language]
    );

    const renderLine = useCallback(
        (line: HighlightedLine, index: number) => {
            return (
                <View
                    key={index}
                    style={{
                        flexDirection: "row",
                        minHeight: 20,
                    }}
                >
                    {showLineNumbers && (
                        <View style={styles.codeLineNumberContainer}>
                            <Text style={styles.codeLineNumber}>
                                {line.lineNumber}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.codeBlockText}>
                        {line.tokens.map((token, tokenIndex) => (
                            <Text
                                key={tokenIndex}
                                style={{
                                    color: getTokenColor(token.type, syntaxTheme),
                                    fontFamily: "Menlo",
                                }}
                            >
                                {token.content}
                            </Text>
                        ))}
                    </Text>
                </View>
            );
        },
        [showLineNumbers, styles, syntaxTheme]
    );

    return (
        <View style={styles.codeBlockContainer}>
            {/* Header with language and copy button */}
            <View style={styles.codeBlockHeader}>
                <Text style={styles.codeBlockLanguage}>
                    {languageDisplay}
                    {!isComplete && " (streaming...)"}
                </Text>
                <CopyButton content={formattedCode} size={16} />
            </View>

            {/* Code content */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={styles.codeBlockContent}
                contentContainerStyle={{ flexGrow: 1 }}
            >
                <View style={{ minWidth: "100%" }}>
                    {highlightedLines.map(renderLine)}
                </View>
            </ScrollView>
        </View>
    );
};

/**
 * Inline code component for use within text
 */
interface InlineCodeProps {
    code: string;
}

export const InlineCode: React.FC<InlineCodeProps> = ({ code }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createMarkdownStyles(theme), [theme]);

    return <Text style={styles.inlineCode}>{code}</Text>;
};
