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
import { normalizeTitleForPersistence } from "@/lib/chat-title";
import { chat } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isChatDeleteLocked, runChatOperation } from "@/lib/chat-persistence-coordinator";
import {
  failPersistenceOperation,
  startPersistenceOperation,
  succeedPersistenceOperation,
} from "@/lib/persistence-telemetry";

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
  skipped?: boolean;
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

const LONG_RUNNING_STREAM_CHECKPOINT_INITIAL_DELAY_MS = 15000;
const LONG_RUNNING_STREAM_CHECKPOINT_INTERVAL_MS = 10000;

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

function hasPendingAssistantReply(messages: ModelMessage[]): boolean {
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== "assistant" || typeof lastMessage.content !== "string") {
    return false;
  }

  const trimmedContent = lastMessage.content.trim();
  return trimmedContent.length === 0 || trimmedContent === "...";
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
  queueScope: string;
  messages: ModelMessage[];
  thinkingOutput: string[];
  title: string | null;
  providerId: ProviderId;
  modelId: string;
}

interface SnapshotSource {
  chatScope: string;
  messages: ModelMessage[];
  thinkingOutput: string[];
  title: string;
  providerId: ProviderId;
  modelId: string;
}

interface LatestPersistenceState {
  chatScope: string;
  messages: ModelMessage[];
  thinkingOutput: string[];
  title: string;
  providerId: ProviderId;
  modelId: string;
  streamState: StreamState;
  enabled: boolean;
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
  const latestPersistenceStateRef = useRef<LatestPersistenceState>({
    chatScope: chatIdParam,
    messages,
    thinkingOutput,
    title,
    providerId,
    modelId,
    streamState,
    enabled,
  });

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
  const createSnapshotFromSource = useCallback((source: SnapshotSource): SaveSnapshot => {
    const titleForPersistence = normalizeTitleForPersistence(source.title);
    const thinkingJson = JSON.stringify(source.thinkingOutput);
    const messagesJson = JSON.stringify(source.messages);
    const chatIdentity = activeChatIdRef.current ?? chatIdParam;
    const queueScope = activeChatIdRef.current !== null
      ? String(activeChatIdRef.current)
      : source.chatScope;

    return {
      key: createIdempotencyKey("chat-persistence", [
        chatIdentity,
        titleForPersistence ?? "",
        source.providerId,
        source.modelId,
        messagesJson,
        thinkingJson,
      ]),
      chatScope: source.chatScope,
      queueScope,
      messages: source.messages,
      thinkingOutput: source.thinkingOutput,
      title: titleForPersistence,
      providerId: source.providerId,
      modelId: source.modelId,
    };
  }, [chatIdParam]);

  const createSnapshot = useCallback((): SaveSnapshot => {
    return createSnapshotFromSource({
      chatScope: chatIdParam,
      messages,
      thinkingOutput,
      title,
      providerId,
      modelId,
    });
  }, [chatIdParam, createSnapshotFromSource, messages, modelId, providerId, thinkingOutput, title]);

  const createSnapshotFromLatest = useCallback((): SaveSnapshot => {
    const latestState = latestPersistenceStateRef.current;
    return createSnapshotFromSource({
      chatScope: latestState.chatScope,
      messages: latestState.messages,
      thinkingOutput: latestState.thinkingOutput,
      title: latestState.title,
      providerId: latestState.providerId,
      modelId: latestState.modelId,
    });
  }, [createSnapshotFromSource]);

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
        .run();

      const insertedChatId = Number(result.lastInsertRowId);

      if (!Number.isFinite(insertedChatId) || insertedChatId <= 0) {
        throw new Error("Failed to insert new chat - invalid insert ID");
      }

      activeChatIdRef.current = insertedChatId;

