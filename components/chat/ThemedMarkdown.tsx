import React, { useCallback, useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextStyle,
    ViewStyle,
} from "react-native";
import Markdown, { RenderRules } from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Theme } from "@/components/ui/ThemeProvider";
import CodeHighlighter from "react-native-code-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import useHapticFeedback from "@/hooks/useHapticFeedback";

interface ThemedMarkdownProps {
    content: string;
}

interface CopyButtonProps {
    code: string;
}

// Copy Button Component - Provides copy functionality for code blocks
const CopyButton: React.FC<CopyButtonProps> = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const { theme } = useTheme();
    const { triggerSuccess } = useHapticFeedback();

    const handleCopy = useCallback(async () => {
        await Clipboard.setStringAsync(code);
        setCopied(true);
        triggerSuccess();
        setTimeout(() => setCopied(false), 2000);
    }, [code, triggerSuccess]);

    return (
        // Touchable area for copy button with haptic feedback
        <TouchableOpacity
            onPress={handleCopy}
            className="p-1"
            activeOpacity={0.7}
        >
            {/* Icon changes between copy and checkmark based on state */}
            <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={18}
                color={copied ? theme.colors.accent : theme.colors.textSecondary}
            />
        </TouchableOpacity>
    );
};

// Style Configuration Factory - Creates theme-aware markdown styles
const createMarkdownStyles = (
    theme: Theme,
): Record<string, TextStyle | ViewStyle> => ({
    // Base text styling for body content
    body: {
        color: theme.colors.text,
        fontSize: 16,
        lineHeight: 24,
    },
    // Heading styles - hierarchical sizing with consistent spacing
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
    // Paragraph spacing
    paragraph: {
        marginTop: 0,
        marginBottom: 12,
    },
    // Text emphasis styling
    strong: {
        fontWeight: "700",
    },
    em: {
        fontStyle: "italic",
    },
    s: {
        textDecorationLine: "line-through",
    },
    // Link styling with accent color
    link: {
        color: theme.colors.accent,
        textDecorationLine: "underline",
    },
    // Blockquote with accent border and surface background
    blockquote: {
        backgroundColor: theme.colors.surface,
        borderLeftColor: theme.colors.accent,
        borderLeftWidth: 4,
        paddingLeft: 12,
        paddingVertical: 8,
        marginVertical: 8,
        borderRadius: 4,
    },
    // Inline code styling with accent coloring
    code_inline: {
        backgroundColor: theme.colors.surface,
        color: theme.colors.accent,
        fontFamily: "monospace",
        fontSize: 14,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    // Code block styling (used by markdown-it)
    code_block: {
        backgroundColor: theme.colors.surface,
        fontFamily: "monospace",
        fontSize: 14,
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
    },
    // Fence block styling (used by markdown-display)
    fence: {
        backgroundColor: theme.colors.surface,
        fontFamily: "monospace",
        fontSize: 14,
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
    },
    // List item spacing
    list_item: {
        marginVertical: 4,
    },
    // List container spacing
    bullet_list: {
        marginVertical: 8,
    },
    ordered_list: {
        marginVertical: 8,
    },
    // List icon styling with accent color
    bullet_list_icon: {
        color: theme.colors.accent,
        marginRight: 8,
    },
    ordered_list_icon: {
        color: theme.colors.accent,
        marginRight: 8,
    },
    // Table styling with borders
    table: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 4,
        marginVertical: 8,
    },
    // Table header with surface background
    thead: {
        backgroundColor: theme.colors.surface,
    },
    // Table header cells with borders and bold text
    th: {
        padding: 8,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        fontWeight: "600",
    },
    // Table data cells with borders
    td: {
        padding: 8,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
    },
    // Table row borders
    tr: {
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
    },
    // Horizontal rule styling
    hr: {
        backgroundColor: theme.colors.border,
        height: 1,
        marginVertical: 16,
    },
    // Image styling with rounded corners
    image: {
        borderRadius: 8,
    },
});

interface CodeBlockProps {
    code: string;
    language?: string;
    nodeKey: string;
}

// Code Block Component - Renders syntax-highlighted code with copy functionality
const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, nodeKey }) => {
    const { theme } = useTheme();

    return (
        // Main container with vertical spacing
        <View key={nodeKey} className="my-2">
            <View
                className="overflow-hidden rounded-md"
                style={{ backgroundColor: theme.colors.surface }}
            >
                {/* Header section with language indicator and copy button */}
                <View className="flex-row justify-between items-center px-3 pt-2 pb-1">
                    {language ? (
                        // Language label with secondary text color
                        <Text
                            className="text-[12px] font-medium uppercase tracking-wide"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            {language}
                        </Text>
                    ) : (
                        // Empty view for spacing when no language
                        <View />
                    )}
                    <CopyButton code={code} />
                </View>
                {/* Syntax-highlighted code display with custom styling */}
                <CodeHighlighter
                    hljsStyle={atomOneDark}
                    language={language || "plaintext"}
                    scrollViewProps={{
                        horizontal: false,
                        scrollEnabled: false,
                    }}
                    containerStyle={{
                        padding: 12,
                        flex: 1,
                        backgroundColor: theme.colors.surface,
                    }}
                    textStyle={{
                        fontSize: 14,
                        fontFamily: "monospace",
                        color: theme.colors.text,
                        flexWrap: "wrap",
                    }}
                >
                    {code.trim()}
                </CodeHighlighter>
            </View>
        </View>
    );
};

// Main ThemedMarkdown Component - Renders markdown content with theme support
export const ThemedMarkdown: React.FC<ThemedMarkdownProps> = ({ content }) => {
    const { theme } = useTheme();

    // Memoized markdown styles based on current theme
    const markdownStyles = useMemo(() => createMarkdownStyles(theme), [theme]);

    // Custom render rules for code blocks (fence and code_block)
    const rules: RenderRules = useMemo(
        () => ({
            // Handle fenced code blocks with language support
            fence: (node) => {
                const code = node.content || "";
                const language =
                    (node as { sourceInfo?: string }).sourceInfo || "";
                return (
                    <CodeBlock
                        key={node.key}
                        code={code}
                        language={language}
                        nodeKey={node.key}
                    />
                );
            },
            // Handle indented code blocks
            code_block: (node) => {
                const code = node.content || "";
                return (
                    <CodeBlock key={node.key} code={code} nodeKey={node.key} />
                );
            },
        }),
        [],
    );

    return (
        // Main container with padding and flex layout
        <View className="flex-1 px-3 py-2">
            <Markdown style={markdownStyles} rules={rules}>
                {content}
            </Markdown>
        </View>
    );
};

export default ThemedMarkdown;
