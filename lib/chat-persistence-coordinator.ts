/**
 * @file chat-persistence-coordinator.ts
 * @purpose Shared lock and ordering semantics for chat persistence flows.
 */

const VOID_PROMISE = Promise.resolve();

let listOperationTail: Promise<void> = VOID_PROMISE;
const chatOperationTails = new Map<string, Promise<void>>();
const deletingChatIds = new Set<number>();

function enqueueAfterTail<T>(tail: Promise<void>, task: () => Promise<T>): Promise<T> {
  return tail.then(task, task);
}

export function runListOperation<T>(task: () => Promise<T>): Promise<T> {
  const operation = enqueueAfterTail(listOperationTail, task);
  const nextTail = operation.then(() => undefined, () => undefined);
  listOperationTail = nextTail;
  return operation;
}

export function runChatOperation<T>(chatScope: string, task: () => Promise<T>): Promise<T> {
  const currentTail = chatOperationTails.get(chatScope) ?? VOID_PROMISE;
  const operation = enqueueAfterTail(currentTail, task);
  const nextTail = operation.then(() => undefined, () => undefined);
  chatOperationTails.set(chatScope, nextTail);

  return operation.finally(() => {
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
