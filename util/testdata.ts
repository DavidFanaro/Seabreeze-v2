import { MessageRole } from "./types";

export const testdata = [
    {
        id: 0,
        role: "user" as MessageRole,
        message: "Hello World",
    },
    {
        id: 1,
        role: "assistant" as MessageRole,
        message: `## Headers

    # This is a Heading h1
    ## This is a Heading h2
    ###### This is a Heading h6

    ## Emphasis

    *This text will be italic*
    _This will also be italic_

    **This text will be bold**
    __This will also be bold__

    _You **can** combine them_
`,
    },
    {
        id: 2,
        role: "user" as MessageRole,
        message:
            "Can you summarize the following paragraph in one concise sentence? The quick brown fox jumps over the lazy dog repeatedly to test sample text generation and character coverage.",
    },
    {
        id: 3,
        role: "assistant" as MessageRole,
        message:
            "Sure — the paragraph describes a quick brown fox repeatedly jumping over a lazy dog as sample text to exercise character coverage.",
    },
    {
        id: 4,
        role: "user" as MessageRole,
        message: `Here's a small TypeScript example:

\`\`\`ts
type Point = { x: number; y: number };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
\`\`\`

Could you explain what this does?`,
    },
    {
        id: 5,
        role: "assistant" as MessageRole,
        message: `This code defines a Point type and a function distance that computes the Euclidean distance between two points using Math.hypot.`,
    },
    {
        id: 6,
        role: "user" as MessageRole,
        message:
            "Give me a short checklist:\n- Install dependencies\n- Run tests\n- Lint code\n- Build",
    },
    {
        id: 7,
        role: "assistant" as MessageRole,
        message: `Checklist received. Quick tips:
- Use a lockfile for reproducible installs.
- Run tests in CI on every PR.
- Keep linting rules consistent across team.`,
    },
    {
        id: 8,
        role: "user" as MessageRole,
        message:
            "Multilingual test: こんにちは、世界！ Привет, мир! 안녕하세요 세계!",
    },
];
