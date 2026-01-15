import { LanguageModel, generateText } from "ai";
import { ProviderId, PROVIDERS, PROVIDER_CAPABILITIES } from "@/types/provider.types";
import { createAppleModel } from "./apple-provider";
import { getOpenAIModel } from "./openai-provider";
import { getOpenRouterModel } from "./openrouter-provider";
import { getOllamaModel } from "./ollama-provider";
import { isProviderConfigured, getDefaultModelForProvider } from "@/stores";
import { getCachedModel, invalidateProviderCache } from "./provider-cache";

export { getDefaultModelForProvider };

export interface ProviderResult {
    model: LanguageModel | null;
    isConfigured: boolean;
    error?: string;
}

/**
 * Result of a real connection test
 */
export interface ConnectionTestResult {
    success: boolean;
    latencyMs?: number;
    error?: string;
    errorCategory?: "auth" | "network" | "model" | "unknown";
}

/**
 * Get a provider model with optional caching
 */
export function getProviderModel(providerId: ProviderId, modelId?: string): ProviderResult {
    const model = modelId || getDefaultModelForProvider(providerId);

    switch (providerId) {
        case "apple":
            return {
                model: createAppleModel() as LanguageModel,
                isConfigured: true,
            };
        case "openai":
            // Use cached model if available
            const openaiModel = getCachedModel(providerId, model, () => getOpenAIModel(model));
            return {
                model: openaiModel,
                isConfigured: isProviderConfigured("openai"),
                error: openaiModel ? undefined : "OpenAI API key not configured",
            };
        case "openrouter":
            const openrouterModel = getCachedModel(providerId, model, () => getOpenRouterModel(model));
            return {
                model: openrouterModel,
                isConfigured: isProviderConfigured("openrouter"),
                error: openrouterModel ? undefined : "OpenRouter API key not configured",
            };
        case "ollama":
            const ollamaModel = getCachedModel(providerId, model, () => getOllamaModel(model));
            return {
                model: ollamaModel,
                isConfigured: isProviderConfigured("ollama"),
                error: ollamaModel ? undefined : "Ollama URL not configured",
            };
        default:
            return {
                model: null,
                isConfigured: false,
                error: `Unknown provider: ${providerId}`,
            };
    }
}

export function isProviderAvailable(providerId: ProviderId): boolean {
    const info = PROVIDERS[providerId];
    if (!info) return false;

    if (providerId === "apple") {
        return true;
    }

    return isProviderConfigured(providerId);
}

export function getProviderInfo(providerId: ProviderId) {
    return PROVIDERS[providerId];
}

export function getProviderCapabilities(providerId: ProviderId) {
    return PROVIDER_CAPABILITIES[providerId];
}

export function getConfiguredProviders(): ProviderId[] {
    const configured: ProviderId[] = [];

    if (isProviderAvailable("apple")) {
        configured.push("apple");
    }
    if (isProviderAvailable("openai")) {
        configured.push("openai");
    }
    if (isProviderAvailable("openrouter")) {
        configured.push("openrouter");
    }
    if (isProviderAvailable("ollama")) {
        configured.push("ollama");
    }

    return configured;
}

export function getAllProviders(): ProviderId[] {
    return ["apple", "openai", "openrouter", "ollama"];
}

/**
 * Simple connection test that only creates a model (legacy behavior)
 */
export async function testProviderConnection(providerId: ProviderId, credentials: { apiKey?: string; url?: string }): Promise<boolean> {
    switch (providerId) {
        case "apple":
            return true;
        case "openai":
            if (!credentials.apiKey) return false;
            const { testOpenAIConnection } = await import("./openai-provider");
            return testOpenAIConnection(credentials.apiKey);
        case "openrouter":
            if (!credentials.apiKey) return false;
            const { testOpenRouterConnection } = await import("./openrouter-provider");
            return testOpenRouterConnection(credentials.apiKey);
        case "ollama":
            if (!credentials.url) return false;
            const { testOllamaConnection } = await import("./ollama-provider");
            return testOllamaConnection(credentials.url);
        default:
            return false;
    }
}

/**
 * Real connection test that makes an actual API call
 * This verifies the provider is not only configured but actually working
 */
