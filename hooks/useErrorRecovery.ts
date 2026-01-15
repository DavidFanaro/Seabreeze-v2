import { useCallback, useRef, useState } from "react";
import { classifyError, ErrorClassification, ErrorCategory } from "@/lib/providers/fallback-chain";

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableCategories: ErrorCategory[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableCategories: ["network", "rate_limit", "server_error", "timeout"],
};

/**
 * State of retry attempts
 */
export interface RetryState {
  attemptNumber: number;
  lastError: ErrorClassification | null;
  isRetrying: boolean;
  nextRetryIn: number | null;
}

/**
 * Result of a retry attempt
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: ErrorClassification;
  attempts: number;
  shouldFallback: boolean;
}

/**
 * Calculate delay for exponential backoff with jitter
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  config: RetryConfig
): number {
  // Exponential backoff: baseDelay * (multiplier ^ attemptNumber)
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);
  
  // Add jitter (0-25% of delay) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * Math.random();
  
  // Cap at max delay
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an operation with automatic retry logic
 * 
 * @param operation - The async operation to execute
 * @param config - Retry configuration
 * @param onRetry - Callback called before each retry attempt
 * @returns RetryResult with the outcome
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attemptNumber: number, delay: number, error: ErrorClassification) => void
): Promise<RetryResult<T>> {
  let lastError: ErrorClassification | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt + 1,
        shouldFallback: false,
      };
    } catch (error) {
      lastError = classifyError(error);
      
      // Check if this error category is retryable
      const isRetryableCategory = config.retryableCategories.includes(lastError.category);
      const isRetryable = lastError.isRetryable && isRetryableCategory;
      
      // If not retryable or we've exhausted retries, stop
      if (!isRetryable || attempt >= config.maxRetries) {
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
          shouldFallback: lastError.shouldFallback,
        };
      }
      
      // Calculate delay and wait before retry
      const delay = calculateBackoffDelay(attempt, config);
      onRetry?.(attempt + 1, delay, lastError);
      await sleep(delay);
    }
  }
  
  // Should not reach here, but handle gracefully
  return {
    success: false,
    error: lastError || { category: "unknown", isRetryable: false, shouldFallback: true, message: "Unknown error" },
    attempts: config.maxRetries + 1,
    shouldFallback: true,
  };
}

/**
 * Hook for managing retry state in React components
 */
export function useErrorRecovery(config: Partial<RetryConfig> = {}) {
  const mergedConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  const [retryState, setRetryState] = useState<RetryState>({
    attemptNumber: 0,
    lastError: null,
    isRetrying: false,
    nextRetryIn: null,
  });
  
  const abortRef = useRef<boolean>(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Clear any running countdown
   */
  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  /**
   * Reset retry state
   */
  const resetRetryState = useCallback(() => {
    abortRef.current = false;
    clearCountdown();
    setRetryState({
      attemptNumber: 0,
      lastError: null,
      isRetrying: false,
      nextRetryIn: null,
    });
  }, [clearCountdown]);

  /**
   * Abort any ongoing retry attempts
   */
  const abortRetry = useCallback(() => {
    abortRef.current = true;
    clearCountdown();
    setRetryState((prev) => ({
      ...prev,
      isRetrying: false,
      nextRetryIn: null,
    }));
  }, [clearCountdown]);

  /**
   * Execute an operation with retry logic, updating state throughout
   */
  const executeWithRecovery = useCallback(
    async <T>(operation: () => Promise<T>): Promise<RetryResult<T>> => {
      resetRetryState();
      
      const onRetry = (attemptNumber: number, delay: number, error: ErrorClassification) => {
        if (abortRef.current) return;
        
        setRetryState({
          attemptNumber,
          lastError: error,
          isRetrying: true,
          nextRetryIn: Math.ceil(delay / 1000),
        });
        
        // Start countdown
        let remaining = Math.ceil(delay / 1000);
        clearCountdown();
        countdownRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0 || abortRef.current) {
            clearCountdown();
            setRetryState((prev) => ({ ...prev, nextRetryIn: null }));
          } else {
            setRetryState((prev) => ({ ...prev, nextRetryIn: remaining }));
          }
        }, 1000);
      };
      
      const result = await executeWithRetry(operation, mergedConfig, onRetry);
      
      clearCountdown();
      
      if (!result.success && result.error) {
        setRetryState((prev) => ({
          ...prev,
          lastError: result.error!,
          isRetrying: false,
          nextRetryIn: null,
        }));
      } else {
        resetRetryState();
      }
      
      return result;
    },
    [mergedConfig, resetRetryState, clearCountdown]
  );

  /**
   * Manually trigger a retry with a specific error
   */
  const recordError = useCallback((error: unknown) => {
    const classification = classifyError(error);
    setRetryState((prev) => ({
      ...prev,
      lastError: classification,
      attemptNumber: prev.attemptNumber + 1,
    }));
    return classification;
  }, []);

  /**
   * Check if we can still retry
   */
  const canRetry = retryState.attemptNumber < mergedConfig.maxRetries && 
    retryState.lastError?.isRetryable === true;

  /**
   * Get time until next retry is allowed (for rate limiting)
   */
  const getRetryAfter = useCallback((): number | null => {
    if (!retryState.lastError || retryState.lastError.category !== "rate_limit") {
      return null;
    }
    return calculateBackoffDelay(retryState.attemptNumber, mergedConfig);
  }, [retryState, mergedConfig]);

  return {
    // State
    retryState,
    canRetry,
    
    // Actions
    executeWithRecovery,
    recordError,
    resetRetryState,
    abortRetry,
    
    // Utilities
    getRetryAfter,
    
    // Config
    config: mergedConfig,
  };
}

/**
 * Create a simple retry wrapper for one-off operations
 */
export function createRetryableOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): () => Promise<RetryResult<T>> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  return () => executeWithRetry(operation, mergedConfig);
}
