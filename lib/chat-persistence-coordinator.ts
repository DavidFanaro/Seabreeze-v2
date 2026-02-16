/**
 * @file chat-persistence-coordinator.ts
 * @purpose Shared lock and ordering semantics for chat persistence flows.
 */

import {
  reportSoftlockSignatureEvent,
  type PersistenceOperation,
} from "@/lib/persistence-telemetry";

const VOID_PROMISE = Promise.resolve();
const QUEUE_SOFTLOCK_TIMEOUT_MS = 8000;
const LIST_SOFTLOCK_SIGNATURE = "list-queue-softlock";
const CHAT_SOFTLOCK_SIGNATURE = "chat-queue-softlock";

let listOperationTail: Promise<void> = VOID_PROMISE;
let listOperationSequence = 0;
let chatOperationSequence = 0;
const chatOperationTails = new Map<string, Promise<void>>();
const deletingChatIds = new Set<number>();

function enqueueAfterTail<T>(tail: Promise<void>, task: () => Promise<T>): Promise<T> {
  return tail.then(task, task);
}

function startQueueWatchdog(
  signature: string,
  operation: PersistenceOperation,
  metadata: Record<string, unknown>
): () => void {
  const startedAtMs = Date.now();
  const timeoutId = setTimeout(() => {
    reportSoftlockSignatureEvent(signature, operation, {
      ...metadata,
      watchdogTimeoutMs: QUEUE_SOFTLOCK_TIMEOUT_MS,
      elapsedMs: Date.now() - startedAtMs,
    });
  }, QUEUE_SOFTLOCK_TIMEOUT_MS);

  return () => {
    clearTimeout(timeoutId);
  };
}

export function runListOperation<T>(task: () => Promise<T>): Promise<T> {
  const operationId = ++listOperationSequence;
  const stopWatchdog = startQueueWatchdog(LIST_SOFTLOCK_SIGNATURE, "list", {
    queueType: "list",
    operationId,
  });
  const operation = enqueueAfterTail(listOperationTail, task);
  const guardedOperation = operation.finally(stopWatchdog);
  const nextTail = guardedOperation.then(() => undefined, () => undefined);
  listOperationTail = nextTail;
  return guardedOperation;
}

export function runChatOperation<T>(
  chatScope: string,
  task: () => Promise<T>,
  operation: PersistenceOperation = "save"
): Promise<T> {
  const currentTail = chatOperationTails.get(chatScope) ?? VOID_PROMISE;
  const operationId = ++chatOperationSequence;
  const stopWatchdog = startQueueWatchdog(CHAT_SOFTLOCK_SIGNATURE, operation, {
    queueType: "chat",
    chatScope,
    operationId,
  });
  const queuedOperation = enqueueAfterTail(currentTail, task);
  const guardedOperation = queuedOperation.finally(stopWatchdog);
  const nextTail = guardedOperation.then(() => undefined, () => undefined);
  chatOperationTails.set(chatScope, nextTail);

  return guardedOperation.finally(() => {
    if (chatOperationTails.get(chatScope) === nextTail) {
      chatOperationTails.delete(chatScope);
    }
  });
}

export function acquireChatDeleteLock(chatId: number): () => void {
  deletingChatIds.add(chatId);

  return () => {
    deletingChatIds.delete(chatId);
  };
}

export function isChatDeleteLocked(chatId: number): boolean {
  return deletingChatIds.has(chatId);
}
