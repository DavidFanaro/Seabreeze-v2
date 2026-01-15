import { LanguageModel } from "ai";
import { ProviderId } from "@/lib/types/provider-types";
import { getProviderModel, ProviderResult, isProviderAvailable } from "./provider-factory";
import { getDefaultModelForProvider, isProviderConfigured } from "@/stores/useAIStore";

/**
 * Priority order for provider fallback
 * Apple is always first as it's always available and local
 * Then cloud providers in order of reliability
 */
export const PROVIDER_FALLBACK_ORDER: ProviderId[] = [
  "apple",      // Always available on Apple devices
  "openai",     // Most reliable cloud provider
  "openrouter", // Access to multiple providers
  "ollama",     // Local backup (requires setup)
];

/**
 * Error categories for determining fallback behavior
 */
export type ErrorCategory = 
  | "configuration"   // Missing API key, URL, etc.
  | "network"         // Network connectivity issues
  | "rate_limit"      // API rate limiting
  | "authentication"  // Invalid credentials
  | "model_not_found" // Model doesn't exist
  | "server_error"    // Provider server errors
  | "timeout"         // Request timeout
  | "unknown";        // Uncategorized errors

/**
 * Determine if an error is retryable or requires fallback
 */
export interface ErrorClassification {
  category: ErrorCategory;
  isRetryable: boolean;
  shouldFallback: boolean;
  message: string;
}

/**
 * Classify an error to determine appropriate handling
 */
export function classifyError(error: unknown): ErrorClassification {
  if (!error) {
    return {
      category: "unknown",
      isRetryable: false,
      shouldFallback: true,
      message: "Unknown error occurred",
    };
  }

  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const apiError = error as any;

  // Check for API-specific error properties
  const statusCode = apiError?.statusCode || apiError?.status;
  const isRetryableFlag = apiError?.isRetryable;

  // Configuration errors - not retryable, should fallback
  if (
    errorMessage.includes("api key") ||
    errorMessage.includes("not configured") ||
    errorMessage.includes("missing")
  ) {
    return {
      category: "configuration",
      isRetryable: false,
      shouldFallback: true,
      message: "Provider not configured properly",
    };
  }

  // Authentication errors (401, 403)
  if (statusCode === 401 || statusCode === 403 || errorMessage.includes("unauthorized") || errorMessage.includes("forbidden")) {
    return {
      category: "authentication",
      isRetryable: false,
      shouldFallback: true,
      message: "Authentication failed - check your API key",
    };
  }

  // Rate limiting (429)
  if (statusCode === 429 || errorMessage.includes("rate limit") || errorMessage.includes("too many requests")) {
    return {
      category: "rate_limit",
      isRetryable: true,
      shouldFallback: true,  // Fallback to avoid user waiting
      message: "Rate limit exceeded - please wait or try another provider",
    };
  }

  // Model not found (404)
  if (statusCode === 404 || errorMessage.includes("model not found") || errorMessage.includes("does not exist")) {
    return {
      category: "model_not_found",
      isRetryable: false,
      shouldFallback: true,
      message: "Model not found - try a different model",
    };
  }

  // Server errors (5xx)
  if (statusCode >= 500 && statusCode < 600) {
    return {
      category: "server_error",
      isRetryable: true,
      shouldFallback: true,
      message: "Provider server error - trying alternative",
    };
  }

  // Network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("fetch") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("econnrefused") ||
    errorMessage.includes("enotfound")
  ) {
    return {
      category: "network",
      isRetryable: true,
      shouldFallback: true,
      message: "Network error - check your connection",
    };
  }

  // Timeout errors
  if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
    return {
      category: "timeout",
      isRetryable: true,
      shouldFallback: true,
      message: "Request timed out - trying alternative",
    };
  }

  // Use isRetryable flag if available
  if (typeof isRetryableFlag === "boolean") {
    return {
      category: "unknown",
      isRetryable: isRetryableFlag,
      shouldFallback: !isRetryableFlag,
      message: error instanceof Error ? error.message : "An error occurred",
    };
  }

  // Default: unknown error
  return {
    category: "unknown",
    isRetryable: false,
    shouldFallback: true,
    message: error instanceof Error ? error.message : "An unexpected error occurred",
  };
}

