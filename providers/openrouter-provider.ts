import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { LanguageModel } from "ai";
import { getProviderAuth } from "@/stores";
import { fetch as expoFetch } from "expo/fetch";

/**
 * @file openrouter-provider.ts
 * @purpose OpenRouter AI provider implementation for accessing various models through the OpenRouter API.
 * 
 * OpenRouter is an API gateway that provides unified access to multiple AI models from different providers
 * including OpenAI, Anthropic, Meta, Google, and many others. It offers a single API endpoint with standardized
 * request/response formats, allowing developers to switch between models and providers without changing code.
 * 
 * Key features:
 * - Single API key for access to 100+ models from various providers
 * - Unified pricing and billing across all models
 * - Fallback and load balancing capabilities
 * - Model-specific parameter handling and routing
 * - Support for streaming responses and function calling
 * - Cost tracking and usage analytics
 * 
 * This provider integrates OpenRouter with the AI SDK, enabling seamless model creation and usage
 * within the chat application. It handles authentication, model instantiation, connection testing,
 * and configuration management.
 */

// ============================================================================
// Model Creation Functions
// ============================================================================

/**
 * Creates an OpenRouter language model instance with the specified model ID.
 * 
 * This function retrieves the stored API key from the auth store and creates an OpenRouter
 * provider instance with the necessary configuration. It uses expo/fetch to ensure
 * compatibility with React Native environments where the global fetch might not be available.
 * 
 * @param modelId - The OpenRouter model identifier to use. Defaults to "openai/gpt-4o".
 *                  Examples: "openai/gpt-4o", "anthropic/claude-3-sonnet", "meta/llama-3.1-70b-instruct"
 * @returns A LanguageModel instance for the specified model, or null if no API key is configured
 * 
 * @example
 * ```typescript
 * const model = getOpenRouterModel("anthropic/claude-3-sonnet");
 * if (model) {
 *   // Use model with AI SDK
 *   const response = await generateText({ model, prompt: "Hello!" });
 * }
 * ```
 */
export function getOpenRouterModel(modelId: string = "openai/gpt-4o"): LanguageModel | null {
    try {
        const { apiKey } = getProviderAuth("openrouter");
        if (!apiKey) {
            return null;
        }
        const provider = createOpenRouter({ 
            apiKey,
            fetch: expoFetch as unknown as typeof globalThis.fetch,
        });
        return provider(modelId);
    } catch (error) {
        return null;
    }
}

/**
 * Creates an OpenRouter provider instance with the given API key.
 * 
 * This is a lower-level function that creates the provider without retrieving credentials
 * from the store. It's useful for testing, custom authentication flows, or when you have
 * an API key from a different source.
 * 
 * @param apiKey - The OpenRouter API key for authentication
 * @returns A configured OpenRouterProvider instance
 * 
 * @example
 * ```typescript
 * const provider = createOpenRouterProvider("sk-or-v1-...");
 * const model = provider("openai/gpt-4o");
 * ```
 */
export function createOpenRouterProvider(apiKey: string): OpenRouterProvider {
    return createOpenRouter({ 
        apiKey,
        fetch: expoFetch as unknown as typeof globalThis.fetch,
    });
}

// ============================================================================
// Configuration Management Functions
// ============================================================================

/**
 * Checks if OpenRouter is properly configured with an API key.
 * 
 * This function verifies that the user has entered a valid API key in the app settings.
 * It doesn't validate the key's correctness, only that one exists in storage.
 * 
 * @returns true if an API key is configured, false otherwise
 * 
 * @example
 * ```typescript
 * if (isOpenRouterConfigured()) {
 *   // Show OpenRouter model options
 * } else {
 *   // Prompt user to enter API key
 * }
 * ```
 */
export function isOpenRouterConfigured(): boolean {
    const { apiKey } = getProviderAuth("openrouter");
    return !!apiKey;
}

// ============================================================================
// Connection Testing Functions
// ============================================================================

/**
 * Tests the validity of an OpenRouter API key by making a request to the models endpoint.
 * 
 * This function performs a simple API call to verify that the provided API key is valid
 * and has the necessary permissions to access the OpenRouter API. It tests against the
 * /api/v1/models endpoint which is lightweight and universally accessible.
 * 
 * The function handles all types of errors gracefully, returning false for any failure
 * including network issues, invalid API keys, or server errors.
 * 
 * @param apiKey - The OpenRouter API key to test
 * @returns true if the API key is valid and connection succeeds, false otherwise
 * 
 * @example
 * ```typescript
 * const isValid = await testOpenRouterConnection("sk-or-v1-...");
 * if (isValid) {
 *   // Save the API key to storage
 *   await updateProviderAuth("openrouter", { apiKey });
 * } else {
 *   // Show error message to user
 * }
 * ```
 */
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
