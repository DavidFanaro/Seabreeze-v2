/**
 * @file useStreamLifecycle.ts
 * @purpose Comprehensive stream lifecycle management with state tracking,
 *          timeout handling, and graceful cancellation
 * @description
 * Manages the complete lifecycle of chat streams from initialization through
 * completion or error. Provides robust state tracking, timeout protection,
 * and resource cleanup to prevent memory leaks and incomplete streams.
 *
 * Features:
 * - Stream state tracking: idle → streaming → completing → completed | error
 * - Dual detection: done signal + fallback timeout (30s)
 * - App state handling: background/foreground transitions
 * - Graceful cancellation with resource cleanup
 * - Lifecycle event logging for debugging
 *
 * @used-by useChatStreaming, useChat
 * @connects-to React Native AppState
 */

import { useCallback, useRef, useState, useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Stream lifecycle states
 *
 * Represents the complete state machine for stream processing:
 * - idle: No active stream
 * - streaming: Actively receiving chunks from AI provider
 * - completing: Stream ended, finalizing (post-processing, saving)
 * - completed: Stream successfully finished and persisted
 * - error: Stream failed or timed out
 * - cancelled: Stream was manually cancelled by user
 */
export type StreamState =
  | "idle"
  | "streaming"
  | "completing"
  | "completed"
  | "error"
  | "cancelled";

/**
 * Stream lifecycle event types for logging
 */
export type StreamLifecycleEvent =
  | "initialized"
  | "started"
  | "chunk-received"
  | "timeout-started"
  | "timeout-triggered"
  | "done-signal-received"
  | "completing"
  | "completed"
  | "cancelled"
  | "error"
  | "cleanup"
  | "app-backgrounded"
  | "app-foregrounded";

/**
 * Stream lifecycle event log entry
 */
export interface StreamLifecycleLogEntry {
  timestamp: number;
  event: StreamLifecycleEvent;
  details?: Record<string, unknown>;
}

/**
 * Stream lifecycle configuration options
 */
export interface StreamLifecycleOptions {
  /** Timeout in milliseconds for fallback completion detection (default: 30000) */
  timeoutMs?: number;
  /** Upper bound for a stream to remain non-terminal before forcing error (default: 45000) */
  expectedCompletionWindowMs?: number;
  /** Grace period after done signal before forcing terminal completion (default: 8000) */
  completionGraceMs?: number;
  /** Enable debug logging of lifecycle events (default: false) */
  enableLogging?: boolean;
  /** Callback when stream state changes */
  onStateChange?: (state: StreamState) => void;
  /** Callback when stream completes successfully */
  onComplete?: () => void;
  /** Callback when stream encounters an error */
  onError?: (error: Error) => void;
  /** Callback when stream is cancelled */
  onCancel?: () => void;
  /** Handle app backgrounding: 'cancel' | 'pause' | 'continue' (default: 'cancel') */
  backgroundBehavior?: "cancel" | "pause" | "continue";
}

/**
 * Return type for useStreamLifecycle hook
 */
export interface UseStreamLifecycleReturn {
  /** Current stream state */
  streamState: StreamState;
  /** Whether a stream is currently active (streaming or completing) */
  isStreamActive: boolean;
  /** Whether stream is currently receiving chunks */
  isStreaming: boolean;
  /** Whether stream is in completing phase */
  isCompleting: boolean;
  /** Whether stream has reached terminal state (completed/error/cancelled) */
  isTerminal: boolean;
  /** Event log for debugging */
  eventLog: StreamLifecycleLogEntry[];
  /** Initialize a new stream */
  initializeStream: () => AbortController;
  /** Mark that a chunk was received */
  markChunkReceived: () => void;
  /** Mark that the done signal was received */
  markDoneSignalReceived: () => void;
  /** Mark that completion has started */
  markCompleting: () => void;
  /** Mark that stream completed successfully */
  markCompleted: () => void;
  /** Mark that stream encountered an error */
  markError: (error: Error) => void;
  /** Cancel the current stream */
  cancelStream: () => void;
  /** Get the current abort controller */
  abortController: AbortController | null;
  /** Clear the event log */
  clearEventLog: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_EXPECTED_COMPLETION_WINDOW_MS = 45000;
const DEFAULT_COMPLETION_GRACE_MS = 8000;
const MAX_STREAM_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Log a lifecycle event if logging is enabled
 */
function logEvent(
  enableLogging: boolean,
  eventLogRef: React.MutableRefObject<StreamLifecycleLogEntry[]>,
  event: StreamLifecycleEvent,
  details?: Record<string, unknown>
): void {
  if (!enableLogging) return;

  const entry: StreamLifecycleLogEntry = {
    timestamp: Date.now(),
    event,
    details,
  };

  eventLogRef.current.push(entry);

  // Keep log size manageable (last 100 events)
  if (eventLogRef.current.length > 100) {
    eventLogRef.current = eventLogRef.current.slice(-100);
  }

  // eslint-disable-next-line no-console
  console.log(`[StreamLifecycle] ${event}`, details || "");
}

/**
 * Check if state is terminal (completed, error, or cancelled)
 */
function isTerminalState(state: StreamState): boolean {
  return state === "completed" || state === "error" || state === "cancelled";
}

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing stream lifecycle with robust state tracking and cleanup
 *
 * This hook provides comprehensive stream lifecycle management including:
 * - State machine transitions (idle → streaming → completing → completed)
 * - Timeout-based fallback for detecting stream end
 * - App state handling (background/foreground)
 * - Resource cleanup to prevent memory leaks
 * - Event logging for debugging
 *
 * @param options - Configuration options for the lifecycle manager
 * @returns Stream lifecycle controls and state
 */
export function useStreamLifecycle(
  options: StreamLifecycleOptions = {}
): UseStreamLifecycleReturn {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    expectedCompletionWindowMs = DEFAULT_EXPECTED_COMPLETION_WINDOW_MS,
    completionGraceMs = DEFAULT_COMPLETION_GRACE_MS,
    enableLogging = false,
    onStateChange,
    onComplete,
    onError,
    onCancel,
    backgroundBehavior = "cancel",
  } = options;

  // ===========================================================================
  // STATE
  // ===========================================================================

  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // ===========================================================================
  // REFS (for values that don't trigger re-renders)
  // ===========================================================================

  const eventLogRef = useRef<StreamLifecycleLogEntry[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expectedCompletionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionGraceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChunkTimeRef = useRef<number>(0);
  const isDoneSignalReceivedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const streamStateRef = useRef<StreamState>("idle");

  // ===========================================================================
  // STATE TRANSITION HELPERS
  // ===========================================================================

  /**
   * Transition to a new state with logging and callbacks
   */
  const transitionTo = useCallback(
    (newState: StreamState, details?: Record<string, unknown>) => {
      if (!isMountedRef.current) return;

      const current = streamStateRef.current;

      // Prevent invalid transitions, but allow explicit stream restarts.
      const isRestartTransition =
        isTerminalState(current) && newState === "streaming";

      if (
        isTerminalState(current)
        && !isTerminalState(newState)
        && !isRestartTransition
      ) {
        logEvent(enableLogging, eventLogRef, "error", {
          message: "Invalid state transition attempted",
          from: current,
          to: newState,
        });
        return;
      }

      if (current === newState) {
        return;
      }

      logEvent(enableLogging, eventLogRef, newState as StreamLifecycleEvent, {
        from: current,
        ...details,
      });

      streamStateRef.current = newState;
      setStreamState(newState);

      // Call state change callback
      onStateChange?.(newState);

      // Call terminal state callbacks
      if (newState === "completed") {
        onComplete?.();
      } else if (newState === "error") {
        const error = details?.error instanceof Error
          ? details.error
          : new Error(details?.message as string || "Stream error");
        onError?.(error);
      } else if (newState === "cancelled") {
        onCancel?.();
      }
    },
    [enableLogging, onStateChange, onComplete, onError, onCancel]
  );

  /**
   * Clear all active timeouts
   */
  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (expectedCompletionTimeoutRef.current) {
      clearTimeout(expectedCompletionTimeoutRef.current);
      expectedCompletionTimeoutRef.current = null;
    }
    if (completionGraceTimeoutRef.current) {
      clearTimeout(completionGraceTimeoutRef.current);
      completionGraceTimeoutRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
  }, []);

  /**
   * Start the fallback timeout timer
   */
  const startTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    logEvent(enableLogging, eventLogRef, "timeout-started", {
      timeoutMs,
    });

    timeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      logEvent(enableLogging, eventLogRef, "timeout-triggered", {
        lastChunkTime: lastChunkTimeRef.current,
        isDoneSignalReceived: isDoneSignalReceivedRef.current,
      });

      if (streamStateRef.current !== "streaming") {
        return;
      }

      // If no chunks received for timeoutMs, fail this stream and abort IO
      if (!isDoneSignalReceivedRef.current) {
        const timeoutError = new Error("Stream timed out while waiting for data");
        setAbortController((current) => {
          current?.abort();
          return null;
        });
        transitionTo("error", { error: timeoutError, reason: "timeout", timeoutMs });
      }
    }, timeoutMs);
  }, [enableLogging, timeoutMs, transitionTo]);

  const startMaxDurationTimeout = useCallback(() => {
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }

    maxDurationTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      if (streamStateRef.current !== "streaming" && streamStateRef.current !== "completing") {
        return;
      }

      logEvent(enableLogging, eventLogRef, "timeout-triggered", {
        reason: "max-duration",
        maxDurationMs: MAX_STREAM_DURATION_MS,
      });

      const durationError = new Error("Stream exceeded maximum duration");
      setAbortController((current) => {
        current?.abort();
        return null;
      });
      transitionTo("error", {
        error: durationError,
        message: durationError.message,
        maxDurationMs: MAX_STREAM_DURATION_MS,
      });
    }, MAX_STREAM_DURATION_MS);
  }, [enableLogging, transitionTo]);

  const startExpectedCompletionTimeout = useCallback(() => {
    if (expectedCompletionTimeoutRef.current) {
      clearTimeout(expectedCompletionTimeoutRef.current);
      expectedCompletionTimeoutRef.current = null;
    }

    expectedCompletionTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      if (streamStateRef.current !== "streaming" && streamStateRef.current !== "completing") {
        return;
      }

      const completionTimeoutError = new Error("Stream exceeded expected completion window");
      logEvent(enableLogging, eventLogRef, "timeout-triggered", {
        reason: "expected-completion-window",
        expectedCompletionWindowMs,
      });

      setAbortController((current) => {
        current?.abort();
        return null;
      });
      transitionTo("error", {
        error: completionTimeoutError,
        message: completionTimeoutError.message,
        expectedCompletionWindowMs,
      });
    }, expectedCompletionWindowMs);
  }, [enableLogging, expectedCompletionWindowMs, transitionTo]);

  const startCompletionGraceTimeout = useCallback(() => {
    if (completionGraceTimeoutRef.current) {
      clearTimeout(completionGraceTimeoutRef.current);
      completionGraceTimeoutRef.current = null;
    }

    completionGraceTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      if (streamStateRef.current !== "completing") {
        return;
      }

      logEvent(enableLogging, eventLogRef, "timeout-triggered", {
        reason: "completion-grace",
        completionGraceMs,
      });

      clearTimeouts();
      transitionTo("completed", {
        reason: "completion-grace-timeout",
        completionGraceMs,
      });
      setAbortController((current) => {
        current?.abort();
        return null;
      });
    }, completionGraceMs);
  }, [clearTimeouts, completionGraceMs, enableLogging, transitionTo]);

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Initialize a new stream
   * Creates a fresh abort controller and sets up initial state
   */
  const initializeStream = useCallback((): AbortController => {
    // Clean up any existing stream first
    if (abortController) {
      logEvent(enableLogging, eventLogRef, "cleanup", {
        reason: "new-stream-initialization",
      });
      abortController.abort();
    }

    clearTimeouts();
    isDoneSignalReceivedRef.current = false;
    lastChunkTimeRef.current = Date.now();

    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    logEvent(enableLogging, eventLogRef, "initialized");
    transitionTo("streaming");
    startTimeout();
    startMaxDurationTimeout();
    startExpectedCompletionTimeout();

    return newAbortController;
  }, [
    abortController,
    clearTimeouts,
    enableLogging,
    startExpectedCompletionTimeout,
    startMaxDurationTimeout,
    startTimeout,
    transitionTo,
  ]);

  /**
   * Mark that a chunk was received
   * Resets the timeout timer
   */
  const markChunkReceived = useCallback(() => {
    if (!isMountedRef.current) return;

    lastChunkTimeRef.current = Date.now();
    logEvent(enableLogging, eventLogRef, "chunk-received", {
      timestamp: lastChunkTimeRef.current,
    });

    // Reset timeout on each chunk
    if (streamStateRef.current === "streaming") {
      startTimeout();
    }
  }, [enableLogging, startTimeout]);

  /**
   * Mark that the done signal was received from the provider
   */
  const markDoneSignalReceived = useCallback(() => {
    if (!isMountedRef.current) return;

    isDoneSignalReceivedRef.current = true;
    logEvent(enableLogging, eventLogRef, "done-signal-received");
    transitionTo("completing", { reason: "done-signal" });
    startCompletionGraceTimeout();
  }, [enableLogging, startCompletionGraceTimeout, transitionTo]);

  /**
   * Mark that stream is completing (post-processing)
   */
  const markCompleting = useCallback(() => {
    transitionTo("completing");
    startCompletionGraceTimeout();
  }, [startCompletionGraceTimeout, transitionTo]);

  /**
   * Mark that stream completed successfully
   */
  const markCompleted = useCallback(() => {
    clearTimeouts();
    transitionTo("completed");

    // Clean up abort controller
    setAbortController((current) => {
      current?.abort();
      return null;
    });
  }, [clearTimeouts, transitionTo]);

  /**
   * Mark that stream encountered an error
   */
  const markError = useCallback(
    (error: Error) => {
      clearTimeouts();
      transitionTo("error", { error, message: error.message, stack: error.stack });

      // Clean up abort controller
      setAbortController((current) => {
        current?.abort();
        return null;
      });
    },
    [clearTimeouts, transitionTo]
  );

  /**
   * Cancel the current stream
   */
  const cancelStream = useCallback(() => {
    if (isTerminalState(streamStateRef.current)) {
      // Already in terminal state, nothing to cancel
      return;
    }

    logEvent(enableLogging, eventLogRef, "cancelled", {
      previousState: streamStateRef.current,
    });

    clearTimeouts();

    // Abort the fetch/stream
    if (abortController) {
      abortController.abort();
    }

    transitionTo("cancelled");
    setAbortController(null);
  }, [abortController, clearTimeouts, enableLogging, transitionTo]);

  /**
   * Clear the event log
   */
  const clearEventLog = useCallback(() => {
    eventLogRef.current = [];
  }, []);

  useEffect(() => {
    abortControllerRef.current = abortController;
  }, [abortController]);

  // ===========================================================================
  // DERIVED STATE (must be defined before effects that use them)
  // ===========================================================================

  const isStreamActive = streamState === "streaming" || streamState === "completing";
  const isStreaming = streamState === "streaming";
  const isCompleting = streamState === "completing";
  const isTerminal = isTerminalState(streamState);

  // ===========================================================================
  // APP STATE HANDLING
  // ===========================================================================

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (!isMountedRef.current) return;

        if (nextAppState === "background") {
          logEvent(enableLogging, eventLogRef, "app-backgrounded", {
            backgroundBehavior,
            streamState,
          });

          if (backgroundBehavior === "cancel" && isStreamActive) {
            cancelStream();
          }
          // For 'pause' and 'continue', we don't do anything special
        } else if (nextAppState === "active") {
          logEvent(enableLogging, eventLogRef, "app-foregrounded");
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [backgroundBehavior, cancelStream, enableLogging, isStreamActive, streamState]);

  // ===========================================================================
  // CLEANUP EFFECT
  // ===========================================================================

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearTimeouts();

      if (abortControllerRef.current) {
        logEvent(enableLogging, eventLogRef, "cleanup", {
          reason: "component-unmount",
        });
        abortControllerRef.current.abort();
      }
    };
  }, [clearTimeouts, enableLogging]);

  // ===========================================================================
  // RETURN VALUE
  // ===========================================================================

  return {
    streamState,
    isStreamActive,
    isStreaming,
    isCompleting,
    isTerminal,
    eventLog: eventLogRef.current,
    initializeStream,
    markChunkReceived,
    markDoneSignalReceived,
    markCompleting,
    markCompleted,
    markError,
    cancelStream,
    abortController,
    clearEventLog,
  };
}

export default useStreamLifecycle;
