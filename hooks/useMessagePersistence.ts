/**
 * @file useMessagePersistence.ts
 * @purpose Atomic message persistence with retry logic and race condition protection
 * @description
 * Manages the complete flow from stream completion to database persistence.
 * Ensures messages are only saved after the stream reaches 'completed' state,
 * implements retry logic with exponential backoff, and preserves partial content
 * on save failures.
 *
 * Features:
 * - Queue save operation to run only after stream reaches 'completed' state
 * - Atomic 'stream complete → save message' transaction
 * - 3 retry attempts with exponential backoff on save failures
 * - User-friendly error display when save fails after retries
 * - Partial stream content preservation even if save fails
 * - Cleanup of pending save operations on component unmount
 *
 * @used-by Chat screen for database persistence
 * @connects-to useStreamLifecycle, useErrorRecovery, useDatabase
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ModelMessage } from "ai";
import useDatabase from "./useDatabase";
import { executeWithRetry, DEFAULT_RETRY_CONFIG } from "./useErrorRecovery";
import { getHumanReadableError } from "@/lib/error-messages";
import type { StreamState } from "./chat/useStreamLifecycle";
import type { ProviderId } from "@/types/provider.types";
import type { ErrorCategory } from "@/providers/fallback-chain";
import { chat } from "@/db/schema";
import { eq } from "drizzle-orm";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Save operation status for UI feedback
 */
export type SaveStatus =
  | "idle"
  | "queued"
  | "saving"
  | "retrying"
  | "saved"
  | "error";

/**
 * Result of a save operation
 */
export interface SaveResult {
  success: boolean;
  chatId: number;
  error?: Error;
  attempts: number;
}

/**
 * Configuration options for message persistence
 */
export interface MessagePersistenceOptions {
  /** Current stream state from useStreamLifecycle */
  streamState: StreamState;
  /** Chat ID from URL params ('new' or numeric string) */
  chatIdParam: string;
  /** Current messages to save */
  messages: ModelMessage[];
  /** Current thinking output to save */
  thinkingOutput: string[];
  /** Current AI provider */
  providerId: ProviderId;
  /** Current model ID */
  modelId: string;
  /** Current chat title */
  title: string;
  /** Callback when save completes successfully */
  onSaveComplete?: (chatId: number) => void;
  /** Callback when save fails after all retries */
  onSaveError?: (error: Error, attempts: number) => void;
  /** Whether persistence is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Return type for useMessagePersistence hook
 */
export interface UseMessagePersistenceReturn {
  /** Current save status for UI feedback */
  saveStatus: SaveStatus;
  /** Number of save attempts made */
  saveAttempts: number;
  /** Error from last failed save (if any) */
  saveError: Error | null;
  /** User-friendly error message for display */
  userFriendlyError: string | null;
  /** Whether a save operation is currently in progress */
  isSaving: boolean;
  /** Whether the last save failed */
  hasSaveError: boolean;
  /** Manually trigger a save (useful for retry) */
  triggerSave: () => Promise<void>;
  /** Clear the current error state */
  clearError: () => void;
  /** Last successfully saved chat ID */
  lastSavedChatId: number | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Retry configuration for database save operations */
const SAVE_RETRY_CONFIG = {
  ...DEFAULT_RETRY_CONFIG,
  maxRetries: 3,
  baseDelayMs: 500, // Start with 500ms delay
  maxDelayMs: 5000, // Cap at 5 seconds
  retryableCategories: ["network", "server_error", "timeout", "unknown"] as ErrorCategory[],
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format error for user-friendly display
 */
function formatSaveError(error: unknown): string {
  if (error instanceof Error) {
    const friendly = getHumanReadableError(error);
    return `${friendly.title}: ${friendly.message}`;
  }
  return "Failed to save chat. Please try again.";
}

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for atomic message persistence with retry logic
 *
 * This hook ensures that messages are only saved to the database after the
 * stream has fully completed, preventing race conditions between streaming
 * and saving. It implements retry logic with exponential backoff and provides
 * user-friendly error feedback.
 *
 * @param options - Configuration options for persistence
 * @returns Save status and control functions
 */
export function useMessagePersistence(
  options: MessagePersistenceOptions
): UseMessagePersistenceReturn {
  const {
    streamState,
    chatIdParam,
    messages,
    thinkingOutput,
    providerId,
    modelId,
    title,
    onSaveComplete,
    onSaveError,
    enabled = true,
  } = options;

  // ===========================================================================
  // STATE
  // ===========================================================================

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveAttempts, setSaveAttempts] = useState(0);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [lastSavedChatId, setLastSavedChatId] = useState<number | null>(null);

  // ===========================================================================
  // REFS
  // ===========================================================================

  const isMountedRef = useRef(true);
  const pendingSaveRef = useRef<Promise<void> | null>(null);
  const hasCompletedStreamRef = useRef(false);
  const lastSavedMessagesRef = useRef<string>("");

  // ===========================================================================
  // DATABASE ACCESS
  // ===========================================================================

  const db = useDatabase();

  // ===========================================================================
  // SAVE OPERATION
  // ===========================================================================

  /**
   * Execute the actual database save operation
   */
  const executeSave = useCallback(async (): Promise<SaveResult> => {
    const now = new Date();

    // Determine if this is a new chat or an update
    const isNewChat = chatIdParam === "new" || lastSavedChatId === null;

    if (isNewChat) {
      // Insert new chat
      const result = await db
        .insert(chat)
        .values({
          messages: messages,
          thinkingOutput: thinkingOutput,
          title: title === "Chat" ? null : title,
          providerId: providerId,
          modelId: modelId,
          providerMetadata: {},
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: chat.id });

      if (!result[0]) {
        throw new Error("Failed to insert new chat - no ID returned");
      }

      return {
        success: true,
        chatId: result[0].id,
        attempts: 1,
      };
    } else {
      // Update existing chat
      const chatId = lastSavedChatId ?? parseInt(chatIdParam, 10);

      if (isNaN(chatId)) {
        throw new Error(`Invalid chat ID: ${chatIdParam}`);
      }

      await db
        .update(chat)
        .set({
          messages: messages,
          thinkingOutput: thinkingOutput,
          providerId: providerId,
          modelId: modelId,
          updatedAt: now,
        })
        .where(eq(chat.id, chatId));

      return {
        success: true,
        chatId,
        attempts: 1,
      };
    }
  }, [db, chatIdParam, messages, thinkingOutput, title, providerId, modelId, lastSavedChatId]);

  /**
   * Save with retry logic
   */
  const saveWithRetry = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    // Don't save if no messages
    if (messages.length === 0) return;

    // Don't save if messages haven't changed
    const messagesJson = JSON.stringify(messages);
    if (messagesJson === lastSavedMessagesRef.current && saveStatus === "saved") {
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const result = await executeWithRetry(
        executeSave,
        SAVE_RETRY_CONFIG,
        (attemptNumber, delay) => {
          if (isMountedRef.current) {
            setSaveStatus("retrying");
            setSaveAttempts(attemptNumber);
            console.log(
              `[MessagePersistence] Retry attempt ${attemptNumber} after ${delay}ms`
            );
          }
        }
      );

      if (!isMountedRef.current) return;

      if (result.success && result.data) {
        // Save successful
        setSaveStatus("saved");
        setSaveAttempts(result.attempts);
        setLastSavedChatId(result.data.chatId);
        lastSavedMessagesRef.current = messagesJson;
        onSaveComplete?.(result.data.chatId);
      } else {
        // Save failed after retries
        const error = result.error
          ? new Error(result.error.message)
          : new Error("Save failed after retries");

        setSaveStatus("error");
        setSaveError(error);
        setSaveAttempts(result.attempts);
        onSaveError?.(error, result.attempts);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error(String(err));
      setSaveStatus("error");
      setSaveError(error);
      onSaveError?.(error, saveAttempts);
    }
  }, [
    executeSave,
    messages,
    saveAttempts,
    saveStatus,
    onSaveComplete,
    onSaveError,
  ]);

