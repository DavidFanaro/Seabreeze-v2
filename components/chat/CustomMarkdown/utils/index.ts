export {
    highlightCode,
    getTokenColor,
    tokensToPlainText,
    type TokenType,
    type SyntaxToken,
    type HighlightedLine,
} from "./syntaxHighlighter";

export {
    createStreamingBuffer,
    type StreamingBuffer,
    type BufferState,
    type StreamingBufferConfig,
} from "./streamingBuffer";

export {
    copyToClipboard,
    getClipboardContent,
    formatCodeForCopy,
    formatMarkdownForCopy,
    formatTableForCopy,
    formatSectionForCopy,
    type CopyResult,
    type CopySectionOptions,
} from "./copyHandler";

export {
    initializeImageCache,
    getCachedImagePath,
    cacheImage,
    clearImageCache,
    getCacheSize,
    getFormattedCacheSize,
    preloadImages,
    isImageCached,
} from "./imageCache";