export async function testProviderConnectionReal(
    providerId: ProviderId,
    credentials?: { apiKey?: string; url?: string },
    timeoutMs: number = 15000
): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
        // Get the model (this will use the stored credentials if not provided)
        let model: LanguageModel | null = null;

        switch (providerId) {
            case "apple":
                model = createAppleModel() as LanguageModel;
                break;
            case "openai":
                if (credentials?.apiKey) {
                    const { createOpenAI } = await import("@ai-sdk/openai");
                    const provider = createOpenAI({ apiKey: credentials.apiKey });
                    model = provider("gpt-4o-mini"); // Use a small, fast model for testing
                } else {
                    model = getOpenAIModel("gpt-4o-mini");
                }
                break;
            case "openrouter":
                if (credentials?.apiKey) {
                    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
                    const provider = createOpenRouter({ apiKey: credentials.apiKey });
                    model = provider("openai/gpt-4o-mini");
                } else {
                    model = getOpenRouterModel("openai/gpt-4o-mini");
                }
                break;
            case "ollama":
                if (credentials?.url) {
                    const { createOllama } = await import("ollama-ai-provider-v2");
                    const provider = createOllama({ baseURL: credentials.url });
                    model = provider("llama3.2") as unknown as LanguageModel;
                } else {
                    model = getOllamaModel("llama3.2");
                }
                break;
            default:
                return {
                    success: false,
                    error: `Unknown provider: ${providerId}`,
                    errorCategory: "unknown",
                };
        }

        if (!model) {
            return {
                success: false,
                error: "Failed to create model - provider may not be configured",
                errorCategory: "auth",
            };
        }

        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Connection test timed out")), timeoutMs);
        });

        // Make an actual API call with a simple prompt
        const testPromise = generateText({
            model,
            prompt: "Say 'OK' and nothing else.",
        });

        // Race between the test and timeout
        const result = await Promise.race([testPromise, timeoutPromise]);
        
        const latencyMs = Date.now() - startTime;

        // Verify we got a response
        if (result && typeof result.text === "string") {
            return {
                success: true,
                latencyMs,
            };
        }

        return {
            success: false,
            latencyMs,
            error: "Unexpected response format",
            errorCategory: "unknown",
        };
    } catch (error) {
        const latencyMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const apiError = error as any;

        // Categorize the error
        let errorCategory: ConnectionTestResult["errorCategory"] = "unknown";

        if (
            apiError?.statusCode === 401 ||
            apiError?.statusCode === 403 ||
            errorMessage.toLowerCase().includes("unauthorized") ||
            errorMessage.toLowerCase().includes("forbidden") ||
            errorMessage.toLowerCase().includes("api key")
        ) {
            errorCategory = "auth";
        } else if (
            errorMessage.toLowerCase().includes("network") ||
            errorMessage.toLowerCase().includes("fetch") ||
            errorMessage.toLowerCase().includes("connection") ||
            errorMessage.toLowerCase().includes("timeout") ||
            errorMessage.toLowerCase().includes("econnrefused")
        ) {
            errorCategory = "network";
        } else if (
            apiError?.statusCode === 404 ||
            errorMessage.toLowerCase().includes("model not found") ||
            errorMessage.toLowerCase().includes("does not exist")
        ) {
            errorCategory = "model";
        }

        return {
            success: false,
            latencyMs,
            error: errorMessage,
            errorCategory,
        };
    }
}

/**
 * Test all configured providers and return their status
 */
export async function testAllProviders(): Promise<Record<ProviderId, ConnectionTestResult>> {
    const results: Record<ProviderId, ConnectionTestResult> = {
        apple: { success: false, error: "Not tested" },
        openai: { success: false, error: "Not tested" },
        openrouter: { success: false, error: "Not tested" },
        ollama: { success: false, error: "Not tested" },
    };

    const configuredProviders = getConfiguredProviders();

    // Test all configured providers in parallel
    const testPromises = configuredProviders.map(async (providerId) => {
        const result = await testProviderConnectionReal(providerId);
        results[providerId] = result;
    });

    await Promise.all(testPromises);

    return results;
}

/**
 * Invalidate cached models for a provider (call when credentials change)
 */
export function invalidateProvider(providerId: ProviderId): void {
    invalidateProviderCache(providerId);
}

/**
 * Get the best available provider based on configuration and health
 */
export async function getBestAvailableProvider(): Promise<ProviderId | null> {
    const configured = getConfiguredProviders();
    
    if (configured.length === 0) {
        return null;
    }

    // Apple is always reliable if available
    if (configured.includes("apple")) {
        return "apple";
    }

    // Test other providers and return the first healthy one
    for (const providerId of configured) {
        const result = await testProviderConnectionReal(providerId, undefined, 5000);
        if (result.success) {
            return providerId;
        }
    }

    // No healthy providers, return the first configured one
    return configured[0];
}