      return {
        success: true,
        chatId: insertedChatId,
        attempts: 1,
      };
    } else {
      // Update existing chat
      const chatId = resolvedChatId;

      if (isNaN(chatId)) {
        throw new Error(`Invalid chat ID: ${chatIdParam}`);
      }

      if (isChatDeleteLocked(chatId)) {
        return {
          success: true,
          chatId,
          attempts: 1,
          skipped: true,
        };
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

    const operation = startPersistenceOperation("save", {
      chatScope: snapshot.chatScope,
      queueScope: snapshot.queueScope,
      messageCount: snapshot.messages.length,
      thinkingOutputCount: snapshot.thinkingOutput.length,
      providerId: snapshot.providerId,
      modelId: snapshot.modelId,
      hasTitle: snapshot.title !== null,
    });

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
        if (result.data.skipped) {
          setSaveStatus("idle");
          setSaveAttempts(result.attempts);
          succeedPersistenceOperation(operation, {
            attempts: result.attempts,
            skipped: true,
            chatId: result.data.chatId,
          });
          return;
        }

        // Save successful
        setSaveStatus("saved");
        setSaveAttempts(result.attempts);
        setLastSavedChatId(result.data.chatId);
        activeChatIdRef.current = result.data.chatId;
        lastPersistedSnapshotKeyRef.current = snapshot.key;
        succeedPersistenceOperation(operation, {
          attempts: result.attempts,
          chatId: result.data.chatId,
          skipped: false,
        });
        onSaveComplete?.(result.data.chatId);
      } else {
        // Save failed after retries
        const error = result.error
          ? new Error(result.error.message)
          : new Error("Save failed after retries");

        setSaveStatus("error");
        setSaveError(error);
        setSaveAttempts(result.attempts);
        failPersistenceOperation(operation, error, {
          attempts: result.attempts,
        });
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
      failPersistenceOperation(operation, error, {
        attempts: 1,
      });
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
        const queuedSave = writeQueueRef.current.then(() =>
          runChatOperation(snapshot.queueScope, async () => {
            await saveWithRetry(snapshot);
          })
        );
        writeQueueRef.current = queuedSave.catch(() => undefined);
        await queuedSave;
      });
    },
    [saveWithRetry]
  );

  useEffect(() => {
    latestPersistenceStateRef.current = {
      chatScope: chatIdParam,
      messages,
      thinkingOutput,
      title,
      providerId,
      modelId,
      streamState,
      enabled,
    };
  }, [chatIdParam, enabled, messages, modelId, providerId, streamState, thinkingOutput, title]);

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
    const hasPendingReply = hasPendingAssistantReply(messages);

    const shouldPersistTerminalState =
      (streamState === "completed" && !hasPendingReply)
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

  const isStreamInProgress = streamState === "streaming" || streamState === "completing";

  useEffect(() => {
    if (!enabled || !isStreamInProgress) {
      return;
    }

    let checkpointInterval: ReturnType<typeof setInterval> | null = null;

    const checkpointSave = (): void => {
      if (!isMountedRef.current) return;

      const latest = latestPersistenceStateRef.current;
      if (!latest.enabled) return;

      const latestInProgress = latest.streamState === "streaming" || latest.streamState === "completing";
      if (!latestInProgress) return;
      if (latest.messages.length === 0) return;
      if (hasPendingAssistantReply(latest.messages)) return;
      if (!hasMeaningfulAssistantContent(latest.messages)) return;

      const checkpointSnapshot = createSnapshotFromLatest();
      if (checkpointSnapshot.key === lastPersistedSnapshotKeyRef.current) {
        return;
      }

      setSaveStatus((currentStatus) => {
        if (currentStatus === "saving" || currentStatus === "retrying") {
          return currentStatus;
        }

        return "queued";
      });
      pendingSaveRef.current = runSerializedSave(checkpointSnapshot);
    };

    const initialCheckpointTimeout = setTimeout(() => {
      checkpointSave();
      checkpointInterval = setInterval(checkpointSave, LONG_RUNNING_STREAM_CHECKPOINT_INTERVAL_MS);
    }, LONG_RUNNING_STREAM_CHECKPOINT_INITIAL_DELAY_MS);

    return () => {
      clearTimeout(initialCheckpointTimeout);
      if (checkpointInterval) {
        clearInterval(checkpointInterval);
      }
    };
  }, [enabled, isStreamInProgress, createSnapshotFromLatest, runSerializedSave]);

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
    if (hasPendingAssistantReply(messages)) return;

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
