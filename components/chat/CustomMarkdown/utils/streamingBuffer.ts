/**
 * @file streamingBuffer.ts
 * @purpose 50-character streaming buffer with smart boundary detection
 */

import { hasIncompleteCodeBlock } from "../parsers";

export interface BufferState {
    content: string;
    pendingChunk: string;
    isComplete: boolean;
}

export interface StreamingBufferConfig {
    bufferSize: number;
    flushOnBoundary: boolean;
}

const DEFAULT_CONFIG: StreamingBufferConfig = {
    bufferSize: 50,
    flushOnBoundary: true,
};

/**
 * Detects if we're at a safe boundary to flush content
 * Safe boundaries include: end of sentence, end of paragraph, etc.
 */
const isAtSafeBoundary = (content: string): boolean => {
    const trimmed = content.trimEnd();

    // End of sentence
    if (/[.!?]\s*$/.test(trimmed)) return true;

    // End of paragraph (double newline)
    if (/\n\s*\n\s*$/.test(content)) return true;

    // End of list item
    if (/\n[-*+]\s*$/.test(content) || /\n\d+\.\s*$/.test(content)) return true;

    // End of code block
    if (/```\s*$/.test(content)) return true;

    // End of header
    if (/^#{1,6}\s+.+$/.test(trimmed.split("\n").pop() || "")) return true;

    return false;
};

/**
 * Detects if content has incomplete markdown elements that shouldn't be rendered yet
 */
const hasIncompleteElements = (content: string): boolean => {
    // Check for incomplete code block
    if (hasIncompleteCodeBlock(content)) return true;

    // Check for incomplete link/image: has `[` or `![` without matching `](url)`
    const lastOpenBracket = Math.max(content.lastIndexOf("["), content.lastIndexOf("!["));
    if (lastOpenBracket !== -1) {
        const afterBracket = content.slice(lastOpenBracket);
        // Check if there's an incomplete link syntax
        if (/\[[^\]]*$/.test(afterBracket) || /\[[^\]]*\]\([^)]*$/.test(afterBracket)) {
            return true;
        }
    }

    // Check for incomplete bold/italic markers
    const lastLine = content.split("\n").pop() || "";
    const asteriskCount = (lastLine.match(/\*/g) || []).length;
    const underscoreCount = (lastLine.match(/_/g) || []).length;
    if (asteriskCount % 2 !== 0 || underscoreCount % 2 !== 0) return true;

    // Check for incomplete inline code
    const backtickCount = (lastLine.match(/`/g) || []).length;
    if (backtickCount % 2 !== 0 && !hasIncompleteCodeBlock(content)) return true;

    return false;
};

/**
 * Find the last safe split point in content
 */
const findSafeSplitPoint = (content: string, maxLength: number): number => {
    if (content.length <= maxLength) return content.length;

    const searchArea = content.slice(0, maxLength);

    // Try to split at paragraph boundary
    const lastDoubleNewline = searchArea.lastIndexOf("\n\n");
    if (lastDoubleNewline > maxLength * 0.5) return lastDoubleNewline + 2;

    // Try to split at sentence boundary
    const sentenceEnds = [". ", "! ", "? ", ".\n", "!\n", "?\n"];
    let bestSplit = -1;
    for (const end of sentenceEnds) {
        const index = searchArea.lastIndexOf(end);
        if (index > bestSplit) {
            bestSplit = index + end.length;
        }
    }
    if (bestSplit > maxLength * 0.3) return bestSplit;

    // Try to split at newline
    const lastNewline = searchArea.lastIndexOf("\n");
    if (lastNewline > maxLength * 0.3) return lastNewline + 1;

    // Try to split at space
    const lastSpace = searchArea.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.3) return lastSpace + 1;

    // Fall back to max length
    return maxLength;
};

/**
 * Create a streaming buffer manager
 */
export const createStreamingBuffer = (config: Partial<StreamingBufferConfig> = {}) => {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    let buffer: BufferState = {
        content: "",
        pendingChunk: "",
        isComplete: false,
    };

    return {
        /**
         * Add new content to the buffer
         * Returns the content that should be rendered
         */
        push: (chunk: string): { renderContent: string; shouldUpdate: boolean } => {
            buffer.pendingChunk += chunk;

            // If buffer is small, wait for more content
            if (buffer.pendingChunk.length < mergedConfig.bufferSize) {
                return { renderContent: buffer.content, shouldUpdate: false };
            }

            // Check if we have incomplete elements
            const fullContent = buffer.content + buffer.pendingChunk;
            if (hasIncompleteElements(fullContent)) {
                // For incomplete code blocks, render everything except the incomplete part
                if (hasIncompleteCodeBlock(fullContent)) {
                    const lastFenceStart = fullContent.lastIndexOf("```");
                    if (lastFenceStart > buffer.content.length) {
                        const safeContent = fullContent.slice(0, lastFenceStart);
                        buffer.content = safeContent;
                        buffer.pendingChunk = fullContent.slice(lastFenceStart);
                        return { renderContent: buffer.content, shouldUpdate: true };
                    }
                }
                // Wait for completion
                return { renderContent: buffer.content, shouldUpdate: false };
            }

            // Find safe split point
            if (mergedConfig.flushOnBoundary && isAtSafeBoundary(fullContent)) {
                buffer.content = fullContent;
                buffer.pendingChunk = "";
                return { renderContent: buffer.content, shouldUpdate: true };
            }

            // Flush with safe split
            const splitPoint = findSafeSplitPoint(
                buffer.pendingChunk,
                mergedConfig.bufferSize
            );
            buffer.content += buffer.pendingChunk.slice(0, splitPoint);
            buffer.pendingChunk = buffer.pendingChunk.slice(splitPoint);

            return { renderContent: buffer.content, shouldUpdate: true };
        },

        /**
         * Mark streaming as complete and flush all remaining content
         */
        complete: (): string => {
            buffer.content += buffer.pendingChunk;
            buffer.pendingChunk = "";
            buffer.isComplete = true;
            return buffer.content;
        },

        /**
         * Reset the buffer
         */
        reset: (): void => {
            buffer = {
                content: "",
                pendingChunk: "",
                isComplete: false,
            };
        },

        /**
         * Get current state
         */
        getState: (): BufferState => ({ ...buffer }),

        /**
         * Force flush all content (use sparingly)
         */
        flush: (): string => {
            buffer.content += buffer.pendingChunk;
            buffer.pendingChunk = "";
            return buffer.content;
        },
    };
};

/**
 * Hook-friendly streaming buffer for React components
 */
export type StreamingBuffer = ReturnType<typeof createStreamingBuffer>;
