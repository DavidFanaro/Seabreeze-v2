// =============================================================================
// PROVIDER FACTORY - Centralized AI Provider Management
// =============================================================================
// This file serves as the central hub for managing all AI providers in the
// Seabreeze application. It abstracts away the complexity of different AI
// providers (Apple Intelligence, OpenAI, OpenRouter, Ollama) and provides a
// unified interface for the rest of the application.
//
// Key responsibilities:
// - Provider model creation and caching
// - Configuration validation
// - Connection testing and health monitoring
// - Provider availability detection
// - Error handling and categorization
// =============================================================================

import { LanguageModel, generateText } from "ai";
import { ProviderId, PROVIDERS, PROVIDER_CAPABILITIES } from "@/types/provider.types";
import { createAppleModel } from "./apple-provider";
import { getOpenAIModel } from "./openai-provider";
import { getOpenRouterModel } from "./openrouter-provider";
import { getOllamaModel } from "./ollama-provider";
import { isProviderConfigured, getDefaultModelForProvider } from "@/stores";
import { getCachedModel, invalidateProviderCache } from "./provider-cache";

export { getDefaultModelForProvider };

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Result object returned when requesting a provider model.
 * Encapsulates the model instance along with configuration status and any errors.
 */
export interface ProviderResult {
    /** The AI language model instance or null if unavailable */
    model: LanguageModel | null;
    /** Whether the provider is properly configured with valid credentials */
    isConfigured: boolean;
    /** Human-readable error message if model creation failed */
    error?: string;
}

/**
 * Comprehensive result of a provider connection test.
 * Provides detailed information about connection quality and any issues.
 */
export interface ConnectionTestResult {
    /** Whether the connection test was successful */
    success: boolean;
    /** Measured latency in milliseconds for the API call */
    latencyMs?: number;
    /** Detailed error message if the test failed */
    error?: string;
    /** Categorized error type for better error handling and UI feedback */
    errorCategory?: "auth" | "network" | "model" | "unknown";
}

// =============================================================================
// CORE PROVIDER FUNCTIONS
// =============================================================================

/**
 * Primary factory function for obtaining AI provider models.
 * This is the main entry point for the application to get AI models from any
 * configured provider. It handles model creation, caching, and error handling.
 * 
 * @param providerId - The identifier of the AI provider (apple, openai, openrouter, ollama)
 * @param modelId - Optional specific model ID, defaults to provider's default model
 * @returns ProviderResult containing the model instance and configuration status
 */
export function getProviderModel(providerId: ProviderId, modelId?: string): ProviderResult {
    // Determine which model to use - either specified or provider's default
    const model = modelId || getDefaultModelForProvider(providerId);

    // Provider-specific model creation logic
    // Each provider has unique requirements for initialization and configuration
    switch (providerId) {
        case "apple":
            // Apple Intelligence is always available on Apple devices
            // No configuration required - uses device's native AI capabilities
            return {
                model: createAppleModel() as LanguageModel,
                isConfigured: true,
            };
        case "openai":
            // OpenAI requires API key configuration
            // Use cached model for performance, create new if not cached
            const openaiModel = getCachedModel(providerId, model, () => getOpenAIModel(model));
            return {
                model: openaiModel,
                isConfigured: isProviderConfigured("openai"),
                error: openaiModel ? undefined : "OpenAI API key not configured",
            };
        case "openrouter":
            // OpenRouter acts as an aggregator for multiple model providers
            // Requires API key and provides access to various models through one interface
            const openrouterModel = getCachedModel(providerId, model, () => getOpenRouterModel(model));
            return {
                model: openrouterModel,
                isConfigured: isProviderConfigured("openrouter"),
                error: openrouterModel ? undefined : "OpenRouter API key not configured",
            };
        case "ollama":
            // Ollama provides local AI model hosting
            // Requires base URL configuration for the local server
            const ollamaModel = getCachedModel(providerId, model, () => getOllamaModel(model));
            return {
                model: ollamaModel,
                isConfigured: isProviderConfigured("ollama"),
                error: ollamaModel ? undefined : "Ollama URL not configured",
            };
        default:
            // Fallback for unknown provider identifiers
            return {
                model: null,
                isConfigured: false,
                error: `Unknown provider: ${providerId}`,
            };
    }
}

/**
 * Checks if a provider is available for use based on device capabilities
 * and configuration status. This is a lightweight check that doesn't involve
 * network requests.
 * 
 * @param providerId - The provider identifier to check
 * @returns Boolean indicating if the provider is available
 */
export function isProviderAvailable(providerId: ProviderId): boolean {
    // Check if provider exists in our configuration
    const info = PROVIDERS[providerId];
    if (!info) return false;

    // Apple Intelligence is always available on Apple devices
    if (providerId === "apple") {
        return true;
    }

    // Other providers require explicit configuration (API keys, URLs, etc.)
    return isProviderConfigured(providerId);
}

