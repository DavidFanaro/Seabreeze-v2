/**
 * @file useErrorRecovery.ts
 * @purpose Comprehensive error recovery system for handling failed operations with intelligent retry logic,
 * exponential backoff, and React state management. Provides both utility functions and a React hook
 * for managing retry attempts in UI components.
 * 
 * Key Features:
 * - Exponential backoff with jitter to prevent thundering herd problems
 * - Configurable retry policies by error category
 * - React state management for real-time retry feedback
 * - Countdown timers and abort capabilities
 * - Automatic error classification and fallback handling
 */

import { useCallback, useRef, useState } from "react";
import { classifyError, ErrorClassification, ErrorCategory } from "@/providers/fallback-chain";

/**
 * ============================================================================
 * INTERFACES AND CONFIGURATION
 * ============================================================================
 */

/**
 * Configuration interface for retry behavior and policies.
 * Defines how the retry system should behave when encountering errors.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts before giving up */
  maxRetries: number;
  /** Base delay in milliseconds for the first retry attempt */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds to prevent excessively long waits */
  maxDelayMs: number;
  /** Multiplier for exponential backoff (e.g., 2 = double delay each attempt) */
  backoffMultiplier: number;
  /** Array of error categories that are eligible for retry */
  retryableCategories: ErrorCategory[];
}

/**
 * Default retry configuration used throughout the application.
 * Provides sensible defaults for most retry scenarios:
 * - 3 retry attempts balances reliability with responsiveness
 * - 1 second base delay with 2x multiplier = 1s, 2s, 4s delays
 * - 10 second cap prevents excessively long waits
 * - Focus on transient errors that typically resolve themselves
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableCategories: ["network", "rate_limit", "server_error", "timeout"],
};

/**
 * Interface representing the current state of retry attempts.
 * Used by the React hook to provide real-time feedback to the UI.
 */
export interface RetryState {
  /** Current attempt number (0-based, increments with each retry) */
  attemptNumber: number;
  /** The last error that triggered a retry attempt */
  lastError: ErrorClassification | null;
  /** Whether a retry is currently in progress */
  isRetrying: boolean;
  /** Seconds remaining until the next retry attempt (null if not counting down) */
  nextRetryIn: number | null;
}

/**
 * Result interface returned after a retry operation completes.
 * Provides comprehensive information about what happened during the retry process.
 */
export interface RetryResult<T> {
  /** Whether the operation ultimately succeeded */
  success: boolean;
  /** The successful result data (only present when success=true) */
  data?: T;
  /** The final error that caused failure (only present when success=false) */
  error?: ErrorClassification;
  /** Total number of attempts made (including initial attempt) */
  attempts: number;
  /** Whether the system should fallback to an alternative approach */
  shouldFallback: boolean;
}

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Calculates the delay for a retry attempt using exponential backoff with jitter.
 * This prevents the "thundering herd" problem where multiple clients retry simultaneously.
 * 
 * @param attemptNumber - Current attempt number (0-based)
 * @param config - Retry configuration containing backoff parameters
 * @returns Delay in milliseconds until the next retry should be attempted
 * 
 * Example with baseDelayMs=1000, backoffMultiplier=2:
 * - Attempt 0: 1000ms + jitter
 * - Attempt 1: 2000ms + jitter  
 * - Attempt 2: 4000ms + jitter
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  config: RetryConfig
): number {
  // Exponential backoff: baseDelay * (multiplier ^ attemptNumber)
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);
  
  // Add jitter (0-25% of delay) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * Math.random();
  
  // Cap at max delay to prevent excessively long waits
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Simple utility function to pause execution for a specified duration.
 * Used to implement the delay between retry attempts.
 * 
 * @param ms - Duration to sleep in milliseconds
 * @returns Promise that resolves after the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core retry function that executes an operation with automatic retry logic.
 * This is the heart of the error recovery system and can be used standalone
 * or through the React hook interface.
 * 
 * @param operation - The async operation to execute and potentially retry
 * @param config - Retry configuration (uses defaults if not provided)
 * @param onRetry - Optional callback called before each retry attempt for UI updates
 * @returns Promise<RetryResult<T>> with the final outcome including success state and metadata
 * 
 * @example
 * ```typescript
 * const result = await executeWithRetry(
 *   () => api.fetchData(),
 *   { maxRetries: 2, retryableCategories: ['network'] },
 *   (attempt, delay, error) => console.log(`Retry ${attempt} in ${delay}ms`)
 * );
 * if (result.success) {
 *   console.log('Success:', result.data);
 * } else {
 *   console.log('Failed after', result.attempts, 'attempts');
 * }
 * ```
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
 * ============================================================================
 * REACT HOOK
 * ============================================================================
 */

/**
 * React hook for managing retry state and error recovery in components.
 * Provides a complete interface for handling failed operations with real-time
 * UI feedback, countdown timers, and manual control over retry behavior.
 * 
 * Features:
 * - Automatic retry state management with React state
 * - Real-time countdown timers showing seconds until next retry
 * - Manual abort and reset capabilities
 * - Error recording and classification
 * - Integration with React lifecycle for proper cleanup
 * 
 * @param config - Partial retry configuration to override defaults
 * @returns Object containing state, actions, utilities, and final configuration
 * 
 * @example
 * ```typescript
 * const {
 *   retryState,
 *   executeWithRecovery,
 *   abortRetry,
 *   canRetry
 * } = useErrorRecovery({ maxRetries: 2 });
 * 
 * const handleSubmit = async () => {
 *   const result = await executeWithRecovery(() => 
 *     api.submitData(formData)
 *   );
 *   if (result.success) {
 *     // Handle success
 *   }
 * };
 * ```
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
