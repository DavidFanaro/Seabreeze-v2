import { LanguageModel } from "ai";
import { ProviderId } from "@/types/provider.types";
import { getProviderModel, ProviderResult, isProviderAvailable } from "./provider-factory";
import { getDefaultModelForProvider, isProviderConfigured } from "@/stores";

// ============================================================================
// PROVIDER FALLBACK CONFIGURATION
// ============================================================================

/**
 * Priority order for provider fallback
 * 
 * This array defines the fallback strategy when a preferred provider is unavailable.
 * The order is carefully chosen based on availability, reliability, and user experience:
 * 
 * 1. Apple Intelligence - Always available on Apple devices, no API keys needed
 * 2. OpenAI - Most reliable cloud provider with best uptime
 * 3. OpenRouter - Access to multiple models/providers, good reliability
 * 4. Ollama - Local models, requires user setup but provides offline capability
 */
export const PROVIDER_FALLBACK_ORDER: ProviderId[] = [
  "apple",      // Always available on Apple devices, no configuration required
  "openai",     // Most reliable cloud provider with proven uptime
  "openrouter", // Access to multiple providers via single API
  "ollama",     // Local backup option for privacy/offline use
];

// ============================================================================
// ERROR CLASSIFICATION SYSTEM
// ============================================================================

/**
 * Error categories for determining fallback behavior
 * 
 * Each category represents a different type of failure that may occur during
 * provider communication. The classification determines whether the error is
 * retryable and whether we should immediately fallback to another provider.
 */
export type ErrorCategory = 
  | "configuration"   // Missing API key, URL, or setup issues
  | "network"         // Network connectivity or DNS issues
  | "rate_limit"      // API rate limiting or quota exceeded
  | "authentication"  // Invalid credentials, expired tokens
  | "model_not_found" // Requested model doesn't exist for provider
  | "server_error"    // Provider server errors (5xx responses)
  | "timeout"         // Request timeout or slow response
  | "unknown";        // Uncategorized or unexpected errors

/**
 * Error classification result
 * 
 * This interface provides structured information about an error to help the
 * application make intelligent decisions about retrying, falling back, or
 * providing user feedback.
 * 
 * @property category - The type of error that occurred
 * @property isRetryable - Whether the same request might succeed on retry
 * @property shouldFallback - Whether we should immediately try another provider
 * @property message - User-friendly error message for display
 */
export interface ErrorClassification {
  category: ErrorCategory;
  isRetryable: boolean;
  shouldFallback: boolean;
  message: string;
}

/**
 * Classify an error to determine appropriate handling strategy
 * 
 * This function analyzes errors from API providers and determines the best
 * response strategy. It examines error messages, HTTP status codes, and
 * provider-specific error flags to categorize the failure and recommend
 * retry/fallback behavior.
 * 
 * The classification logic follows this priority:
 * 1. Configuration and authentication errors (permanent, require fallback)
 * 2. Rate limiting (retryable, but fallback preferred for UX)
 * 3. Network and server errors (retryable, fallback recommended)
 * 4. Timeout errors (retryable, fallback recommended)
 * 5. Unknown errors (fallback by default)
 * 
 * @param error - The error object or message from a provider
 * @returns ErrorClassification with handling strategy
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

// ============================================================================
// FALLBACK RESULT TYPES
// ============================================================================

/**
 * Result of a provider fallback attempt
 * 
 * This interface represents the outcome of trying to obtain a language model,
 * either from the preferred provider or through the fallback chain. It provides
 * complete visibility into what was attempted and why.
 * 
 * @property model - The successfully obtained LanguageModel, or null if all failed
 * @property provider - The provider that supplied the model
 * @property modelId - The model identifier that was requested/used
 * @property isOriginal - Whether this is the originally preferred provider
 * @property fallbackReason - Human-readable explanation of why fallback occurred
 * @property attemptedProviders - Complete list of providers that were tried in order
 * @property error - Error message if no provider could be obtained
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

// ============================================================================
// MAIN FALLBACK LOGIC
// ============================================================================

/**
 * Get a model with automatic fallback to other providers if the preferred one fails
 * 
 * This is the core function for provider resilience. It attempts to obtain a model
 * from the preferred provider first, then systematically tries fallback providers
 * in the defined priority order until a working model is found.
 * 
 * The algorithm works as follows:
 * 1. Try the preferred provider with the specified model
 * 2. If that fails, iterate through PROVIDER_FALLBACK_ORDER
 * 3. Skip excluded providers, already-tried providers, and unavailable providers
 * 4. For each fallback provider, use its default model (not the preferred model)
 * 5. Return the first successful model or a failure result
 * 
 * @param preferredProvider - The provider the user or system prefers to use
 * @param preferredModel - The specific model identifier to request
 * @param excludeProviders - Optional list of providers to exclude from fallback
 * @returns FallbackResult containing the model and metadata about the attempt
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
 * This function is used during runtime error handling to determine the next
 * provider to try when the current provider fails. It uses error classification
 * to decide whether fallback is appropriate and then finds the next available
 * provider in the fallback chain.
 * 
 * The function considers:
 * - Whether the error type warrants fallback (via classifyError)
 * - Which providers have already failed to avoid repeated failures
 * - Provider availability to skip unavailable options
 * 
 * @param currentProvider - The provider that just experienced an error
 * @param failedProviders - Array of providers that have previously failed in this session
 * @param error - The error object that triggered the fallback request
 * @returns Object with next provider and model, or null if no fallback available
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
 * 
 * This utility function helps the UI and logic determine whether fallback
 * options exist before attempting operations. It's useful for:
 * - Disabling retry buttons when no fallback exists
 * - Showing appropriate error messages
 * - Making proactive decisions about which provider to use
 * 
 * @param currentProvider - The provider currently in use
 * @param failedProviders - List of providers that have already failed
 * @returns True if at least one fallback provider is available
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
 * 
 * This function provides a comprehensive view of all providers in the fallback
 * chain along with their configuration status. It's primarily used by the UI
 * to display provider selection options and status indicators.
 * 
 * The returned array maintains the fallback order and includes a boolean
 * indicating whether each provider is properly configured and ready to use.
 * 
 * @returns Array of providers with their configuration status in fallback order
 */
