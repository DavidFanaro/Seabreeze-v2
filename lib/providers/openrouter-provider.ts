import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { LanguageModel } from "ai";
import { getProviderAuth } from "@/stores/useAIStore";
import { fetch as expoFetch } from "expo/fetch";

export function getOpenRouterModel(modelId: string = "openai/gpt-4o"): LanguageModel | null {
    const { apiKey } = getProviderAuth("openrouter");
    if (!apiKey) {
        console.error("OpenRouter: API key is missing");
        return null;
    }
    console.log("OpenRouter: Creating provider with API key, model:", modelId);
    const provider = createOpenRouter({ 
        apiKey,
        fetch: expoFetch as unknown as typeof globalThis.fetch,
    });
    return provider(modelId);
}

export function createOpenRouterProvider(apiKey: string): OpenRouterProvider {
    return createOpenRouter({ 
        apiKey,
        fetch: expoFetch as unknown as typeof globalThis.fetch,
    });
}

export function isOpenRouterConfigured(): boolean {
    const { apiKey } = getProviderAuth("openrouter");
    return !!apiKey;
}

export async function testOpenRouterConnection(apiKey: string): Promise<boolean> {
    try {
        const provider = createOpenRouter({ 
            apiKey,
            fetch: expoFetch as unknown as typeof globalThis.fetch,
        });
        const model = provider("openai/gpt-4o-mini");
        return true;
    } catch (error) {
        console.error("OpenRouter connection test failed:", error);
        return false;
    }
}
