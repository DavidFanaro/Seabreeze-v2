/**
 * @file syntaxHighlighter.ts
 * @purpose Custom syntax highlighting engine for code blocks (TypeScript-focused)
 */

import type { SyntaxTheme } from "../styles";

export type TokenType =
    | "keyword"
    | "string"
    | "number"
    | "comment"
    | "function"
    | "variable"
    | "operator"
    | "punctuation"
    | "className"
    | "property"
    | "type"
    | "constant"
    | "boolean"
    | "regex"
    | "tag"
    | "attribute"
    | "default";

export interface SyntaxToken {
    type: TokenType;
    content: string;
}

export interface HighlightedLine {
    lineNumber: number;
    tokens: SyntaxToken[];
}

// Language-specific keyword definitions
const KEYWORDS: Record<string, Set<string>> = {
    typescript: new Set([
        "abstract",
        "as",
        "async",
        "await",
        "break",
        "case",
        "catch",
        "class",
        "const",
        "continue",
        "debugger",
        "declare",
        "default",
        "delete",
        "do",
        "else",
        "enum",
        "export",
        "extends",
        "finally",
        "for",
        "from",
        "function",
        "get",
        "if",
        "implements",
        "import",
        "in",
        "instanceof",
        "interface",
        "is",
        "keyof",
        "let",
        "module",
        "namespace",
        "new",
        "null",
        "of",
        "package",
        "private",
        "protected",
        "public",
        "readonly",
        "require",
        "return",
        "set",
        "static",
        "super",
        "switch",
        "this",
        "throw",
        "try",
        "type",
        "typeof",
        "undefined",
        "var",
        "void",
        "while",
        "with",
        "yield",
    ]),
    javascript: new Set([
        "async",
        "await",
        "break",
        "case",
        "catch",
        "class",
        "const",
        "continue",
        "debugger",
        "default",
        "delete",
        "do",
        "else",
        "export",
        "extends",
        "finally",
        "for",
        "from",
        "function",
        "get",
        "if",
        "import",
        "in",
        "instanceof",
        "let",
        "new",
        "null",
        "of",
        "return",
        "set",
        "static",
        "super",
        "switch",
        "this",
        "throw",
        "try",
        "typeof",
        "undefined",
        "var",
        "void",
        "while",
        "with",
        "yield",
    ]),
    python: new Set([
        "False",
        "None",
        "True",
        "and",
        "as",
        "assert",
        "async",
        "await",
        "break",
        "class",
        "continue",
        "def",
        "del",
        "elif",
        "else",
        "except",
        "finally",
        "for",
        "from",
        "global",
        "if",
        "import",
        "in",
        "is",
        "lambda",
        "nonlocal",
        "not",
        "or",
        "pass",
        "raise",
        "return",
        "try",
        "while",
        "with",
        "yield",
    ]),
    swift: new Set([
        "Any",
        "AnyObject",
        "Array",
        "Bool",
        "Character",
        "Dictionary",
        "Double",
        "Float",
        "Int",
        "Optional",
        "Self",
        "Set",
        "String",
        "Type",
        "as",
        "associatedtype",
        "async",
        "await",
        "break",
        "case",
        "catch",
        "class",
        "continue",
        "deinit",
        "defer",
        "do",
        "else",
        "enum",
        "extension",
        "fallthrough",
        "false",
        "fileprivate",
        "for",
        "func",
        "guard",
        "if",
        "import",
        "in",
        "init",
        "inout",
        "internal",
        "is",
        "lazy",
        "let",
        "nil",
        "open",
        "operator",
        "override",
        "private",
        "protocol",
        "public",
        "repeat",
        "required",
        "return",
        "self",
        "some",
        "static",
        "struct",
        "subscript",
        "super",
        "switch",
        "throw",
        "throws",
        "true",
        "try",
        "typealias",
        "var",
        "weak",
        "where",
        "while",
    ]),
    json: new Set([]),
    css: new Set([
        "important",
        "inherit",
        "initial",
        "unset",
        "none",
        "auto",
        "block",
        "inline",
        "flex",
        "grid",
        "absolute",
        "relative",
        "fixed",
        "sticky",
    ]),
    html: new Set([]),
    bash: new Set([
        "if",
        "then",
        "else",
        "elif",
        "fi",
        "case",
        "esac",
        "for",
        "while",
        "do",
        "done",
        "in",
        "function",
        "select",
        "until",
        "time",
        "coproc",
        "local",
        "export",
        "return",
        "exit",
        "break",
        "continue",
    ]),
    sql: new Set([
        "SELECT",
        "FROM",
        "WHERE",
        "AND",
        "OR",
        "NOT",
        "INSERT",
        "INTO",
        "VALUES",
        "UPDATE",
        "SET",
        "DELETE",
        "CREATE",
        "TABLE",
        "DROP",
        "ALTER",
        "INDEX",
        "JOIN",
        "LEFT",
        "RIGHT",
        "INNER",
        "OUTER",
        "ON",
        "AS",
        "ORDER",
        "BY",
        "ASC",
        "DESC",
        "GROUP",
        "HAVING",
        "LIMIT",
        "OFFSET",
        "UNION",
        "NULL",
        "TRUE",
        "FALSE",
        "PRIMARY",
        "KEY",
        "FOREIGN",
        "REFERENCES",
        "CONSTRAINT",
        "DEFAULT",
        "UNIQUE",
        "CHECK",
        "EXISTS",
        "IN",
        "LIKE",
        "BETWEEN",
        "IS",
        "DISTINCT",
        "COUNT",
        "SUM",
        "AVG",
        "MIN",
        "MAX",
    ]),
    go: new Set([
        "break",
        "case",
        "chan",
        "const",
        "continue",
        "default",
        "defer",
        "else",
        "fallthrough",
        "for",
        "func",
        "go",
        "goto",
        "if",
        "import",
        "interface",
        "map",
        "package",
        "range",
        "return",
        "select",
        "struct",
        "switch",
        "type",
        "var",
        "nil",
        "true",
        "false",
        "iota",
    ]),
    rust: new Set([
        "as",
        "async",
        "await",
        "break",
        "const",
        "continue",
        "crate",
        "dyn",
        "else",
        "enum",
        "extern",
        "false",
        "fn",
        "for",
        "if",
        "impl",
        "in",
        "let",
        "loop",
        "match",
        "mod",
        "move",
        "mut",
        "pub",
        "ref",
        "return",
        "self",
        "Self",
        "static",
        "struct",
        "super",
        "trait",
        "true",
        "type",
        "unsafe",
        "use",
        "where",
        "while",
    ]),
};