/**
 * Retrieves basic information about a provider including name and description.
 * 
 * @param providerId - The provider identifier
 * @returns Provider info object from the PROVIDERS constant
 */
export function getProviderInfo(providerId: ProviderId) {
    return PROVIDERS[providerId];
}

/**
 * Retrieves capabilities information for a provider (supported features, models, etc.).
 * 
 * @param providerId - The provider identifier
 * @returns Provider capabilities object from PROVIDER_CAPABILITIES constant
 */
export function getProviderCapabilities(providerId: ProviderId) {
    return PROVIDER_CAPABILITIES[providerId];
}

/**
 * Returns a list of all currently configured and available providers.
 * This is used by the UI to show available options and by the fallback system
 * to determine which providers can be used.
 * 
 * @returns Array of ProviderId strings for available providers
 */
export function getConfiguredProviders(): ProviderId[] {
    const configured: ProviderId[] = [];

    // Check each provider individually and collect available ones
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

/**
 * Returns a list of all supported provider identifiers regardless of configuration.
 * This is useful for UI purposes where we want to show all options, even
 * unconfigured ones.
 * 
 * @returns Array of all supported ProviderId strings
 */
export function getAllProviders(): ProviderId[] {
    return ["apple", "openai", "openrouter", "ollama"];
}

// =============================================================================
// CONNECTION TESTING FUNCTIONS
// =============================================================================

/**
 * Legacy connection test function that only validates model creation.
 * This is the original simple test that doesn't make actual API calls.
 * Kept for backward compatibility.
 * 
 * @deprecated Use testProviderConnectionReal for comprehensive testing
 * @param providerId - The provider to test
 * @param credentials - Optional credentials to test with
 * @returns Boolean indicating if model creation succeeded
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
 * Comprehensive connection test that performs actual API calls.
 * This is the preferred method for testing provider connectivity as it
 * validates both configuration and functional availability by making
 * a real API request to the provider.
 * 
 * @param providerId - The provider to test
 * @param credentials - Optional credentials to test with (uses stored if not provided)
 * @param timeoutMs - Maximum time to wait for response (default 15 seconds)
 * @returns Detailed ConnectionTestResult with success status and metrics
 */
export async function testProviderConnectionReal(
    providerId: ProviderId,
    credentials?: { apiKey?: string; url?: string },
    timeoutMs: number = 15000
): Promise<ConnectionTestResult> {
    // Record start time for latency measurement
    const startTime = Date.now();

    try {
        // Get the model instance for testing
        // Use provided credentials or fall back to stored configuration
        let model: LanguageModel | null = null;

        // Provider-specific model creation for testing
        // We use lightweight models specifically chosen for fast testing
        switch (providerId) {
            case "apple":
                // Apple Intelligence uses device-native capabilities
                model = createAppleModel() as LanguageModel;
                break;
            case "openai":
                // Test with gpt-4o-mini - smallest, fastest OpenAI model
                if (credentials?.apiKey) {
                    const { createOpenAI } = await import("@ai-sdk/openai");
                    const provider = createOpenAI({ apiKey: credentials.apiKey });
                    model = provider("gpt-4o-mini");
                } else {
                    model = getOpenAIModel("gpt-4o-mini");
                }
                break;
            case "openrouter":
                // Test with OpenRouter's version of gpt-4o-mini
                if (credentials?.apiKey) {
                    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
                    const provider = createOpenRouter({ apiKey: credentials.apiKey });
                    model = provider("openai/gpt-4o-mini");
                } else {
                    model = getOpenRouterModel("openai/gpt-4o-mini");
                }
                break;
            case "ollama":
                // Test with llama3.2 - commonly available in Ollama
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

        // Validate that we successfully created a model
        if (!model) {
            return {
                success: false,
                error: "Failed to create model - provider may not be configured",
                errorCategory: "auth",
            };
        }

        // Create a timeout promise to prevent hanging on unresponsive providers
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Connection test timed out")), timeoutMs);
        });

        // Make an actual API call with a minimal, predictable prompt
        // Using "Say 'OK'" ensures minimal processing and fast response
        const testPromise = generateText({
            model,
            prompt: "Say 'OK' and nothing else.",
        });

        // Race the API call against the timeout to enforce time limits
        const result = await Promise.race([testPromise, timeoutPromise]);
        
        // Calculate total latency including model creation time
        const latencyMs = Date.now() - startTime;

        // Validate that we received a proper response
        if (result && typeof result.text === "string") {
            return {
                success: true,
                latencyMs,
            };
        }

        // If we got here, something unexpected happened with the response
        return {
            success: false,
            latencyMs,
            error: "Unexpected response format",
            errorCategory: "unknown",
        };
    } catch (error) {
        // Calculate latency even for failed requests
        const latencyMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const apiError = error as any;

        // Categorize the error for better user experience and debugging
        let errorCategory: ConnectionTestResult["errorCategory"] = "unknown";

        // Authentication/Authorization errors (bad API keys, permissions)
        if (
            apiError?.statusCode === 401 ||
            apiError?.statusCode === 403 ||
            errorMessage.toLowerCase().includes("unauthorized") ||
            errorMessage.toLowerCase().includes("forbidden") ||
            errorMessage.toLowerCase().includes("api key")
        ) {
            errorCategory = "auth";
        }
        // Network-related errors (connection issues, timeouts)
        else if (
            errorMessage.toLowerCase().includes("network") ||
            errorMessage.toLowerCase().includes("fetch") ||
            errorMessage.toLowerCase().includes("connection") ||
            errorMessage.toLowerCase().includes("timeout") ||
            errorMessage.toLowerCase().includes("econnrefused")
        ) {
            errorCategory = "network";
        }
        // Model-specific errors (invalid model name, unsupported)
        else if (
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
 * Tests all configured providers in parallel to assess their health.
 * This function is useful for dashboard displays and initial health checks.
 * 
 * @returns Record mapping each ProviderId to its ConnectionTestResult
 */
export async function testAllProviders(): Promise<Record<ProviderId, ConnectionTestResult>> {
    // Initialize all providers with default "not tested" status
    const results: Record<ProviderId, ConnectionTestResult> = {
        apple: { success: false, error: "Not tested" },
        openai: { success: false, error: "Not tested" },
        openrouter: { success: false, error: "Not tested" },
        ollama: { success: false, error: "Not tested" },
    };

    // Get only the providers that are actually configured
    const configuredProviders = getConfiguredProviders();

    // Test all configured providers in parallel for efficiency
    const testPromises = configuredProviders.map(async (providerId) => {
        const result = await testProviderConnectionReal(providerId);
        results[providerId] = result;
    });

    await Promise.all(testPromises);

    return results;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clears cached model instances for a specific provider.
 * This should be called whenever provider credentials are updated to ensure
 * fresh model creation with new credentials.
 * 
 * @param providerId - The provider whose cache should be invalidated
 */
export function invalidateProvider(providerId: ProviderId): void {
    invalidateProviderCache(providerId);
}

/**
 * Intelligently selects the best available provider based on multiple factors.
 * Implements a hierarchy: Apple Intelligence (most reliable) → healthy providers → any configured.
 * This is used by the fallback system and automatic provider selection.
 * 
 * @param timeoutMs - Optional timeout for health checks (default 5 seconds)
 * @returns The best ProviderId or null if no providers are configured
 */
export async function getBestAvailableProvider(timeoutMs: number = 5000): Promise<ProviderId | null> {
    const configured = getConfiguredProviders();
    
    // No providers configured at all
    if (configured.length === 0) {
        return null;
    }

    // Apple Intelligence is always the preferred choice when available
    // It's device-native, has no network latency, and no API costs
    if (configured.includes("apple")) {
        return "apple";
    }

    // Test other providers to find the healthiest one
    // This ensures we pick a provider that's actually responding
    for (const providerId of configured) {
        const result = await testProviderConnectionReal(providerId, undefined, timeoutMs);
        if (result.success) {
            return providerId;
        }
    }

    // Fallback: return the first configured provider even if unhealthy
    // This allows the app to attempt using it and surface appropriate errors
    return configured[0];
}

// =============================================================================
// PROVIDER FACTORY SUMMARY
// =============================================================================
// 
// The Provider Factory is the architectural centerpiece of Seabreeze's multi-provider
// AI system. It provides a unified interface that abstracts the complexity of
// different AI providers while enabling intelligent fallback and health monitoring.
//
// ARCHITECTURAL BENEFITS:
// 1. Abstraction: The rest of the app doesn't need to know provider specifics
// 2. Flexibility: Easy to add new providers without changing application code
// 3. Reliability: Built-in health checking and intelligent fallback mechanisms
// 4. Performance: Model caching reduces initialization overhead
// 5. Monitoring: Comprehensive testing and error categorization
//
// USAGE PATTERNS:
// - For getting a model: getProviderModel(providerId, modelId)
// - For checking availability: isProviderAvailable(providerId)
// - For health monitoring: testProviderConnectionReal(providerId)
// - For automatic selection: getBestAvailableProvider()
//
// The factory enables the application to seamlessly switch between providers
// based on availability, performance, and user preferences, creating a robust
// and flexible AI-powered experience.
// =============================================================================
