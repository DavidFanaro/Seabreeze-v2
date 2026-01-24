/**
 * @file markdownStyles.ts
 * @purpose Theme-aware styling system for custom markdown renderer
 */

import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import type { Theme } from "@/components/ui/ThemeProvider";
import { getSyntaxTheme } from "../utils/syntaxThemes";

export interface MarkdownStyles {
    // Container styles
    container: ViewStyle;
    copyAllButton: ViewStyle;

    // Text styles
    text: TextStyle;
    bold: TextStyle;
    italic: TextStyle;
    strikethrough: TextStyle;
    inlineCode: TextStyle;

    // Header styles
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    h4: TextStyle;
    h5: TextStyle;
    h6: TextStyle;

    // Block styles
    paragraph: ViewStyle;
    blockquote: ViewStyle;
    blockquoteText: TextStyle;
    blockquoteBorder: ViewStyle;
    horizontalRule: ViewStyle;

    // Link styles
    link: TextStyle;

    // List styles
    listContainer: ViewStyle;
    listItem: ViewStyle;
    listBullet: TextStyle;
    listNumber: TextStyle;
    listContent: TextStyle;
    taskListItem: ViewStyle;
    taskCheckbox: ViewStyle;
    taskCheckboxChecked: ViewStyle;
    taskCheckboxUnchecked: ViewStyle;

    // Code block styles
    codeBlockContainer: ViewStyle;
    codeBlockHeader: ViewStyle;
    codeBlockLanguage: TextStyle;
    codeBlockContent: ViewStyle;
    codeBlockText: TextStyle;
    codeLineNumber: TextStyle;
    codeLineNumberContainer: ViewStyle;
    codeScrollView: ViewStyle;

    // Table styles
    tableContainer: ViewStyle;
    tableRow: ViewStyle;
    tableHeaderRow: ViewStyle;
    tableCell: ViewStyle;
    tableHeaderCell: ViewStyle;
    tableCellText: TextStyle;
    tableHeaderCellText: TextStyle;

    // Image styles
    imageContainer: ViewStyle;
    image: ViewStyle;
    imageCaption: TextStyle;
    galleryContainer: ViewStyle;
    galleryImage: ViewStyle;
    galleryIndicator: ViewStyle;
    galleryDot: ViewStyle;
    galleryDotActive: ViewStyle;

    // Copy button styles
    copyButton: ViewStyle;
    copyButtonPressed: ViewStyle;
    copyButtonText: TextStyle;
}

export interface SyntaxTheme {
    keyword: string;
    string: string;
    number: string;
    comment: string;
    function: string;
    variable: string;
    operator: string;
    punctuation: string;
    className: string;
    property: string;
    type: string;
    constant: string;
    boolean: string;
    regex: string;
    tag: string;
    attribute: string;
    default: string;
}

export const createSyntaxTheme = (theme: Theme, themeType: string): SyntaxTheme => {
    return getSyntaxTheme(themeType);
};