// Built-in types for TypeScript/JavaScript
const BUILTIN_TYPES = new Set([
    "Array",
    "Boolean",
    "Date",
    "Error",
    "Function",
    "JSON",
    "Map",
    "Math",
    "Number",
    "Object",
    "Promise",
    "Proxy",
    "Reflect",
    "RegExp",
    "Set",
    "String",
    "Symbol",
    "WeakMap",
    "WeakSet",
    "console",
    "document",
    "window",
    "global",
    "process",
    "Buffer",
    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",
    "fetch",
    "Request",
    "Response",
    "Headers",
    "URL",
    "URLSearchParams",
    // React Native specific
    "View",
    "Text",
    "Image",
    "ScrollView",
    "FlatList",
    "TouchableOpacity",
    "StyleSheet",
    "Animated",
    "Dimensions",
    "Platform",
    // React specific
    "React",
    "useState",
    "useEffect",
    "useCallback",
    "useMemo",
    "useRef",
    "useContext",
    "useReducer",
    "Component",
    "Fragment",
    "FC",
    "ReactNode",
]);

// Operators
const OPERATORS = new Set([
    "+",
    "-",
    "*",
    "/",
    "%",
    "=",
    "==",
    "===",
    "!=",
    "!==",
    "<",
    ">",
    "<=",
    ">=",
    "&&",
    "||",
    "!",
    "&",
    "|",
    "^",
    "~",
    "<<",
    ">>",
    ">>>",
    "+=",
    "-=",
    "*=",
    "/=",
    "%=",
    "?",
    ":",
    "=>",
    "...",
    "??",
    "?.",
]);

/**
 * Tokenize a line of code
 */
