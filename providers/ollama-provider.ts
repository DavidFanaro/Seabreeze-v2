/**
 * @file ollama-provider.ts
 * @purpose Ollama AI provider implementation for local model inference
 * @connects-to provider factory, fallback chain, auth store
 * 
 * OVERVIEW:
 * This module provides integration with Ollama, an open-source platform for running
 * large language models locally. It enables the app to use locally hosted AI models
 * for privacy-focused or offline functionality. The provider handles:
 * - Model creation and configuration
 * - Connection testing and validation
 * - Available model discovery
 * - URL normalization and validation
 * - Error handling and graceful fallbacks
 * 
 * ARCHITECTURE:
 * - Uses ollama-ai-provider-v2 as the core integration layer
 * - Leverages Expo's fetch implementation for React Native compatibility
 * - Integrates with the auth store for configuration management
 * - Provides robust error handling for network and configuration issues
 * 
 * DATA FLOW:
 * 1. Configuration retrieved from secure auth store
 * 2. URL normalized to Ollama API format
 * 3. Provider instance created with normalized configuration
 * 4. Model operations performed through the provider interface
 * 5. Errors caught and handled gracefully with null returns
 */

import { createOllama } from "ollama-ai-provider-v2";
import { LanguageModel } from "ai";
import { getProviderAuth } from "@/stores";
import { fetch as expoFetch } from "expo/fetch";

// ============================================================================
// URL NORMALIZATION UTILITIES
// ============================================================================

/**
 * Normalizes an Ollama base URL to ensure compatibility with the API
 * @param url - The raw URL from user configuration
 * @returns Properly formatted URL ending with /api
 * 
 * @description
 * Ollama's API endpoints are all under the /api path, but users commonly
 * configure just the base server URL (e.g., http://localhost:11434). This function
 * ensures the URL is properly formatted by:
 * 1. Removing any trailing slashes to prevent double slashes
 * 2. Checking if /api is already present
 * 3. Appending /api if not present
 * 
 * Examples:
 * - "http://localhost:11434" → "http://localhost:11434/api"
 * - "http://localhost:11434/" → "http://localhost:11434/api"
 * - "http://localhost:11434/api" → "http://localhost:11434/api"
 * - "http://localhost:11434/api/" → "http://localhost:11434/api"
 */
function normalizeOllamaUrl(url: string): string {
    const normalized = url.replace(/\/+$/, ""); // Remove trailing slashes
    if (normalized.endsWith("/api")) {
        return normalized;
    }
    return `${normalized}/api`;
}

// ============================================================================
// PROVIDER CREATION FUNCTIONS
// ============================================================================

/**
 * Creates a configured Ollama language model instance
 * @param modelId - The model identifier to use (defaults to "llama3.2")
 * @returns LanguageModel instance or null if configuration is invalid
 * 
 * @description
 * This is the primary factory function for creating Ollama model instances.
 * It handles the complete setup process including configuration retrieval,
 * URL normalization, and provider initialization. The function is designed
 * to fail gracefully and return null for any configuration or initialization
 * issues, allowing the fallback chain to continue to other providers.
 * 
 * Process:
 * 1. Retrieve Ollama URL from secure auth store
 * 2. Return null if no URL is configured
 * 3. Normalize the URL to proper API format
 * 4. Create Ollama provider with normalized URL and Expo fetch
 * 5. Create model instance with the specified model ID
 * 6. Cast to LanguageModel interface for compatibility
 * 7. Handle any errors and return null
 * 
 * The Expo fetch is used instead of the global fetch to ensure compatibility
 * with React Native environments where the global fetch may not be available
 * or may have different behavior.
 */
export function getOllamaModel(modelId: string = "llama3.2"): LanguageModel | null {
    try {
        const { url } = getProviderAuth("ollama");
        if (!url) {
            return null;
        }
        
        const baseURL = normalizeOllamaUrl(url);
        
        const provider = createOllama({ 
            baseURL,
            fetch: expoFetch as unknown as typeof globalThis.fetch,
        });
        const model = provider(modelId);
        return model as unknown as LanguageModel;
    } catch (error) {
        if (error instanceof Error) {
            // Error is caught but not logged to avoid console noise
            // Consider adding logging in debug builds
        }
        return null;
    }
}

/**
 * Checks if Ollama is properly configured with a valid URL
 * @returns boolean indicating if Ollama configuration exists
 * 
 * @description
 * This is a quick validation function that checks if the user has
 * configured an Ollama server URL in the auth store. It's used by the
 * UI to determine whether to show Ollama as an available option and
 * by the provider selection logic to skip Ollama if not configured.
 * 
 * The function simply checks for the existence of a URL string without
 * validating the URL format or testing connectivity, making it fast
 * for frequent calls during UI rendering.
 */
export function isOllamaConfigured(): boolean {
    const { url } = getProviderAuth("ollama");
    return !!url;
}

// ============================================================================
// CONNECTION TESTING FUNCTIONS
// ============================================================================

