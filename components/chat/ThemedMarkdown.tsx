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
        <TouchableOpacity
            onPress={handleCopy}
            className="p-1"
            activeOpacity={0.7}
        >
            <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={18}
                color={copied ? theme.colors.accent : theme.colors.textSecondary}
            />
        </TouchableOpacity>
    );
};

const createMarkdownStyles = (
    theme: Theme,
): Record<string, TextStyle | ViewStyle> => ({
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
        borderRadius: 4,
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
        borderRadius: 8,
        marginVertical: 8,
    },
    fence: {
        backgroundColor: theme.colors.surface,
        fontFamily: "monospace",
        fontSize: 14,
        padding: 12,
        borderRadius: 8,
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
        borderRadius: 4,
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
        borderRadius: 8,
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
        <View key={nodeKey} className="my-2">
            <View
                className="overflow-hidden rounded-md"
                style={{ backgroundColor: theme.colors.surface }}
            >
                <View className="flex-row justify-between items-center px-3 pt-2 pb-1">
                    {language ? (
                        <Text
                            className="text-[12px] font-medium uppercase tracking-wide"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            {language}
                        </Text>
                    ) : (
                        <View />
                    )}
                    <CopyButton code={code} />
                </View>
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

export const ThemedMarkdown: React.FC<ThemedMarkdownProps> = ({ content }) => {
    const { theme } = useTheme();

    const markdownStyles = useMemo(() => createMarkdownStyles(theme), [theme]);

    const rules: RenderRules = useMemo(
        () => ({
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
        <View className="flex-1 px-3 py-2">
            <Markdown style={markdownStyles} rules={rules}>
                {content}
            </Markdown>
        </View>
    );
};

export default ThemedMarkdown;
