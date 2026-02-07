/**
 * @file useErrorRecovery.test.ts
 * @purpose Test suite for error recovery functionality
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, jest, it } from "@jest/globals";
import { classifyError } from "@/providers/fallback-chain";
import {
  calculateBackoffDelay,
  DEFAULT_RETRY_CONFIG,
  executeWithRetry,
  selectCanRetry,
  selectRetryAfterMs,
  type RetryConfig,
  type RetryState,
  useErrorRecovery,
} from "../useErrorRecovery";

// Mock the fallback-chain module
jest.mock("@/providers/fallback-chain", () => ({
  classifyError: jest.fn(),
}));

describe("useErrorRecovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================
  describe("calculateBackoffDelay", () => {
    it("should calculate correct exponential backoff delays", () => {
      const config: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        retryableCategories: ["network"],
      };

      const attempt1 = calculateBackoffDelay(0, config);
      const attempt2 = calculateBackoffDelay(1, config);

      expect(attempt1).toBeGreaterThanOrEqual(1000);
      expect(attempt1).toBeLessThan(1250);
      expect(attempt2).toBeGreaterThanOrEqual(2000);
      expect(attempt2).toBeLessThan(2500);
    });

    it("should respect max delay cap", () => {
      const config: RetryConfig = {
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 3000,
        backoffMultiplier: 4,
        retryableCategories: ["network"],
      };

      const delay = calculateBackoffDelay(2, config);
      expect(delay).toBeLessThanOrEqual(3000);
    });
  });

  // ============================================================================
  // executeWithRetry TESTS
  // ============================================================================
  describe("executeWithRetry", () => {
    it("should return success on first attempt", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");
      (classifyError as jest.Mock).mockReturnValue({
        category: "unknown",
        isRetryable: false,
        shouldFallback: false,
        message: "Test error",
      });

      const result = await executeWithRetry(mockOperation);

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should retry retryable errors and eventually succeed", async () => {
      jest.useRealTimers();

      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockRejectedValueOnce(new Error("Second failure"))
        .mockResolvedValue("success");

      (classifyError as jest.Mock).mockReturnValue({
        category: "network",
        isRetryable: true,
        shouldFallback: false,
        message: "Network error",
      });

      const onRetry = jest.fn();
      const promise = executeWithRetry(
        mockOperation,
        {
          ...DEFAULT_RETRY_CONFIG,
          baseDelayMs: 1,
          maxDelayMs: 1,
          backoffMultiplier: 1,
        },
        onRetry,
      );
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it("should not retry non-retryable errors", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("Auth error"));
      (classifyError as jest.Mock).mockReturnValue({
        category: "authentication",
        isRetryable: false,
        shouldFallback: true,
        message: "Auth error",
      });

      const result = await executeWithRetry(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe("authentication");
      expect(result.attempts).toBe(1);
      expect(result.shouldFallback).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should respect max retries limit", async () => {
      jest.useRealTimers();

      const mockOperation = jest.fn().mockRejectedValue(new Error("Always fails"));
      (classifyError as jest.Mock).mockReturnValue({
        category: "network",
        isRetryable: true,
        shouldFallback: false,
        message: "Network error",
      });

      const promise = executeWithRetry(mockOperation, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 2,
        baseDelayMs: 1,
        maxDelayMs: 1,
        backoffMultiplier: 1,
      });
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // Initial + 2 retries
      expect(result.shouldFallback).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // React Hook TESTS
  // ============================================================================
  describe("useErrorRecovery Hook", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useErrorRecovery());

      expect(result.current.retryState).toEqual({
        attemptNumber: 0,
        lastError: null,
        isRetrying: false,
        nextRetryIn: null,
      });

      expect(result.current.canRetry).toBe(false);
      expect(typeof result.current.executeWithRecovery).toBe("function");
      expect(typeof result.current.abortRetry).toBe("function");
      expect(typeof result.current.resetRetryState).toBe("function");
    });

    it("should handle successful operation", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");
      (classifyError as jest.Mock).mockReturnValue({
        category: "unknown",
        isRetryable: false,
        shouldFallback: false,
        message: "Test error",
      });

      const { result } = renderHook(() => useErrorRecovery());

      let promise: Promise<any>;
      act(() => {
        promise = result.current.executeWithRecovery(mockOperation);
      });

      const retryResult = await promise!;

      expect(retryResult.success).toBe(true);
      expect(retryResult.data).toBe("success");
    });

    it("should update canRetry based on error state", () => {
      const { result } = renderHook(() => useErrorRecovery());

      // Initially cannot retry
      expect(result.current.canRetry).toBe(false);

      // Simulate a retryable error through recordError
      const retryableError = {
        category: "network",
        isRetryable: true,
        shouldFallback: false,
        message: "Network error",
      };
      (classifyError as jest.Mock).mockReturnValueOnce(retryableError);

      act(() => {
        result.current.recordError(retryableError);
      });

      expect(result.current.canRetry).toBe(true);

      // Simulate a non-retryable error
      const nonRetryableError = {
        category: "authentication",
        isRetryable: false,
        shouldFallback: true,
        message: "Auth error",
      };
      (classifyError as jest.Mock).mockReturnValueOnce(nonRetryableError);

      act(() => {
        result.current.recordError(nonRetryableError);
      });

      expect(result.current.canRetry).toBe(false);
    });

    it("should merge custom config with defaults", () => {
      const customConfig = { maxRetries: 5, baseDelayMs: 2000 };
      const { result } = renderHook(() => useErrorRecovery(customConfig));

      expect(result.current.config.maxRetries).toBe(5);
      expect(result.current.config.baseDelayMs).toBe(2000);
      expect(result.current.config.maxDelayMs).toBe(DEFAULT_RETRY_CONFIG.maxDelayMs);
    });

    it("should handle concurrent execution attempts", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");
      (classifyError as jest.Mock).mockReturnValue({
        category: "unknown",
        isRetryable: false,
        shouldFallback: false,
        message: "Test error",
      });

      const { result } = renderHook(() => useErrorRecovery());

      const promises = [
        result.current.executeWithRecovery(mockOperation),
        result.current.executeWithRecovery(mockOperation),
        result.current.executeWithRecovery(mockOperation),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it("keeps retry selectors stable when a newer execution supersedes an older one", async () => {
      const retryableClassification = {
        category: "network",
        isRetryable: true,
        shouldFallback: false,
        message: "Network error",
      };
      (classifyError as jest.Mock).mockReturnValue(retryableClassification);

      const firstOperation = jest
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error("first failure"))
        .mockResolvedValue("first-success");
      const secondOperation = jest.fn<() => Promise<string>>().mockResolvedValue("second-success");

      const { result } = renderHook(() =>
        useErrorRecovery({
          maxRetries: 1,
          baseDelayMs: 1000,
          maxDelayMs: 1000,
          backoffMultiplier: 1,
          retryableCategories: ["network"],
        }),
      );

      let firstPromise: Promise<any>;
      act(() => {
        firstPromise = result.current.executeWithRecovery(firstOperation);
      });

      await waitFor(() => {
        expect(result.current.retryState.isRetrying).toBe(true);
      });

      await act(async () => {
        await result.current.executeWithRecovery(secondOperation);
      });

      expect(result.current.retryState).toEqual({
        attemptNumber: 0,
        lastError: null,
        isRetrying: false,
        nextRetryIn: null,
      });
      expect(result.current.canRetry).toBe(false);
      expect(result.current.getRetryAfter()).toBeNull();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await firstPromise!;

      expect(result.current.retryState).toEqual({
        attemptNumber: 0,
        lastError: null,
        isRetrying: false,
        nextRetryIn: null,
      });
      expect(result.current.canRetry).toBe(false);
      expect(result.current.getRetryAfter()).toBeNull();
    });

    it("should provide getRetryAfter utility", () => {
      const { result } = renderHook(() => useErrorRecovery());

      // Initially no retry after time
      expect(result.current.getRetryAfter()).toBe(null);

      // Simulate rate limit error
      const rateLimitError = {
        category: "rate_limit",
        isRetryable: true,
        shouldFallback: false,
        message: "Rate limit exceeded",
      };
      (classifyError as jest.Mock).mockReturnValueOnce(rateLimitError);

      act(() => {
        result.current.recordError(rateLimitError);
      });

      const retryAfter = result.current.getRetryAfter();
      expect(retryAfter).toBeGreaterThanOrEqual(2000);
      expect(retryAfter).toBeLessThan(2500);
    });

    it("clears retry selectors atomically on abort", async () => {
      (classifyError as jest.Mock).mockReturnValue({
        category: "network",
        isRetryable: true,
        shouldFallback: false,
        message: "Network error",
      });

      const retryingOperation = jest
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error("retry me"))
        .mockResolvedValue("done");

      const { result } = renderHook(() =>
        useErrorRecovery({
          maxRetries: 1,
          baseDelayMs: 1000,
          maxDelayMs: 1000,
          backoffMultiplier: 1,
          retryableCategories: ["network"],
        }),
      );

      let inFlight: Promise<any>;
      act(() => {
        inFlight = result.current.executeWithRecovery(retryingOperation);
      });

      await waitFor(() => {
        expect(result.current.retryState.isRetrying).toBe(true);
      });

      act(() => {
        result.current.abortRetry();
      });

      expect(result.current.retryState).toEqual({
        attemptNumber: 0,
        lastError: null,
        isRetrying: false,
        nextRetryIn: null,
      });
      expect(result.current.canRetry).toBe(false);
      expect(result.current.getRetryAfter()).toBeNull();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await inFlight!;

      expect(result.current.retryState).toEqual({
        attemptNumber: 0,
        lastError: null,
        isRetrying: false,
        nextRetryIn: null,
      });
    });
  });

  describe("selector invariants", () => {
    const config: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 1000,
      backoffMultiplier: 1,
    };

    it("selectCanRetry rejects retrying snapshots", () => {
      const snapshot: RetryState = {
        attemptNumber: 1,
        isRetrying: true,
        nextRetryIn: 1,
        lastError: {
          category: "network",
          isRetryable: true,
          shouldFallback: false,
          message: "Network error",
        },
      };

      expect(selectCanRetry(snapshot, config)).toBe(false);
    });

    it("selectRetryAfterMs only returns for stable rate-limit snapshots", () => {
      const rateLimitedSnapshot: RetryState = {
        attemptNumber: 1,
        isRetrying: false,
        nextRetryIn: null,
        lastError: {
          category: "rate_limit",
          isRetryable: true,
          shouldFallback: false,
          message: "Rate limit",
        },
      };
      const inFlightSnapshot: RetryState = {
        ...rateLimitedSnapshot,
        isRetrying: true,
        nextRetryIn: 1,
      };

      expect(selectRetryAfterMs(rateLimitedSnapshot, config)).not.toBeNull();
      expect(selectRetryAfterMs(inFlightSnapshot, config)).toBeNull();
    });
  });

  // ============================================================================
  // INTEGRATION AND EDGE CASE TESTS
  // ============================================================================
  describe("Integration and Edge Cases", () => {
    it("should handle errors without classification", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("Unknown error"));
      (classifyError as jest.Mock).mockReturnValue(null as any);

      const result = await executeWithRetry(mockOperation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.shouldFallback).toBe(true);
    });

    it("should handle very long delays correctly", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("Always fails"));
      (classifyError as jest.Mock).mockReturnValue({
        category: "rate_limit",
        isRetryable: true,
        shouldFallback: false,
        message: "Rate limit",
      });

      const longDelayConfig = {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 1,
        baseDelayMs: 1000, // Use shorter delay for test
      };

      const startTime = Date.now();
      const promise = executeWithRetry(mockOperation, longDelayConfig);
      await Promise.resolve();

      // Fast forward past the delay
      act(() => {
        jest.runAllTimers();
      });

      await promise;
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });
  });
});
