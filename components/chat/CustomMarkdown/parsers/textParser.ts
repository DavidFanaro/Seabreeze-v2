/**
 * @file textParser.ts
 * @purpose Parse markdown text and inline formatting
 */

export type InlineTokenType =
    | "text"
    | "bold"
    | "italic"
    | "boldItalic"
    | "strikethrough"
    | "inlineCode"
    | "link"
    | "image";

export interface InlineToken {
    type: InlineTokenType;
    content: string;
    href?: string;
    alt?: string;
    children?: InlineToken[];
}

/**
 * Parse inline markdown formatting from text
 * Handles: **bold**, *italic*, ***boldItalic***, ~~strikethrough~~, `code`, [links](url), ![images](url)
 */
export const parseInlineTokens = (text: string): InlineToken[] => {
    const tokens: InlineToken[] = [];
    let remaining = text;

    // Pattern priority: images > links > boldItalic > bold > italic > strikethrough > inlineCode > text
    const patterns = [
        // Image: ![alt](url)
        {
            regex: /^!\[([^\]]*)\]\(([^)]+)\)/,
            type: "image" as InlineTokenType,
            handler: (match: RegExpMatchArray): InlineToken => ({
                type: "image",
                content: match[2],
                alt: match[1],
            }),
        },
        // Link: [text](url)
        {
            regex: /^\[([^\]]+)\]\(([^)]+)\)/,
            type: "link" as InlineTokenType,
            handler: (match: RegExpMatchArray): InlineToken => ({
                type: "link",
                content: match[1],
                href: match[2],
            }),
        },
        // Bold + Italic: ***text*** or ___text___
        {
            regex: /^(\*\*\*|___)([^*_]+)\1/,
            type: "boldItalic" as InlineTokenType,
            handler: (match: RegExpMatchArray): InlineToken => ({
                type: "boldItalic",
                content: match[2],
            }),
        },
        // Bold: **text** or __text__
        {
            regex: /^(\*\*|__)([^*_]+)\1/,
            type: "bold" as InlineTokenType,
            handler: (match: RegExpMatchArray): InlineToken => ({
                type: "bold",
                content: match[2],
            }),
        },
        // Italic: *text* or _text_
        {
            regex: /^(\*|_)([^*_]+)\1/,
            type: "italic" as InlineTokenType,
            handler: (match: RegExpMatchArray): InlineToken => ({
                type: "italic",
                content: match[2],
            }),
        },
        // Strikethrough: ~~text~~
        {
            regex: /^~~([^~]+)~~/,
            type: "strikethrough" as InlineTokenType,
            handler: (match: RegExpMatchArray): InlineToken => ({
                type: "strikethrough",
                content: match[1],
            }),
        },
        // Inline code: `code`
        {
            regex: /^`([^`]+)`/,
            type: "inlineCode" as InlineTokenType,
            handler: (match: RegExpMatchArray): InlineToken => ({
                type: "inlineCode",
                content: match[1],
            }),
        },
    ];

    while (remaining.length > 0) {
        let matched = false;

        for (const pattern of patterns) {
            const match = remaining.match(pattern.regex);
            if (match) {
                tokens.push(pattern.handler(match));
                remaining = remaining.slice(match[0].length);
                matched = true;
                break;
            }
        }

        if (!matched) {
            // Find the next special character
            const specialChars = ["*", "_", "~", "`", "[", "!"];
            let nextSpecialIndex = remaining.length;

            for (const char of specialChars) {
                const index = remaining.indexOf(char);
                if (index > 0 && index < nextSpecialIndex) {
                    nextSpecialIndex = index;
                }
            }

            // Add plain text up to the next special character
            const plainText = remaining.slice(0, nextSpecialIndex);
            if (plainText.length > 0) {
                // Merge with previous text token if possible
                const lastToken = tokens[tokens.length - 1];
                if (lastToken && lastToken.type === "text") {
                    lastToken.content += plainText;
                } else {
                    tokens.push({ type: "text", content: plainText });
                }
            }
            remaining = remaining.slice(nextSpecialIndex);

            // If we're at a special character that didn't match a pattern, treat it as text
            if (remaining.length > 0 && nextSpecialIndex === 0) {
                const lastToken = tokens[tokens.length - 1];
                if (lastToken && lastToken.type === "text") {
                    lastToken.content += remaining[0];
                } else {
                    tokens.push({ type: "text", content: remaining[0] });
                }
                remaining = remaining.slice(1);
            }
        }
    }

    return tokens;
};

/**
 * Extract plain text content from inline tokens (for copy functionality)
 */
export const getPlainTextFromTokens = (tokens: InlineToken[]): string => {
    return tokens
        .map((token) => {
            switch (token.type) {
                case "link":
                    return token.content;
                case "image":
                    return token.alt || "";
                default:
                    return token.content;
            }
        })
        .join("");
};