export const createMarkdownStyles = (theme: Theme): MarkdownStyles => {
    const isDark = theme.isDark;
    const codeBackground = theme.colors.surface;
    const codeBorder = theme.colors.border;

    return StyleSheet.create<MarkdownStyles>({
        // Container styles
        container: {
            flex: 1,
        },
        copyAllButton: {
            position: "absolute",
            top: 8,
            right: 8,
            padding: 8,
            borderRadius: theme.borderRadius.sm,
            backgroundColor: theme.colors.surface,
        },

        // Text styles
        text: {
            fontSize: 16,
            lineHeight: 24,
            color: theme.colors.text,
            fontFamily: "System",
        },
        bold: {
            fontWeight: "700",
        },
        italic: {
            fontStyle: "italic",
        },
        strikethrough: {
            textDecorationLine: "line-through",
            textDecorationStyle: "solid",
        },
        inlineCode: {
            fontFamily: "Menlo",
            fontSize: 14,
            backgroundColor: codeBackground,
            color: isDark ? "#e06c75" : "#e45649",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            overflow: "hidden",
        },

        // Header styles
        h1: {
            fontSize: 28,
            fontWeight: "700",
            color: theme.colors.text,
            marginTop: 24,
            marginBottom: 16,
            lineHeight: 36,
        },
        h2: {
            fontSize: 24,
            fontWeight: "700",
            color: theme.colors.text,
            marginTop: 20,
            marginBottom: 12,
            lineHeight: 32,
        },
        h3: {
            fontSize: 20,
            fontWeight: "600",
            color: theme.colors.text,
            marginTop: 16,
            marginBottom: 10,
            lineHeight: 28,
        },
        h4: {
            fontSize: 18,
            fontWeight: "600",
            color: theme.colors.text,
            marginTop: 14,
            marginBottom: 8,
            lineHeight: 26,
        },
        h5: {
            fontSize: 16,
            fontWeight: "600",
            color: theme.colors.text,
            marginTop: 12,
            marginBottom: 6,
            lineHeight: 24,
        },
        h6: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.colors.textSecondary,
            marginTop: 10,
            marginBottom: 4,
            lineHeight: 22,
        },

        // Block styles
        paragraph: {
            marginBottom: 12,
        },
        blockquote: {
            flexDirection: "row",
            marginVertical: 12,
            paddingLeft: 12,
        },
        blockquoteText: {
            fontSize: 16,
            lineHeight: 24,
            color: theme.colors.textSecondary,
            fontStyle: "italic",
            flex: 1,
        },
        blockquoteBorder: {
            width: 4,
            backgroundColor: theme.colors.accent,
            borderRadius: 2,
            marginRight: 12,
        },
        horizontalRule: {
            height: 1,
            backgroundColor: theme.colors.border,
            marginVertical: 16,
        },

        // Link styles
        link: {
            color: theme.colors.accent,
            textDecorationLine: "underline",
        },

        // List styles
        listContainer: {
            marginVertical: 8,
        },
        listItem: {
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 6,
            paddingLeft: 8,
        },
        listBullet: {
            fontSize: 16,
            lineHeight: 24,
            color: theme.colors.accent,
            marginRight: 8,
            width: 16,
        },
        listNumber: {
            fontSize: 16,
            lineHeight: 24,
            color: theme.colors.accent,
            marginRight: 8,
            minWidth: 20,
        },
        listContent: {
            fontSize: 16,
            lineHeight: 24,
            color: theme.colors.text,
            flex: 1,
        },
        taskListItem: {
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 6,
            paddingLeft: 8,
        },
        taskCheckbox: {
            width: 18,
            height: 18,
            borderRadius: 4,
            borderWidth: 2,
            marginRight: 10,
            marginTop: 3,
            justifyContent: "center",
            alignItems: "center",
        },
        taskCheckboxChecked: {
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
        },
        taskCheckboxUnchecked: {
            backgroundColor: "transparent",
            borderColor: theme.colors.border,
        },

        // Code block styles
        codeBlockContainer: {
            marginVertical: 12,
            borderRadius: theme.borderRadius.md,
            backgroundColor: codeBackground,
            borderWidth: 1,
            borderColor: codeBorder,
            overflow: "hidden",
        },
        codeBlockHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: codeBorder,
        },
        codeBlockLanguage: {
            fontSize: 12,
            fontWeight: "600",
            color: theme.colors.textSecondary,
            textTransform: "uppercase",
        },
        codeBlockContent: {
            padding: 12,
        },
        codeBlockText: {
            fontFamily: "Menlo",
            fontSize: 13,
            lineHeight: 20,
            color: theme.colors.text,
        },
        codeLineNumber: {
            fontFamily: "Menlo",
            fontSize: 13,
            lineHeight: 20,
            color: theme.colors.textSecondary,
            textAlign: "right",
            opacity: 0.5,
        },
        codeLineNumberContainer: {
            paddingRight: 12,
            marginRight: 12,
            borderRightWidth: 1,
            borderRightColor: codeBorder,
        },
        codeScrollView: {
            flexDirection: "row",
        },

        // Table styles
        tableContainer: {
            marginVertical: 12,
            borderRadius: theme.borderRadius.sm,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: "hidden",
        },
        tableRow: {
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
        },
        tableHeaderRow: {
            flexDirection: "row",
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 2,
            borderBottomColor: theme.colors.border,
        },
        tableCell: {
            flex: 1,
            padding: 10,
            borderRightWidth: 1,
            borderRightColor: theme.colors.border,
        },
        tableHeaderCell: {
            flex: 1,
            padding: 10,
            borderRightWidth: 1,
            borderRightColor: theme.colors.border,
        },
        tableCellText: {
            fontSize: 14,
            color: theme.colors.text,
        },
        tableHeaderCellText: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.colors.text,
        },

        // Image styles
        imageContainer: {
            marginVertical: 12,
            borderRadius: theme.borderRadius.md,
            overflow: "hidden",
        },
        image: {
            width: "100%",
            borderRadius: theme.borderRadius.md,
        },
        imageCaption: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            textAlign: "center",
            marginTop: 8,
            fontStyle: "italic",
        },
        galleryContainer: {
            marginVertical: 12,
        },
        galleryImage: {
            borderRadius: theme.borderRadius.md,
        },
        galleryIndicator: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 12,
        },
        galleryDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.border,
            marginHorizontal: 4,
        },
        galleryDotActive: {
            backgroundColor: theme.colors.accent,
        },

        // Copy button styles
        copyButton: {
            padding: 6,
            borderRadius: theme.borderRadius.sm,
        },
        copyButtonPressed: {
            backgroundColor: theme.colors.accent,
        },
        copyButtonText: {
            fontSize: 12,
            color: theme.colors.textSecondary,
        },
    });
};