/**
 * Result of a fallback attempt
 */
export interface FallbackResult {
  model: LanguageModel | null;
  provider: ProviderId;
  modelId: string;
  isOriginal: boolean;
  fallbackReason?: string;
  attemptedProviders: ProviderId[];
  error?: string;
}

/**
 * Get a model with automatic fallback to other providers if the preferred one fails
 * 
 * @param preferredProvider - The provider to try first
 * @param preferredModel - The model to use (if provider is available)
 * @param excludeProviders - Providers to skip in fallback chain
 * @returns FallbackResult with the best available model
 */
export function getModelWithFallback(
  preferredProvider: ProviderId,
  preferredModel: string,
  excludeProviders: ProviderId[] = []
): FallbackResult {
  const attemptedProviders: ProviderId[] = [];
  
  // Try preferred provider first
  if (!excludeProviders.includes(preferredProvider)) {
    attemptedProviders.push(preferredProvider);
    const result = getProviderModel(preferredProvider, preferredModel);
    
    if (result.model && result.isConfigured) {
      return {
        model: result.model,
        provider: preferredProvider,
        modelId: preferredModel,
        isOriginal: true,
        attemptedProviders,
      };
    }
  }

  // Try fallback providers in order
  for (const fallbackProvider of PROVIDER_FALLBACK_ORDER) {
    // Skip if already tried or excluded
    if (
      fallbackProvider === preferredProvider ||
      excludeProviders.includes(fallbackProvider) ||
      attemptedProviders.includes(fallbackProvider)
    ) {
      continue;
    }

    attemptedProviders.push(fallbackProvider);

    // Check if provider is available before trying
    if (!isProviderAvailable(fallbackProvider)) {
      continue;
    }

    const fallbackModelId = getDefaultModelForProvider(fallbackProvider);
    const result = getProviderModel(fallbackProvider, fallbackModelId);

    if (result.model && result.isConfigured) {
      return {
        model: result.model,
        provider: fallbackProvider,
        modelId: fallbackModelId,
        isOriginal: false,
        fallbackReason: `${preferredProvider} unavailable, using ${fallbackProvider}`,
        attemptedProviders,
      };
    }
  }

  // No providers available
  return {
    model: null,
    provider: preferredProvider,
    modelId: preferredModel,
    isOriginal: true,
    attemptedProviders,
    error: "No configured providers available",
  };
}

/**
 * Get the next available fallback provider after an error
 * 
 * @param currentProvider - The provider that just failed
 * @param failedProviders - List of providers that have already failed
 * @param error - The error that occurred
 * @returns The next provider to try, or null if none available
 */
export function getNextFallbackProvider(
  currentProvider: ProviderId,
  failedProviders: ProviderId[],
  error: unknown
): { provider: ProviderId; model: string } | null {
  const classification = classifyError(error);
  
  // If error shouldn't trigger fallback, return null
  if (!classification.shouldFallback) {
    return null;
  }

  const allFailed = [...failedProviders, currentProvider];

  for (const provider of PROVIDER_FALLBACK_ORDER) {
    if (allFailed.includes(provider)) {
      continue;
    }

    if (isProviderAvailable(provider)) {
      return {
        provider,
        model: getDefaultModelForProvider(provider),
      };
    }
  }

  return null;
}

/**
 * Check if any fallback providers are available
 */
export function hasFallbackAvailable(
  currentProvider: ProviderId,
  failedProviders: ProviderId[] = []
): boolean {
  const excluded = [...failedProviders, currentProvider];
  
  return PROVIDER_FALLBACK_ORDER.some(
    (provider) => !excluded.includes(provider) && isProviderAvailable(provider)
  );
}

/**
 * Get list of all available providers for user selection
 */
export function getAvailableProviders(): { provider: ProviderId; isConfigured: boolean }[] {
  return PROVIDER_FALLBACK_ORDER.map((provider) => ({
    provider,
    isConfigured: isProviderConfigured(provider),
  }));
}
