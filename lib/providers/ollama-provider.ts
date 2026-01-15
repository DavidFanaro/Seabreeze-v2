import { createOllama, type OllamaProvider } from "ollama-ai-provider-v2";
import { LanguageModel } from "ai";
import { getProviderAuth } from "@/stores/useAIStore";
import { fetch as expoFetch } from "expo/fetch";

/**
 * Normalize the Ollama base URL to ensure it ends with /api
 * The ollama-ai-provider-v2 package expects the base URL to include /api
 */
function normalizeOllamaUrl(url: string): string {
    const normalized = url.replace(/\/+$/, ""); // Remove trailing slashes
    if (normalized.endsWith("/api")) {
        return normalized;
    }
    return `${normalized}/api`;
}

export function getOllamaModel(modelId: string = "llama3.2"): LanguageModel | null {
    try {
        const { url } = getProviderAuth("ollama");
        if (!url) {
            console.error("Ollama: URL not configured");
            return null;
        }
        
        const baseURL = normalizeOllamaUrl(url);
        console.log("Ollama: Creating provider with URL:", baseURL, "and model:", modelId);
        
        const provider = createOllama({ 
            baseURL,
            fetch: expoFetch as unknown as typeof globalThis.fetch,
        });
        const model = provider(modelId);
        console.log("Ollama: Model created successfully");
        return model as unknown as LanguageModel;
    } catch (error) {
        console.error("Ollama: Error creating model:", error);
        if (error instanceof Error) {
            console.error("Ollama: Error message:", error.message);
            console.error("Ollama: Error stack:", error.stack);
        }
        return null;
    }
}

export function isOllamaConfigured(): boolean {
    const { url } = getProviderAuth("ollama");
    return !!url;
}

export async function testOllamaConnection(url: string): Promise<boolean> {
    try {
        const baseURL = normalizeOllamaUrl(url);
        const provider = createOllama({ 
            baseURL,
            fetch: expoFetch as unknown as typeof globalThis.fetch,
        });
        const model = provider("llama3.2");
        return true;
    } catch {
        return false;
    }
}

export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
    try {
        // Normalize URL - remove trailing slashes and ensure proper format
        const normalizedUrl = baseUrl.replace(/\/+$/, "");
        const apiUrl = `${normalizedUrl}/api/tags`;

        console.log("Fetching Ollama models from:", apiUrl);

        // Add timeout using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await expoFetch(apiUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error("Ollama API error:", response.status, response.statusText);
                return [];
            }

            const data = await response.json();
            console.log("Ollama API response:", data);

            // Handle different response structures
            let models: string[] = [];
            if (Array.isArray(data)) {
                models = data.map((m: any) => m.name || m);
            } else if (data.models && Array.isArray(data.models)) {
                models = data.models.map((m: { name: string }) => m.name);
            }

            console.log("Parsed models:", models);
            return models;
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error) {
        console.error("Fetch Ollama models error:", error);

        // Provide more specific error information
        if (error instanceof TypeError && error.message.includes('Network request failed')) {
            console.error("Network error. Check if URL is correct and server is accessible.");
            console.error("URL being used:", baseUrl);
            console.error("Ensure Ollama is running and accessible from this device.");
        }

        return [];
    }
}
