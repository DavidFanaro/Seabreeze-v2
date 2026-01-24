/**
 * @file codeParser.ts
 * @purpose Parse code blocks and detect programming languages
 */

export interface CodeBlock {
    language: string;
    code: string;
    isComplete: boolean;
}

// Common language aliases
const LANGUAGE_ALIASES: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    py: "python",
    rb: "ruby",
    yml: "yaml",
    md: "markdown",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    kt: "kotlin",
    cs: "csharp",
    "c++": "cpp",
    "c#": "csharp",
    objc: "objectivec",
    "objective-c": "objectivec",
};

/**
 * Normalize language identifier
 */
export const normalizeLanguage = (lang: string): string => {
    const normalized = lang.toLowerCase().trim();
    return LANGUAGE_ALIASES[normalized] || normalized;
};

/**
 * Parse a code block from markdown fence syntax
 * Returns null if not a valid code block
 */
export const parseCodeBlock = (
    content: string,
    startIndex: number
): { block: CodeBlock; endIndex: number } | null => {
    const remaining = content.slice(startIndex);

    // Check for code fence start
    const fenceMatch = remaining.match(/^```(\w*)\n?/);
    if (!fenceMatch) return null;

    const language = normalizeLanguage(fenceMatch[1] || "text");
    const codeStart = fenceMatch[0].length;

    // Find the closing fence
    const closingIndex = remaining.indexOf("\n```", codeStart);

    if (closingIndex === -1) {
        // Incomplete code block (still streaming)
        return {
            block: {
                language,
                code: remaining.slice(codeStart),
                isComplete: false,
            },
            endIndex: content.length,
        };
    }

    const code = remaining.slice(codeStart, closingIndex);
    const endIndex = startIndex + closingIndex + 4; // +4 for "\n```"

    return {
        block: {
            language,
            code,
            isComplete: true,
        },
        endIndex,
    };
};

/**
 * Check if content contains an incomplete code block
 * Used for streaming detection
 */
export const hasIncompleteCodeBlock = (content: string): boolean => {
    const fenceStarts = content.match(/```/g) || [];
    return fenceStarts.length % 2 !== 0;
};

/**
 * Extract all code blocks from content
 */
export const extractCodeBlocks = (
    content: string
): { blocks: CodeBlock[]; positions: { start: number; end: number }[] } => {
    const blocks: CodeBlock[] = [];
    const positions: { start: number; end: number }[] = [];

    let currentIndex = 0;

    while (currentIndex < content.length) {
        const fenceIndex = content.indexOf("```", currentIndex);

        if (fenceIndex === -1) break;

        const result = parseCodeBlock(content, fenceIndex);

        if (result) {
            blocks.push(result.block);
            positions.push({ start: fenceIndex, end: result.endIndex });
            currentIndex = result.endIndex;
        } else {
            currentIndex = fenceIndex + 3;
        }
    }

    return { blocks, positions };
};

/**
 * Get language display name
 */
export const getLanguageDisplayName = (language: string): string => {
    const displayNames: Record<string, string> = {
        javascript: "JavaScript",
        typescript: "TypeScript",
        python: "Python",
        swift: "Swift",
        kotlin: "Kotlin",
        java: "Java",
        csharp: "C#",
        cpp: "C++",
        c: "C",
        go: "Go",
        rust: "Rust",
        ruby: "Ruby",
        php: "PHP",
        html: "HTML",
        css: "CSS",
        scss: "SCSS",
        json: "JSON",
        yaml: "YAML",
        xml: "XML",
        sql: "SQL",
        bash: "Bash",
        powershell: "PowerShell",
        markdown: "Markdown",
        text: "Plain Text",
        objectivec: "Objective-C",
        dart: "Dart",
        lua: "Lua",
        perl: "Perl",
        r: "R",
        scala: "Scala",
        groovy: "Groovy",
        haskell: "Haskell",
        elixir: "Elixir",
        clojure: "Clojure",
        graphql: "GraphQL",
        dockerfile: "Dockerfile",
        nginx: "Nginx",
        apache: "Apache",
    };

    return displayNames[language] || language.charAt(0).toUpperCase() + language.slice(1);
};
