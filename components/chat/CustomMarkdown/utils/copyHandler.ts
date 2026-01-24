/**
 * @file copyHandler.ts
 * @purpose Handle copy operations with iOS haptic feedback
 */

import * as Clipboard from "expo-clipboard";

export interface CopyResult {
    success: boolean;
    error?: string;
}

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<CopyResult> => {
    try {
        await Clipboard.setStringAsync(text);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to copy",
        };
    }
};

/**
 * Get text from clipboard
 */
export const getClipboardContent = async (): Promise<string | null> => {
    try {
        const hasString = await Clipboard.hasStringAsync();
        if (hasString) {
            return await Clipboard.getStringAsync();
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Format code for copying (preserves formatting)
 */
export const formatCodeForCopy = (code: string, language?: string): string => {
    // Trim trailing whitespace from each line but preserve indentation
    const lines = code.split("\n");
    const formattedLines = lines.map((line) => line.trimEnd());

    // Remove leading/trailing empty lines
    while (formattedLines.length > 0 && formattedLines[0] === "") {
        formattedLines.shift();
    }
    while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === "") {
        formattedLines.pop();
    }

    return formattedLines.join("\n");
};

/**
 * Format markdown content for copying
 * Converts markdown to plain text while preserving structure
 */
export const formatMarkdownForCopy = (markdown: string): string => {
    let result = markdown;

    // Remove code fence syntax but keep code
    result = result.replace(/```\w*\n([\s\S]*?)```/g, "$1");

    // Convert headers to plain text
    result = result.replace(/^#{1,6}\s+(.+)$/gm, "$1");

    // Convert bold/italic to plain text
    result = result.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
    result = result.replace(/\*\*([^*]+)\*\*/g, "$1");
    result = result.replace(/\*([^*]+)\*/g, "$1");
    result = result.replace(/___([^_]+)___/g, "$1");
    result = result.replace(/__([^_]+)__/g, "$1");
    result = result.replace(/_([^_]+)_/g, "$1");

    // Convert strikethrough to plain text
    result = result.replace(/~~([^~]+)~~/g, "$1");

    // Convert inline code to plain text
    result = result.replace(/`([^`]+)`/g, "$1");

    // Convert links to just the text
    result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // Remove images (or convert to alt text)
    result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

    // Convert blockquotes
    result = result.replace(/^>\s?(.*)$/gm, "$1");

    // Convert list items to plain text
    result = result.replace(/^[-*+]\s+/gm, "• ");
    result = result.replace(/^\d+\.\s+/gm, (match, offset, string) => {
        // Keep numbered lists as-is
        return match;
    });

    // Convert task list items
    result = result.replace(/^[-*+]\s+\[[ xX]\]\s+/gm, "• ");

    // Convert horizontal rules
    result = result.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "---");

    return result.trim();
};

/**
 * Format table for copying (tab-separated)
 */
export const formatTableForCopy = (headers: string[], rows: string[][]): string => {
    const headerRow = headers.join("\t");
    const dataRows = rows.map((row) => row.join("\t")).join("\n");
    return `${headerRow}\n${dataRows}`;
};

/**
 * Copy section content with context
 */
export interface CopySectionOptions {
    includeLanguage?: boolean;
    includeLineNumbers?: boolean;
    startLine?: number;
}

export const formatSectionForCopy = (
    content: string,
    type: "code" | "text" | "table",
    options: CopySectionOptions = {}
): string => {
    if (type === "code") {
        return formatCodeForCopy(content);
    }

    if (type === "text") {
        return content.trim();
    }

    return content;
};
