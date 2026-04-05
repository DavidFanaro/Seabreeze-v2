import { type streamText } from "ai";

import type { ThinkingLevel } from "@/types/chat.types";
import type { ProviderId } from "@/types/provider.types";

type StreamingProviderOptions = Parameters<typeof streamText>[0]["providerOptions"];

export function getStreamingProviderOptions(
    provider: ProviderId,
    shouldRequestThinking: boolean,
    thinkingLevel?: ThinkingLevel,
): StreamingProviderOptions {
    if (!shouldRequestThinking) {
        return undefined;
    }

    const effectiveThinkingLevel: ThinkingLevel = thinkingLevel ?? "medium";

    if (provider === "openai") {
        return {
            openai: {
                reasoningEffort: effectiveThinkingLevel,
                reasoningSummary: "auto",
            },
        };
    }

    if (provider === "openrouter") {
        return {
            openrouter: {
                includeReasoning: true,
                reasoning: {
                    effort: effectiveThinkingLevel,
                },
            },
        };
    }

    if (provider === "ollama") {
        return {
            ollama: {
                think: true,
            },
        };
    }

    return undefined;
}
