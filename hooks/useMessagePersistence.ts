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
import { createIdempotencyKey, createIdempotencyRegistry } from "@/lib/concurrency";
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

function hasMeaningfulAssistantContent(messages: ModelMessage[]): boolean {
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && typeof message.content === "string");

  if (!lastAssistantMessage || typeof lastAssistantMessage.content !== "string") {
    return false;
  }

  const trimmedContent = lastAssistantMessage.content.trim();
  return trimmedContent.length > 0 && trimmedContent !== "...";
}

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

interface SaveSnapshot {
  key: string;
  chatScope: string;
  messages: ModelMessage[];
  thinkingOutput: string[];
  title: string | null;
  providerId: ProviderId;
  modelId: string;
}

function normalizeTitle(rawTitle: string): string | null {
  const trimmedTitle = rawTitle.trim();
  if (!trimmedTitle || trimmedTitle === "Chat") {
    return null;
  }

  return trimmedTitle;
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
  const lastPersistedSnapshotKeyRef = useRef<string | null>(null);
  const activeChatIdRef = useRef<number | null>(null);
  const activeChatScopeRef = useRef(chatIdParam);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveRegistryRef = useRef(createIdempotencyRegistry<void>());

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
  const createSnapshot = useCallback((): SaveSnapshot => {
    const titleForPersistence = normalizeTitle(title);
    const thinkingJson = JSON.stringify(thinkingOutput);
    const messagesJson = JSON.stringify(messages);
    const chatIdentity = activeChatIdRef.current ?? chatIdParam;

    return {
      key: createIdempotencyKey("chat-persistence", [
        chatIdentity,
        titleForPersistence ?? "",
        providerId,
        modelId,
        messagesJson,
        thinkingJson,
      ]),
      chatScope: chatIdParam,
      messages,
      thinkingOutput,
      title: titleForPersistence,
      providerId,
      modelId,
    };
  }, [chatIdParam, messages, modelId, providerId, thinkingOutput, title]);

  const executeSave = useCallback(async (snapshot: SaveSnapshot): Promise<SaveResult> => {
    const now = new Date();
    const resolvedChatId = activeChatIdRef.current ?? (chatIdParam === "new" ? null : Number(chatIdParam));

    // Determine if this is a new chat or an update
    const isNewChat = resolvedChatId === null || Number.isNaN(resolvedChatId);

    if (isNewChat) {
      // Insert new chat
      const result = await db
        .insert(chat)
        .values({
          messages: snapshot.messages,
          thinkingOutput: snapshot.thinkingOutput,
          title: snapshot.title,
          providerId: snapshot.providerId,
          modelId: snapshot.modelId,
          providerMetadata: {},
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: chat.id });

      if (!result[0]) {
        throw new Error("Failed to insert new chat - no ID returned");
      }

      activeChatIdRef.current = result[0].id;

      return {
        success: true,
        chatId: result[0].id,
        attempts: 1,
      };
    } else {
      // Update existing chat
      const chatId = resolvedChatId;

      if (isNaN(chatId)) {
        throw new Error(`Invalid chat ID: ${chatIdParam}`);
      }

      await db
        .update(chat)
        .set({
          messages: snapshot.messages,
          thinkingOutput: snapshot.thinkingOutput,
          title: snapshot.title,
          providerId: snapshot.providerId,
          modelId: snapshot.modelId,
          updatedAt: now,
        })
        .where(eq(chat.id, chatId));

      return {
        success: true,
        chatId,
        attempts: 1,
      };
    }
  }, [db, chatIdParam]);

  /**
   * Save with retry logic
   */
  const saveWithRetry = useCallback(async (snapshot: SaveSnapshot): Promise<void> => {
    if (!isMountedRef.current) return;

    // Don't save if no messages
    if (snapshot.messages.length === 0) return;

    // Don't save if this snapshot is already persisted
    if (snapshot.key === lastPersistedSnapshotKeyRef.current) {
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const result = await executeWithRetry(
        () => executeSave(snapshot),
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
      if (snapshot.chatScope !== activeChatScopeRef.current) {
        return;
      }

      if (result.success && result.data) {
        // Save successful
        setSaveStatus("saved");
        setSaveAttempts(result.attempts);
        setLastSavedChatId(result.data.chatId);
        activeChatIdRef.current = result.data.chatId;
        lastPersistedSnapshotKeyRef.current = snapshot.key;
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
      if (snapshot.chatScope !== activeChatScopeRef.current) {
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));
      setSaveStatus("error");
      setSaveError(error);
      setSaveAttempts(1);
      onSaveError?.(error, 1);
    }
  }, [
    executeSave,
    onSaveComplete,
    onSaveError,
  ]);

  const runSerializedSave = useCallback(
    (snapshot: SaveSnapshot): Promise<void> => {
      if (snapshot.key === lastPersistedSnapshotKeyRef.current) {
        return Promise.resolve();
      }

      return saveRegistryRef.current.run(snapshot.key, async () => {
        const queuedSave = writeQueueRef.current.then(() => saveWithRetry(snapshot));
        writeQueueRef.current = queuedSave.catch(() => undefined);
        await queuedSave;
      });
    },
    [saveWithRetry]
  );

  /**
   * Trigger a manual save
   */
  const triggerSave = useCallback(async (): Promise<void> => {
    const snapshot = createSnapshot();
    pendingSaveRef.current = runSerializedSave(snapshot);
    await pendingSaveRef.current;
    pendingSaveRef.current = null;
  }, [createSnapshot, runSerializedSave]);

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

    const isTerminalState =
      streamState === "completed"
      || streamState === "error"
      || streamState === "cancelled";

    const shouldPersistTerminalState =
      streamState === "completed"
      || hasMeaningfulAssistantContent(messages);

    // Queue save when stream reaches terminal state.
    // For error/cancelled, persist only when we have meaningful assistant content.
    if (isTerminalState && shouldPersistTerminalState && !hasCompletedStreamRef.current) {
      hasCompletedStreamRef.current = true;
      setSaveStatus("queued");

      // Execute save
      pendingSaveRef.current = runSerializedSave(createSnapshot());
    }

    // Reset completion flag when stream starts again
    if (streamState === "streaming") {
      hasCompletedStreamRef.current = false;
    }
  }, [messages, streamState, enabled, createSnapshot, runSerializedSave]);

  // ===========================================================================
  // MESSAGES CHANGE MONITORING
  // ===========================================================================

  /**
   * Monitor for message changes after stream completion and save
   */
  useEffect(() => {
    if (!enabled) return;
    const canSaveForCurrentState =
      streamState === "idle"
      || streamState === "completed"
      || (streamState === "error" && hasMeaningfulAssistantContent(messages))
      || (streamState === "cancelled" && hasMeaningfulAssistantContent(messages));

    if (!canSaveForCurrentState) return;
    if (messages.length === 0) return;

    const nextSnapshot = createSnapshot();
    if (nextSnapshot.key === lastPersistedSnapshotKeyRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        pendingSaveRef.current = runSerializedSave(nextSnapshot);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, thinkingOutput, title, providerId, modelId, streamState, enabled, createSnapshot, runSerializedSave]);

  useEffect(() => {
    activeChatScopeRef.current = chatIdParam;
    hasCompletedStreamRef.current = false;
    lastPersistedSnapshotKeyRef.current = null;
    writeQueueRef.current = Promise.resolve();
    saveRegistryRef.current.clear();
    pendingSaveRef.current = null;
    setSaveStatus("idle");
    setSaveAttempts(0);
    setSaveError(null);

    if (chatIdParam === "new") {
      activeChatIdRef.current = null;
      setLastSavedChatId(null);
      return;
    }

    const numericChatId = Number(chatIdParam);
    if (Number.isNaN(numericChatId)) {
      activeChatIdRef.current = null;
      setLastSavedChatId(null);
      return;
    }

    activeChatIdRef.current = numericChatId;
    setLastSavedChatId(numericChatId);
  }, [chatIdParam]);

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
