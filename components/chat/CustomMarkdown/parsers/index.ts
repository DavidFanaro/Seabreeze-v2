/**
 * @file index.ts
 * @purpose Main markdown parser orchestration
 */

import {
    parseInlineTokens,
    getPlainTextFromTokens,
    type InlineToken,
    type InlineTokenType,
} from "./textParser";
import {
    parseCodeBlock,
    hasIncompleteCodeBlock,
    extractCodeBlocks,
    normalizeLanguage,
    getLanguageDisplayName,
    type CodeBlock,
} from "./codeParser";
import {
    parseImageSyntax,
    extractAllImages,
    isValidImageUrl,
    generateImageCacheKey,
    isDataUrl,
    isLocalUrl,
    getImageExtension,
    type MarkdownImage,
} from "./imageParser";

// Block-level token types
export type BlockTokenType =
    | "paragraph"
    | "header"
    | "codeBlock"
    | "blockquote"
    | "unorderedList"
    | "orderedList"
    | "taskList"
    | "horizontalRule"
    | "table"
    | "image";

export interface BlockToken {
    type: BlockTokenType;
    content: string;
    level?: number; // For headers (1-6)
    language?: string; // For code blocks
    items?: { content: string; checked?: boolean }[]; // For lists
    rows?: string[][]; // For tables
    headers?: string[]; // For tables
    images?: MarkdownImage[]; // For images
    isComplete?: boolean; // For streaming detection
}

export interface ParsedMarkdown {
    blocks: BlockToken[];
    hasIncompleteBlock: boolean;
}

/**
 * Parse markdown content into block tokens
 */
export const parseMarkdown = (content: string): ParsedMarkdown => {
    const blocks: BlockToken[] = [];
    const lines = content.split("\n");
    let currentIndex = 0;
    let hasIncompleteBlock = false;

    while (currentIndex < lines.length) {
        const line = lines[currentIndex];
        const trimmedLine = line.trim();

        // Skip empty lines
        if (trimmedLine === "") {
            currentIndex++;
            continue;
        }

        // Check for horizontal rule
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmedLine)) {
            blocks.push({ type: "horizontalRule", content: "" });
            currentIndex++;
            continue;
        }

        // Check for headers
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            blocks.push({
                type: "header",
                level: headerMatch[1].length,
                content: headerMatch[2],
            });
            currentIndex++;
            continue;
        }

        // Check for code blocks
        if (trimmedLine.startsWith("```")) {
            const codeBlockContent = lines.slice(currentIndex).join("\n");
            const result = parseCodeBlock(codeBlockContent, 0);

            if (result) {
                blocks.push({
                    type: "codeBlock",
                    content: result.block.code,
                    language: result.block.language,
                    isComplete: result.block.isComplete,
                });

                if (!result.block.isComplete) {
                    hasIncompleteBlock = true;
                }

                // Count how many lines the code block spans
                const codeBlockLines = codeBlockContent
                    .slice(0, result.endIndex)
                    .split("\n").length;
                currentIndex += codeBlockLines;
                continue;
            }
        }

        // Check for blockquotes
        if (trimmedLine.startsWith(">")) {
            const quoteLines: string[] = [];
            while (currentIndex < lines.length && lines[currentIndex].trim().startsWith(">")) {
                quoteLines.push(lines[currentIndex].trim().replace(/^>\s?/, ""));
                currentIndex++;
            }
            blocks.push({
                type: "blockquote",
                content: quoteLines.join("\n"),
            });
            continue;
        }

        // Check for unordered lists
        if (/^[-*+]\s/.test(trimmedLine)) {
            const listItems: { content: string; checked?: boolean }[] = [];
            while (currentIndex < lines.length) {
                const listLine = lines[currentIndex].trim();

                // Check for task list item
                const taskMatch = listLine.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
                if (taskMatch) {
                    listItems.push({
                        content: taskMatch[2],
                        checked: taskMatch[1].toLowerCase() === "x",
                    });
                    currentIndex++;
                    continue;
                }

                // Check for regular list item
                const listMatch = listLine.match(/^[-*+]\s+(.*)$/);
                if (listMatch) {
                    listItems.push({ content: listMatch[1] });
                    currentIndex++;
                    continue;
                }

                break;
            }

            // Determine if it's a task list or regular unordered list
            const hasTaskItems = listItems.some((item) => item.checked !== undefined);
            blocks.push({
                type: hasTaskItems ? "taskList" : "unorderedList",
                content: "",
                items: listItems,
            });
            continue;
        }

        // Check for ordered lists
        if (/^\d+\.\s/.test(trimmedLine)) {
            const listItems: { content: string }[] = [];
            while (currentIndex < lines.length) {
                const listLine = lines[currentIndex].trim();
                const listMatch = listLine.match(/^\d+\.\s+(.*)$/);
                if (listMatch) {
                    listItems.push({ content: listMatch[1] });
                    currentIndex++;
                } else {
                    break;
                }
            }
            blocks.push({
                type: "orderedList",
                content: "",
                items: listItems,
            });
            continue;
        }

        // Check for tables
        if (trimmedLine.includes("|")) {
            const tableLines: string[] = [];
            while (currentIndex < lines.length && lines[currentIndex].includes("|")) {
                tableLines.push(lines[currentIndex]);
                currentIndex++;
            }

            if (tableLines.length >= 2) {
                const parsedTable = parseTable(tableLines);
                if (parsedTable) {
                    blocks.push(parsedTable);
                    continue;
                }
            }

            // If not a valid table, treat as paragraph
            currentIndex -= tableLines.length;
        }

        // Check for standalone images
        const imageMatch = trimmedLine.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
            // Collect consecutive images for potential gallery
            const images: MarkdownImage[] = [];
            while (currentIndex < lines.length) {
                const imgLine = lines[currentIndex].trim();
                const imgMatch = imgLine.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                if (imgMatch) {
                    images.push({
                        alt: imgMatch[1],
                        url: imgMatch[2],
                    });
                    currentIndex++;
                } else {
                    if (imgLine === "") {
                        currentIndex++;
                    } else {
                        break;
                    }
                }
            }
            blocks.push({
                type: "image",
                content: "",
                images,
            });
            continue;
        }

        // Default: treat as paragraph
        const paragraphLines: string[] = [];
        while (currentIndex < lines.length) {
            const pLine = lines[currentIndex];
            const pTrimmed = pLine.trim();

            // Stop at block-level elements
            if (
                pTrimmed === "" ||
                /^#{1,6}\s/.test(pTrimmed) ||
                pTrimmed.startsWith("```") ||
                pTrimmed.startsWith(">") ||
                /^[-*+]\s/.test(pTrimmed) ||
                /^\d+\.\s/.test(pTrimmed) ||
                /^(-{3,}|\*{3,}|_{3,})$/.test(pTrimmed) ||
                /^!\[.*\]\(.*\)$/.test(pTrimmed)
            ) {
                break;
            }

            paragraphLines.push(pLine);
            currentIndex++;
        }

        if (paragraphLines.length > 0) {
            blocks.push({
                type: "paragraph",
                content: paragraphLines.join("\n"),
            });
        }
    }

    return { blocks, hasIncompleteBlock };
};

