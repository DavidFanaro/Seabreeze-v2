import React, { useCallback, useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextStyle,
    ViewStyle,
} from "react-native";
import Markdown, { RenderRules } from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import { GlassView } from "expo-glass-effect";
import { useTheme, Theme } from "./ThemeProvider";

interface ThemedMarkdownProps {
    content: string;
}

interface CopyButtonProps {
    code: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const { theme } = useTheme();

    const handleCopy = useCallback(async () => {
        await Clipboard.setStringAsync(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [code]);

    return (
        <TouchableOpacity
            onPress={handleCopy}
            style={[
                styles.copyButton,
                {
                    backgroundColor: copied
                        ? theme.colors.accent
                        : theme.colors.surface,
                    borderColor: theme.colors.border,
                },
            ]}
            activeOpacity={0.7}
        >
            <Text
                style={[
                    styles.copyButtonText,
                    {
                        color: copied
                            ? theme.colors.surface
                            : theme.colors.textSecondary,
                    },
                ]}
            >
                {copied ? "Copied!" : "Copy"}
            </Text>
        </TouchableOpacity>
    );
};

const createMarkdownStyles = (theme: Theme): Record<string, TextStyle | ViewStyle> => ({
    body: {
        color: theme.colors.text,
        fontSize: 16,
        lineHeight: 24,
    },
    heading1: {
        color: theme.colors.text,
        fontSize: 28,
        fontWeight: "700",
        marginTop: 16,
        marginBottom: 8,
    },
    heading2: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: "600",
        marginTop: 14,
        marginBottom: 6,
    },
    heading3: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: "600",
        marginTop: 12,
        marginBottom: 4,
    },
    heading4: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: "600",
        marginTop: 10,
        marginBottom: 4,
    },
    heading5: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: "600",
        marginTop: 8,
        marginBottom: 4,
    },
    heading6: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
        marginTop: 8,
        marginBottom: 4,
    },
    paragraph: {
        marginTop: 0,
        marginBottom: 12,
    },
    strong: {
        fontWeight: "700",
    },
    em: {
        fontStyle: "italic",
    },
    s: {
        textDecorationLine: "line-through",
    },
    link: {
        color: theme.colors.accent,
        textDecorationLine: "underline",
    },
    blockquote: {
        backgroundColor: theme.colors.surface,
        borderLeftColor: theme.colors.accent,
        borderLeftWidth: 4,
        paddingLeft: 12,
        paddingVertical: 8,
        marginVertical: 8,
        borderRadius: theme.borderRadius.sm,
    },
    code_inline: {
        backgroundColor: theme.colors.surface,
        color: theme.colors.accent,
        fontFamily: "monospace",
        fontSize: 14,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    code_block: {
        backgroundColor: theme.colors.surface,
        fontFamily: "monospace",
        fontSize: 14,
        padding: 12,
        borderRadius: theme.borderRadius.md,
        marginVertical: 8,
    },
    fence: {
        backgroundColor: theme.colors.surface,
        fontFamily: "monospace",
        fontSize: 14,
        padding: 12,
        borderRadius: theme.borderRadius.md,
        marginVertical: 8,
    },
    list_item: {
        marginVertical: 4,
    },
    bullet_list: {
        marginVertical: 8,
    },
    ordered_list: {
        marginVertical: 8,
    },
    bullet_list_icon: {
        color: theme.colors.accent,
        marginRight: 8,
    },
    ordered_list_icon: {
        color: theme.colors.accent,
        marginRight: 8,
    },
    table: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.sm,
        marginVertical: 8,
    },
    thead: {
        backgroundColor: theme.colors.surface,
    },
    th: {
        padding: 8,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        fontWeight: "600",
    },
    td: {
        padding: 8,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
    },
    tr: {
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
    },
    hr: {
        backgroundColor: theme.colors.border,
        height: 1,
        marginVertical: 16,
    },
    image: {
        borderRadius: theme.borderRadius.md,
    },
});

interface CodeBlockProps {
    code: string;
    language?: string;
    nodeKey: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, nodeKey }) => {
    const { theme } = useTheme();

    return (
        <View key={nodeKey} style={styles.codeBlockContainer}>
            <GlassView
                style={[
                    styles.codeBlockGlass,
                    { borderRadius: theme.borderRadius.md },
                ]}
            >
                <View style={styles.codeBlockHeader}>
                    {language ? (
                        <Text
                            style={[
                                styles.languageLabel,
                                { color: theme.colors.textSecondary },
                            ]}
                        >
                            {language}
                        </Text>
                    ) : (
                        <View />
                    )}
                    <CopyButton code={code} />
                </View>
                <Text
                    selectable
                    style={[
                        styles.codeText,
                        {
                            color: theme.colors.text,
                            backgroundColor: "transparent",
                        },
                    ]}
                >
                    {code}
                </Text>
            </GlassView>
        </View>
    );
};

export const ThemedMarkdown: React.FC<ThemedMarkdownProps> = ({ content }) => {
    const { theme } = useTheme();

    const markdownStyles = useMemo(() => createMarkdownStyles(theme), [theme]);

    const rules: RenderRules = useMemo(
        () => ({
            fence: (node) => {
                const code = node.content || "";
                const language = (node as { sourceInfo?: string }).sourceInfo || "";
                return (
                    <CodeBlock
                        key={node.key}
                        code={code}
                        language={language}
                        nodeKey={node.key}
                    />
                );
            },
            code_block: (node) => {
                const code = node.content || "";
                return (
                    <CodeBlock
                        key={node.key}
                        code={code}
                        nodeKey={node.key}
                    />
                );
            },
        }),
        []
    );

    return (
        <View style={styles.container}>
            <Markdown style={markdownStyles} rules={rules}>
                {content}
            </Markdown>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    codeBlockContainer: {
        marginVertical: 8,
    },
    codeBlockGlass: {
        overflow: "hidden",
    },
    codeBlockHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 4,
    },
    languageLabel: {
        fontSize: 12,
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    copyButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    copyButtonText: {
        fontSize: 12,
        fontWeight: "500",
    },
    codeText: {
        fontFamily: "monospace",
        fontSize: 14,
        lineHeight: 20,
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: 4,
    },
});

export default ThemedMarkdown;
