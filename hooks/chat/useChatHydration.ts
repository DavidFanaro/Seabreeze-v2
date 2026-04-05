import { useCallback, useEffect, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { ModelMessage } from "ai";
import { eq } from "drizzle-orm";

import { chat } from "@/db/schema";
import useDatabase from "@/hooks/useDatabase";
import { normalizePersistedMessages } from "@/lib/chat-message-normalization";
import {
  isChatDeleteLocked,
  runChatOperation,
} from "@/lib/chat-persistence-coordinator";
import { createIdempotencyKey } from "@/lib/concurrency";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat-title";
import {
  failPersistenceOperation,
  startPersistenceOperation,
  succeedPersistenceOperation,
} from "@/lib/persistence-telemetry";
import { chatQueryKeys } from "@/lib/query-client";
import type { ProviderId } from "@/types/provider.types";

type Database = ReturnType<typeof useDatabase>;

interface UseChatHydrationOptions {
  chatIdParam: string;
  db: Database;
  clearOverride: () => void;
  syncFromDatabase: (provider: ProviderId | null, model: string | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<ModelMessage[]>>;
  setThinkingOutput: React.Dispatch<React.SetStateAction<string[]>>;
  setTitle: (title: string) => void;
  setText: (value: string) => void;
  clearPendingAttachments: () => void;
  resetAutoTitleState: () => void;
  syncAutoTitleState: (title: string) => void;
}

interface UseChatHydrationReturn {
  chatID: number;
  setChatID: React.Dispatch<React.SetStateAction<number>>;
  isInitializing: boolean;
  hydrationError: string | null;
  retryHydration: () => void;
}

interface HydrationSnapshot {
  signature: string;
  chatScope: string;
  chatId: number;
  messages: ModelMessage[];
  thinkingOutput: string[];
  title: string;
  providerId: ProviderId | null;
  modelId: string | null;
  didCoerceContent: boolean;
  droppedMessages: number;
}

interface ChatHydrationLoadResult {
  chatId: number;
  snapshot: HydrationSnapshot | null;
}

function normalizeThinkingOutput(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export function useChatHydration(
  options: UseChatHydrationOptions,
): UseChatHydrationReturn {
  const {
    chatIdParam,
    db,
    clearOverride,
    syncFromDatabase,
    setMessages,
    setThinkingOutput,
    setTitle,
    setText,
    clearPendingAttachments,
    resetAutoTitleState,
    syncAutoTitleState,
  } = options;

  const [chatID, setChatID] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const hydrationAttemptRef = useRef(0);
  const lastHydratedSignatureRef = useRef<string | null>(null);
  const currentChatIdRef = useRef<string | null>(null);
  const backfilledChatIdsRef = useRef<Set<number>>(new Set());

  const resetHydratedState = useCallback((nextChatScope: string | null) => {
    unstable_batchedUpdates(() => {
      setMessages([]);
      setThinkingOutput([]);
      setTitle(DEFAULT_CHAT_TITLE);
      setText("");
      setChatID(0);
    });

    clearPendingAttachments();
    clearOverride();
    currentChatIdRef.current = nextChatScope;
    lastHydratedSignatureRef.current = null;
    resetAutoTitleState();
  }, [
    clearOverride,
    clearPendingAttachments,
    resetAutoTitleState,
    setMessages,
    setText,
    setThinkingOutput,
    setTitle,
  ]);

  const applyHydrationSnapshot = useCallback((snapshot: HydrationSnapshot) => {
    if (snapshot.signature === lastHydratedSignatureRef.current) {
      return;
    }

    unstable_batchedUpdates(() => {
      setMessages(snapshot.messages);
      setThinkingOutput(snapshot.thinkingOutput);
      setTitle(snapshot.title);
      setChatID(snapshot.chatId);
      setHydrationError(null);
    });

    currentChatIdRef.current = snapshot.chatScope;
    lastHydratedSignatureRef.current = snapshot.signature;
    syncAutoTitleState(snapshot.title);

    if (snapshot.providerId && snapshot.modelId) {
      syncFromDatabase(snapshot.providerId, snapshot.modelId);
    }
  }, [setMessages, setThinkingOutput, setTitle, syncAutoTitleState, syncFromDatabase]);

  const hydrationQuery = useQuery<ChatHydrationLoadResult>({
    queryKey: chatQueryKeys.hydration(chatIdParam),
    enabled: chatIdParam !== "new",
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const loadOperation = startPersistenceOperation("load", {
        chatScope: chatIdParam,
        hydrationAttempt: hydrationAttemptRef.current,
      });
      const id = Number(chatIdParam);

      if (Number.isNaN(id)) {
        const invalidIdError = new Error(`Invalid chat id: ${chatIdParam}`);
        failPersistenceOperation(loadOperation, invalidIdError, {
          chatScope: chatIdParam,
        });
        throw new Error("Invalid chat id. Please reopen from chat history.");
      }

      try {
        const data = await db
          .select()
          .from(chat)
          .where(eq(chat.id, id))
          .get();

        if (!data) {
          succeedPersistenceOperation(loadOperation, {
            chatId: id,
            chatFound: false,
          });

          return {
            chatId: id,
            snapshot: null,
          };
        }

        const {
          messages,
          didCoerceContent,
          droppedMessages,
        } = normalizePersistedMessages(data.messages);
        const thinkingOutput = normalizeThinkingOutput(data.thinkingOutput);
        const title = typeof data.title === "string" && data.title.trim().length > 0
          ? data.title
          : DEFAULT_CHAT_TITLE;

        succeedPersistenceOperation(loadOperation, {
          chatId: id,
          chatFound: true,
          messageCount: messages.length,
          thinkingOutputCount: thinkingOutput.length,
        });

        return {
          chatId: id,
          snapshot: {
            signature: createIdempotencyKey("chat-hydration", [
              chatIdParam,
              String(data.updatedAt?.toISOString?.() ?? ""),
              JSON.stringify(messages),
              JSON.stringify(thinkingOutput),
              title,
              String(data.providerId ?? ""),
              String(data.modelId ?? ""),
            ]),
            chatScope: chatIdParam,
            chatId: id,
            messages,
            thinkingOutput,
            title,
            providerId: (data.providerId as ProviderId | null) ?? null,
            modelId: data.modelId,
            didCoerceContent,
            droppedMessages,
          },
        };
      } catch (error) {
        failPersistenceOperation(loadOperation, error, {
          chatId: id,
        });
        throw new Error(
          "Unable to hydrate this chat right now. You can keep using a new chat and try reopening this conversation.",
        );
      }
    },
  });

  const retryHydration = useCallback(() => {
    if (chatIdParam === "new" || isInitializing || hydrationQuery.isFetching) {
      return;
    }

    hydrationAttemptRef.current += 1;
    setIsInitializing(true);
    setHydrationError(null);
    void hydrationQuery.refetch();
  }, [chatIdParam, hydrationQuery, isInitializing]);

  useEffect(() => {
    if (currentChatIdRef.current === chatIdParam) {
      return;
    }

    setIsInitializing(true);
    setHydrationError(null);
    resetHydratedState(null);
  }, [chatIdParam, resetHydratedState]);

  useEffect(() => {
    if (chatIdParam !== "new") {
      return;
    }

    currentChatIdRef.current = "new";
    setHydrationError(null);
    lastHydratedSignatureRef.current = null;
    setThinkingOutput([]);
    clearPendingAttachments();
    resetAutoTitleState();
    setIsInitializing(false);
  }, [
    chatIdParam,
    clearPendingAttachments,
    resetAutoTitleState,
    setThinkingOutput,
  ]);

  useEffect(() => {
    if (chatIdParam === "new" || !hydrationQuery.data) {
      return;
    }

    if (!hydrationQuery.data.snapshot) {
      resetHydratedState(null);
      setHydrationError(null);
      setIsInitializing(false);
      return;
    }

    const snapshot = hydrationQuery.data.snapshot;
    applyHydrationSnapshot(snapshot);

    const shouldBackfillLegacyPayload = (snapshot.didCoerceContent || snapshot.droppedMessages > 0)
      && !backfilledChatIdsRef.current.has(snapshot.chatId);

    if (shouldBackfillLegacyPayload) {
      backfilledChatIdsRef.current.add(snapshot.chatId);

      void runChatOperation(String(snapshot.chatId), async () => {
        if (isChatDeleteLocked(snapshot.chatId)) {
          backfilledChatIdsRef.current.delete(snapshot.chatId);
          return;
        }

        await db
          .update(chat)
          .set({
            messages: snapshot.messages,
            thinkingOutput: snapshot.thinkingOutput,
          })
          .where(eq(chat.id, snapshot.chatId));
      }).catch((error) => {
        backfilledChatIdsRef.current.delete(snapshot.chatId);
        console.warn("[Chat] Failed to backfill legacy chat payload:", error);
      });
    }

    setIsInitializing(false);
  }, [
    applyHydrationSnapshot,
    chatIdParam,
    db,
    hydrationQuery.data,
    resetHydratedState,
  ]);

  useEffect(() => {
    if (chatIdParam === "new" || !hydrationQuery.error) {
      return;
    }

    resetHydratedState(null);
    setHydrationError(hydrationQuery.error.message);
    setIsInitializing(false);
  }, [chatIdParam, hydrationQuery.error, resetHydratedState]);

  return {
    chatID,
    setChatID,
    isInitializing,
    hydrationError,
    retryHydration,
  };
}
