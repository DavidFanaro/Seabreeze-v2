/**
 * @file concurrency.ts
 * @purpose Shared concurrency primitives for sequencing, cancellation, and idempotency.
 */

import type {
  AbortLease,
  AbortManager,
  IdempotencyPart,
  IdempotencyRegistry,
  RequestToken,
  SequenceGuard,
} from "@/types/concurrency.types";

const DEFAULT_ABORT_REASON = "superseded-by-new-request";

export function createSequenceGuard(scope: string): SequenceGuard {
  let currentToken: RequestToken | null = null;

  return {
    next(): RequestToken {
      const sequence = (currentToken?.sequence ?? 0) + 1;
      currentToken = {
        scope,
        sequence,
        createdAt: Date.now(),
      };
      return currentToken;
    },
    current(): RequestToken | null {
      return currentToken;
    },
    isCurrent(token: RequestToken): boolean {
      if (!currentToken) {
        return false;
      }

      return token.scope === scope && token.sequence === currentToken.sequence;
    },
  };
}

export function createAbortError(message = "Request aborted"): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function createAbortLease(controller: AbortController): AbortLease {
  return {
    signal: controller.signal,
    abort(reason = DEFAULT_ABORT_REASON): void {
      controller.abort(reason);
    },
    isAborted(): boolean {
      return controller.signal.aborted;
    },
  };
}

export function createAbortManager(): AbortManager {
  let activeController: AbortController | null = null;

  return {
    begin(reason = DEFAULT_ABORT_REASON): AbortLease {
      if (activeController && !activeController.signal.aborted) {
        activeController.abort(reason);
      }

      const controller = new AbortController();
      activeController = controller;
      return createAbortLease(controller);
    },
    abortActive(reason = DEFAULT_ABORT_REASON): void {
      if (activeController && !activeController.signal.aborted) {
        activeController.abort(reason);
      }
      activeController = null;
    },
    async withAbort<T>(runner: (signal: AbortSignal) => Promise<T>): Promise<T> {
      const lease = this.begin();

      try {
        return await runner(lease.signal);
      } finally {
        if (activeController?.signal === lease.signal) {
          activeController = null;
        }
      }
    },
    hasActive(): boolean {
      return Boolean(activeController && !activeController.signal.aborted);
    },
  };
}

export function createIdempotencyKey(scope: string, parts: IdempotencyPart[]): string {
  const serializedParts = parts.map((part) => {
    if (part === null) {
      return "null";
    }

    if (part === undefined) {
      return "undefined";
    }

    return String(part);
  });

  return `${scope}:${serializedParts.join("|")}`;
}

export function createIdempotencyRegistry<T>(): IdempotencyRegistry<T> {
  const inFlight = new Map<string, Promise<T>>();

  return {
    run(key: string, task: () => Promise<T>): Promise<T> {
      const existing = inFlight.get(key);
      if (existing) {
        return existing;
      }

      const promise = Promise.resolve()
        .then(task)
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, promise);
      return promise;
    },
    has(key: string): boolean {
      return inFlight.has(key);
    },
    clear(key?: string): void {
      if (key) {
        inFlight.delete(key);
        return;
      }

      inFlight.clear();
    },
    size(): number {
      return inFlight.size;
    },
  };
}