export function getAvailableProviders(): { provider: ProviderId; isConfigured: boolean }[] {
  return PROVIDER_FALLBACK_ORDER.map((provider) => ({
    provider,
    isConfigured: isProviderConfigured(provider),
  }));
}

// ============================================================================
// DETAILED PROVIDER EXPLANATION
// ============================================================================

/**
 * Fallback Chain Provider System Overview
 * 
 * The fallback chain system is designed to provide maximum reliability and
 * availability for AI model access across different providers. It implements
 * a sophisticated error handling and provider selection strategy that ensures
 * users can always access AI functionality, even when individual providers fail.
 * 
 * === PROVIDER STRATEGY ===
 * 
 * 1. Apple Intelligence (Primary)
 *    - Always available on Apple devices running supported OS versions
 *    - No configuration required, built into the OS
 *    - Local processing, no network dependency
 *    - Limited to supported models but most reliable option
 * 
 * 2. OpenAI (Secondary)
 *    - Industry-leading reliability and uptime
 *    - Supports the widest range of models
 *    - Requires API key configuration
 *    - Best for general-purpose AI tasks
 * 
 * 3. OpenRouter (Tertiary)
 *    - Access to multiple model providers via single API
 *    - Provider redundancy built-in (Claude, GPT, etc.)
 *    - Requires API key and account setup
 *    - Good fallback when OpenAI is unavailable
 * 
 * 4. Ollama (Local Backup)
 *    - Local model hosting for privacy and offline use
 *    - Requires user setup and local hardware
 *    - Limited to locally installed models
 *    - Ultimate fallback when all cloud options fail
 * 
 * === ERROR HANDLING PHILOSOPHY ===
 * 
 * The system categorizes errors to make intelligent decisions:
 * 
 * - Permanent Failures (Immediate Fallback):
 *   * Configuration errors: Missing API keys, invalid setup
 *   * Authentication errors: Invalid/expired credentials
 *   * Model not found: Requested model unavailable
 * 
 * - Temporary Failures (Retry + Fallback):
 *   * Rate limiting: Too many requests, quota exceeded
 *   * Network issues: Connection problems, DNS failures
 *   * Server errors: Provider downtime, 5xx responses
 *   * Timeouts: Slow responses or network delays
 * 
 * === FALLBACK ALGORITHM ===
 * 
 * When a provider fails, the system:
 * 
 * 1. Classifies the error to determine if fallback is appropriate
 * 2. Checks if the error is retryable for potential immediate retry
 * 3. Selects the next provider in the priority order that:
 *    - Has not been tried already
 *    - Is not explicitly excluded
 *    - Is available and configured
 * 4. Uses the fallback provider's default model (not the preferred model)
 * 5. Tracks all attempts for debugging and user feedback
 * 
 * === USER EXPERIENCE CONSIDERATIONS ===
 * 
 * - Seamless fallback: Users see minimal disruption during provider switches
 * - Transparent feedback: Clear messages about why fallback occurred
 * - Preference memory: System remembers user's preferred provider when available
 * - Configuration guidance: Helpful error messages for setup issues
 * - Performance awareness: Prioritizes fastest/most reliable options
 * 
 * === DEBUGGING AND MONITORING ===
 * 
 * The system provides comprehensive logging and tracking:
 * 
 * - Complete attempt history in FallbackResult.attemptedProviders
 * - Clear fallback reasons for user display
 * - Error classification for targeted debugging
 * - Provider availability status for UI indicators
 * - Configuration status checks for setup guidance
 * 
 * This architecture ensures that the application remains functional and
 * responsive regardless of individual provider issues, providing users
 * with consistent AI capabilities across different scenarios and environments.
 */