const tokenizeLine = (line: string, language: string): SyntaxToken[] => {
    const tokens: SyntaxToken[] = [];
    const keywords = KEYWORDS[language] || KEYWORDS.typescript;
    let remaining = line;

    while (remaining.length > 0) {
        // Skip whitespace but preserve it
        const whitespaceMatch = remaining.match(/^(\s+)/);
        if (whitespaceMatch) {
            tokens.push({ type: "default", content: whitespaceMatch[1] });
            remaining = remaining.slice(whitespaceMatch[1].length);
            continue;
        }

        // Single-line comment
        if (
            remaining.startsWith("//") ||
            remaining.startsWith("#") ||
            remaining.startsWith("--")
        ) {
            tokens.push({ type: "comment", content: remaining });
            break;
        }

        // Multi-line comment start (just capture until end of line)
        if (remaining.startsWith("/*")) {
            const endIndex = remaining.indexOf("*/");
            if (endIndex !== -1) {
                tokens.push({ type: "comment", content: remaining.slice(0, endIndex + 2) });
                remaining = remaining.slice(endIndex + 2);
                continue;
            } else {
                tokens.push({ type: "comment", content: remaining });
                break;
            }
        }

        // Strings (double quotes)
        if (remaining.startsWith('"')) {
            const endIndex = findStringEnd(remaining, '"');
            tokens.push({ type: "string", content: remaining.slice(0, endIndex) });
            remaining = remaining.slice(endIndex);
            continue;
        }

        // Strings (single quotes)
        if (remaining.startsWith("'")) {
            const endIndex = findStringEnd(remaining, "'");
            tokens.push({ type: "string", content: remaining.slice(0, endIndex) });
            remaining = remaining.slice(endIndex);
            continue;
        }

        // Template literals
        if (remaining.startsWith("`")) {
            const endIndex = findStringEnd(remaining, "`");
            tokens.push({ type: "string", content: remaining.slice(0, endIndex) });
            remaining = remaining.slice(endIndex);
            continue;
        }

        // Numbers
        const numberMatch = remaining.match(/^(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?)/);
        if (numberMatch) {
            tokens.push({ type: "number", content: numberMatch[1] });
            remaining = remaining.slice(numberMatch[1].length);
            continue;
        }

        // Regex (simplified detection)
        if (remaining.startsWith("/") && !remaining.startsWith("//")) {
            const regexMatch = remaining.match(/^\/(?:[^/\\]|\\.)+\/[gimsuy]*/);
            if (regexMatch) {
                tokens.push({ type: "regex", content: regexMatch[0] });
                remaining = remaining.slice(regexMatch[0].length);
                continue;
            }
        }

        // Operators (check multi-char operators first)
        for (const op of ["===", "!==", ">>>", "...", "??", "?.", "=>", "==", "!=", "<=", ">=", "&&", "||", "<<", ">>"]) {
            if (remaining.startsWith(op)) {
                tokens.push({ type: "operator", content: op });
                remaining = remaining.slice(op.length);
                break;
            }
        }
        if (tokens.length > 0 && tokens[tokens.length - 1].type === "operator") {
            continue;
        }

        // Single-char operators
        if (OPERATORS.has(remaining[0])) {
            tokens.push({ type: "operator", content: remaining[0] });
            remaining = remaining.slice(1);
            continue;
        }

        // Punctuation
        if (/^[{}()\[\];,.]/.test(remaining)) {
            tokens.push({ type: "punctuation", content: remaining[0] });
            remaining = remaining.slice(1);
            continue;
        }

        // Identifiers
        const identifierMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        if (identifierMatch) {
            const identifier = identifierMatch[1];
            let tokenType: TokenType = "default";

            // Check if it's a keyword
            if (keywords.has(identifier)) {
                tokenType = "keyword";
            }
            // Check for booleans
            else if (identifier === "true" || identifier === "false") {
                tokenType = "boolean";
            }
            // Check for built-in types/objects (PascalCase or known types)
            else if (BUILTIN_TYPES.has(identifier) || /^[A-Z][a-zA-Z0-9]*$/.test(identifier)) {
                tokenType = "type";
            }
            // Check if it looks like a function call (followed by `(`)
            else if (remaining.slice(identifier.length).trimStart().startsWith("(")) {
                tokenType = "function";
            }
            // Check if it's a property access (preceded by `.`)
            else if (tokens.length > 0 && tokens[tokens.length - 1].content === ".") {
                tokenType = "property";
            }
            // Constants (all uppercase)
            else if (/^[A-Z_][A-Z0-9_]*$/.test(identifier) && identifier.length > 1) {
                tokenType = "constant";
            }

            tokens.push({ type: tokenType, content: identifier });
            remaining = remaining.slice(identifier.length);
            continue;
        }

        // HTML/JSX tags
        if (language === "html" || language === "typescript" || language === "javascript") {
            const tagMatch = remaining.match(/^(<\/?[a-zA-Z][a-zA-Z0-9]*)/);
            if (tagMatch) {
                tokens.push({ type: "tag", content: tagMatch[1] });
                remaining = remaining.slice(tagMatch[1].length);
                continue;
            }
        }

        // Default: single character
        tokens.push({ type: "default", content: remaining[0] });
        remaining = remaining.slice(1);
    }

    return tokens;
};

/**
 * Find the end of a string, handling escape characters
 */
const findStringEnd = (str: string, quote: string): number => {
    let i = 1;
    while (i < str.length) {
        if (str[i] === "\\") {
            i += 2; // Skip escape sequence
        } else if (str[i] === quote) {
            return i + 1;
        } else {
            i++;
        }
    }
    return str.length;
};

/**
 * Highlight code and return tokenized lines
 */
export const highlightCode = (code: string, language: string): HighlightedLine[] => {
    const lines = code.split("\n");
    return lines.map((line, index) => ({
        lineNumber: index + 1,
        tokens: tokenizeLine(line, language),
    }));
};

/**
 * Get color for a token type from the syntax theme
 */
export const getTokenColor = (tokenType: TokenType, syntaxTheme: SyntaxTheme): string => {
    return syntaxTheme[tokenType] || syntaxTheme.default;
};

/**
 * Render tokens as plain text (for copy functionality)
 */
export const tokensToPlainText = (lines: HighlightedLine[]): string => {
    return lines.map((line) => line.tokens.map((token) => token.content).join("")).join("\n");
};
