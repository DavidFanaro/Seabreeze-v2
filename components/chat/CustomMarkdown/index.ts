/**
 * @file index.ts
 * @purpose Main exports for CustomMarkdown component
 */

export { CustomMarkdown } from "./CustomMarkdown";

// Re-export sub-components for advanced use cases
export {
    CopyButton,
    MarkdownText,
    MarkdownHeader,
    MarkdownBlockquote,
    CodeBlock,
    InlineCode,
    ImageComponent,
    TableComponent,
} from "./components";

// Re-export utilities
export {
    copyToClipboard,
    formatCodeForCopy,
    formatMarkdownForCopy,
    createStreamingBuffer,
    highlightCode,
    initializeImageCache,
    clearImageCache,
    getCacheSize,
    getFormattedCacheSize,
} from "./utils";

// Re-export parsers
export {
    parseMarkdown,
    parseInlineTokens,
    getPlainTextFromMarkdown,
    type BlockToken,
    type BlockTokenType,
    type InlineToken,
    type InlineTokenType,
    type ParsedMarkdown,
} from "./parsers";

// Re-export styles
export {
    createMarkdownStyles,
    createSyntaxTheme,
    type MarkdownStyles,
    type SyntaxTheme,
} from "./styles";