/**
 * Parse a markdown table from lines
 */
const parseTable = (lines: string[]): BlockToken | null => {
    if (lines.length < 2) return null;

    const parseRow = (line: string): string[] => {
        return line
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell, index, arr) => {
                // Remove empty cells at the start and end
                if (index === 0 && cell === "") return false;
                if (index === arr.length - 1 && cell === "") return false;
                return true;
            });
    };

    const headers = parseRow(lines[0]);

    // Check if second line is a separator (---|---|---)
    const separatorLine = lines[1].trim();
    if (!/^[\s|:-]+$/.test(separatorLine)) return null;

    const rows = lines.slice(2).map(parseRow);

    return {
        type: "table",
        content: "",
        headers,
        rows,
    };
};

/**
 * Get plain text from parsed markdown (for copy all functionality)
 */
export const getPlainTextFromMarkdown = (parsed: ParsedMarkdown): string => {
    return parsed.blocks
        .map((block) => {
            switch (block.type) {
                case "header":
                case "paragraph":
                case "blockquote":
                    return block.content;
                case "codeBlock":
                    return block.content;
                case "unorderedList":
                case "orderedList":
                case "taskList":
                    return block.items?.map((item) => item.content).join("\n") || "";
                case "table":
                    const headerRow = block.headers?.join("\t") || "";
                    const dataRows = block.rows?.map((row) => row.join("\t")).join("\n") || "";
                    return `${headerRow}\n${dataRows}`;
                case "image":
                    return block.images?.map((img) => img.alt || img.url).join("\n") || "";
                case "horizontalRule":
                    return "---";
                default:
                    return "";
            }
        })
        .join("\n\n");
};

// Re-export types and utilities
export type { InlineToken, InlineTokenType, CodeBlock, MarkdownImage };
export {
    parseInlineTokens,
    getPlainTextFromTokens,
    parseCodeBlock,
    hasIncompleteCodeBlock,
    extractCodeBlocks,
    normalizeLanguage,
    getLanguageDisplayName,
    parseImageSyntax,
    extractAllImages,
    isValidImageUrl,
    generateImageCacheKey,
    isDataUrl,
    isLocalUrl,
    getImageExtension,
};