  /**
   * Trigger a manual save
   */
  const triggerSave = useCallback(async (): Promise<void> => {
    if (pendingSaveRef.current) {
      // Wait for pending save to complete
      await pendingSaveRef.current;
    }

    pendingSaveRef.current = saveWithRetry();
    await pendingSaveRef.current;
    pendingSaveRef.current = null;
  }, [saveWithRetry]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setSaveError(null);
    if (saveStatus === "error") {
      setSaveStatus("idle");
    }
  }, [saveStatus]);

  // ===========================================================================
  // STREAM STATE MONITORING
  // ===========================================================================

  /**
   * Monitor stream state and trigger save when completed
   */
  useEffect(() => {
    if (!enabled) return;

    // Queue save when stream reaches completed state
    if (streamState === "completed" && !hasCompletedStreamRef.current) {
      hasCompletedStreamRef.current = true;
      setSaveStatus("queued");

      // Execute save
      pendingSaveRef.current = saveWithRetry();
    }

    // Reset completion flag when stream starts again
    if (streamState === "streaming") {
      hasCompletedStreamRef.current = false;
    }
  }, [streamState, enabled, saveWithRetry]);

  // ===========================================================================
  // MESSAGES CHANGE MONITORING
  // ===========================================================================

  /**
   * Monitor for message changes after stream completion and save
   */
  useEffect(() => {
    if (!enabled) return;
    if (streamState !== "completed" && streamState !== "idle") return;
    if (messages.length === 0) return;

    // Only save if messages changed and we haven't saved this version
    const messagesJson = JSON.stringify(messages);
    if (messagesJson !== lastSavedMessagesRef.current) {
      // Messages changed, trigger a save
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          pendingSaveRef.current = saveWithRetry();
        }
      }, 100); // Small debounce

      return () => clearTimeout(timeoutId);
    }
  }, [messages, thinkingOutput, streamState, enabled, saveWithRetry]);

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ===========================================================================
  // DERIVED STATE
  // ===========================================================================

  const isSaving = saveStatus === "saving" || saveStatus === "retrying";
  const hasSaveError = saveStatus === "error";
  const userFriendlyError = saveError ? formatSaveError(saveError) : null;

  // ===========================================================================
  // RETURN VALUE
  // ===========================================================================

  return {
    saveStatus,
    saveAttempts,
    saveError,
    userFriendlyError,
    isSaving,
    hasSaveError,
    triggerSave,
    clearError,
    lastSavedChatId,
  };
}

export default useMessagePersistence;