/**
 * Tests connectivity to an Ollama server
 * @param url - The Ollama server URL to test
 * @returns Promise resolving to true if connection is successful
 * 
 * @description
 * This function performs a lightweight connectivity test to verify that
 * an Ollama server is accessible and responding correctly. It's used by
 * the configuration UI to validate user-provided URLs and by the error
 * recovery system to test fallback connectivity.
 * 
 * Testing Strategy:
 * 1. Normalize the provided URL to proper API format
 * 2. Create AbortController for 5-second timeout
 * 3. Make GET request to /tags endpoint (lightweight API call)
 * 4. Clean up timeout regardless of outcome
 * 5. Return true only for successful responses (2xx status)
 * 
 * The /tags endpoint is used because it's:
 * - Available on all Ollama installations
 * - Lightweight (returns list of available models)
 * - Requires no authentication
 * - Indicates the server is running and ready for requests
 * 
 * The function catches all errors and returns false, making it safe
 * to use without additional error handling in calling code.
 */
export async function testOllamaConnection(url: string): Promise<boolean> {
    try {
        const baseURL = normalizeOllamaUrl(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await expoFetch(`${baseURL}/tags`, {
            method: "GET",
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}

// ============================================================================
// MODEL DISCOVERY FUNCTIONS
// ============================================================================

/**
 * Fetches the list of available models from an Ollama server
 * @param baseUrl - The base URL of the Ollama server
 * @returns Promise resolving to array of model names
 * 
 * @description
 * This function discovers what models are available on an Ollama server
 * by querying the /tags endpoint. It's used by the model selection UI
 * to populate the available models list and by the provider store to
 * keep the model list up to date.
 * 
 * Discovery Process:
 * 1. Normalize the base URL and construct the /api/tags endpoint
 * 2. Set up AbortController for 10-second timeout (longer for model lists)
 * 3. Make GET request with proper headers and timeout
 * 4. Validate response and parse JSON data
 * 5. Extract model names from response structure
 * 6. Handle different response formats gracefully
 * 7. Clean up timeout and return model list
 * 
 * Response Format Handling:
 * Ollama servers may return different JSON structures:
 * - Array format: ["model1", "model2", "model3"]
 * - Object format: { models: [{ name: "model1" }, { name: "model2" }] }
 * This function handles both formats for maximum compatibility.
 * 
 * Error Handling:
 * - Network errors, timeouts, and invalid responses all return empty array
 * - Individual error types are identified but not logged to avoid noise
 * - Function never throws, making it safe for UI usage
 * 
 * The 10-second timeout accounts for slower networks or servers with
 * many models that take longer to respond.
 */
export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
    try {
        // Normalize URL - remove trailing slashes and ensure proper format
        const normalizedUrl = baseUrl.replace(/\/+$/, "");
        const apiUrl = `${normalizedUrl}/api/tags`;


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
                return [];
            }

            const data = await response.json();

            // Handle different response structures
            let models: string[] = [];
            if (Array.isArray(data)) {
                models = data.map((m: any) => m.name || m);
            } else if (data.models && Array.isArray(data.models)) {
                models = data.models.map((m: { name: string }) => m.name);
            }

            return models;
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error) {

        // Provide more specific error information
        if (error instanceof TypeError && error.message.includes('Network request failed')) {
            // Network connectivity issues - could log in debug builds
        }

        return [];
    }
}

// ============================================================================
// PROVIDER OVERVIEW AND INTEGRATION
// ============================================================================

/**
 * Ollama Provider Integration Summary
 * 
 * This provider enables local AI model inference through Ollama, offering
 * privacy-focused AI capabilities without requiring external API calls.
 * It integrates seamlessly with the app's provider system and supports
 * the full range of chat functionality available to other providers.
 * 
 * Key Features:
 * - Local model inference for enhanced privacy
 * - Support for various open-source models (Llama, Mistral, CodeLlama, etc.)
 * - Automatic URL normalization for user-friendly configuration
 * - Robust error handling and graceful fallbacks
 * - Model discovery and management capabilities
 * - Connection testing for configuration validation
 * 
 * Integration Points:
 * - Provider Factory: Registered as "ollama" provider option
 * - Auth Store: Retrieves server URL from secure storage
 * - Fallback Chain: Used when other providers are unavailable
 * - Model Store: Updates available models list from server
 * - Settings UI: Configuration and model management interface
 * 
 * Configuration Requirements:
 * - Server URL (e.g., http://localhost:11434)
 * - No API keys required (local authentication)
 * - Ollama server must be running and accessible
 * 
 * Error Handling Strategy:
 * - Network errors return null to enable fallback
 * - Invalid configurations are silently handled
 * - Connection failures don't crash the app
 * - Model discovery failures return empty arrays
 * 
 * Usage Patterns:
 * - Primary provider for privacy-conscious users
 * - Fallback provider when cloud services are unavailable
 * - Development and testing with local models
 * - Offline capability when internet is unavailable
 * 
 * Performance Considerations:
 * - Local inference may be slower than cloud APIs
 * - Model size affects response time and memory usage
 * - Network latency eliminated for local servers
 * - Concurrent requests limited by local hardware
 * 
 * Security Benefits:
 * - No data transmission to external servers
 * - Complete control over model versions
 * - No API keys or authentication tokens
 * - Local data processing and storage
 * 
 * This provider represents the app's commitment to user privacy and
 * provides an important alternative to cloud-based AI services.
 */
