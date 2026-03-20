import type { MarkdownStyle } from "react-native-enriched-markdown";
import type { Theme } from "@/components/ui/theme-config";
import { withAlpha } from "@/lib/color-utils";

export const createMarkdownStyles = (theme: Theme): MarkdownStyle => {
    const codeBlockBackground = theme.isDark
        ? withAlpha(theme.colors.surface, 0.92)
        : withAlpha(theme.colors.surface, 0.98);

    const inlineCodeBackground = theme.isDark
        ? withAlpha(theme.colors.surface, 0.78)
        : withAlpha(theme.colors.surface, 0.72);

    const tableEven = withAlpha(theme.colors.surface, theme.isDark ? 0.5 : 0.7);
    const tableOdd = withAlpha(theme.colors.surface, theme.isDark ? 0.25 : 0.4);

    return {
        paragraph: {
            color: theme.colors.text,
            fontSize: 16,
            lineHeight: 24,
            marginBottom: 12,
            fontFamily: "System",
        },
        h1: {
            color: theme.colors.text,
            fontSize: 28,
            lineHeight: 36,
            fontWeight: "700",
            marginTop: 20,
            marginBottom: 14,
        },
        h2: {
            color: theme.colors.text,
            fontSize: 24,
            lineHeight: 32,
            fontWeight: "700",
            marginTop: 16,
            marginBottom: 12,
        },
        h3: {
            color: theme.colors.text,
            fontSize: 20,
            lineHeight: 28,
            fontWeight: "600",
            marginTop: 14,
            marginBottom: 10,
        },
        h4: {
            color: theme.colors.text,
            fontSize: 18,
            lineHeight: 26,
            fontWeight: "600",
            marginTop: 12,
            marginBottom: 8,
        },
        h5: {
            color: theme.colors.text,
            fontSize: 16,
            lineHeight: 24,
            fontWeight: "600",
            marginTop: 10,
            marginBottom: 6,
        },
        h6: {
            color: theme.colors.textSecondary,
            fontSize: 14,
            lineHeight: 22,
            fontWeight: "600",
            marginTop: 8,
            marginBottom: 6,
        },
        blockquote: {
            color: theme.colors.textSecondary,
            fontSize: 15,
            lineHeight: 22,
            marginTop: 10,
            marginBottom: 12,
            borderColor: theme.colors.accent,
            borderWidth: 3,
            gapWidth: 10,
            backgroundColor: withAlpha(theme.colors.surface, theme.isDark ? 0.45 : 0.6),
        },
        list: {
            color: theme.colors.text,
            fontSize: 16,
            lineHeight: 24,
            marginBottom: 8,
            bulletColor: theme.colors.accent,
            markerColor: theme.colors.accent,
            markerFontWeight: "600",
            gapWidth: 8,
            marginLeft: 2,
        },
        codeBlock: {
            color: theme.colors.text,
            fontSize: 13,
            lineHeight: 20,
            marginTop: 8,
            marginBottom: 12,
            fontFamily: "Menlo",
            backgroundColor: codeBlockBackground,
            borderColor: theme.colors.border,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            padding: 12,
        },
        link: {
            color: theme.colors.accent,
            underline: true,
        },
        strong: {
            color: theme.colors.text,
            fontWeight: "bold",
        },
        em: {
            color: theme.colors.text,
            fontStyle: "italic",
        },
        strikethrough: {
            color: theme.colors.textSecondary,
        },
        underline: {
            color: theme.colors.accent,
        },
        code: {
            color: theme.colors.accent,
            fontSize: 14,
            fontFamily: "Menlo",
            backgroundColor: inlineCodeBackground,
            borderColor: theme.colors.border,
        },
        image: {
            height: 220,
            borderRadius: theme.borderRadius.md,
            marginTop: 8,
            marginBottom: 12,
        },
        inlineImage: {
            size: 18,
        },
        thematicBreak: {
            color: theme.colors.border,
            height: 1,
            marginTop: 12,
            marginBottom: 12,
        },
        table: {
            color: theme.colors.text,
            fontSize: 14,
            lineHeight: 20,
            fontFamily: "System",
            fontWeight: "400",
            marginTop: 8,
            marginBottom: 12,
            headerFontFamily: "System",
            headerBackgroundColor: withAlpha(theme.colors.surface, theme.isDark ? 0.8 : 0.95),
            headerTextColor: theme.colors.text,
            rowEvenBackgroundColor: tableEven,
            rowOddBackgroundColor: tableOdd,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.borderRadius.sm,
            cellPaddingHorizontal: 10,
            cellPaddingVertical: 8,
        },
        taskList: {
            checkedColor: theme.colors.accent,
            borderColor: theme.colors.border,
            checkboxSize: 17,
            checkboxBorderRadius: 4,
            checkmarkColor: theme.colors.surface,
            checkedTextColor: theme.colors.textSecondary,
            checkedStrikethrough: true,
        },
    };
};
