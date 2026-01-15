import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { LanguageModel } from "ai";
import { getProviderAuth } from "@/stores";
import { fetch as expoFetch } from "expo/fetch";

export function getOpenRouterModel(modelId: string = "openai/gpt-4o"): LanguageModel | null {
    const { apiKey } = getProviderAuth("openrouter");
    if (!apiKey) {
        return null;
    }
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
        const response = await expoFetch("https://openrouter.ai/api/v1/models", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
        });
        
        return response.ok;
    } catch (error) {
        return false;
    }
}
