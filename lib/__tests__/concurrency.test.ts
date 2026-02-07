import {
  createAbortError,
  createAbortManager,
  createIdempotencyKey,
  createIdempotencyRegistry,
  createSequenceGuard,
  isAbortError,
} from "../concurrency";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return (): number => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function waitForAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(createAbortError("Request aborted before start"));
      return;
    }

    signal.addEventListener(
      "abort",
      () => {
        reject(createAbortError("Request aborted during execution"));
      },
      { once: true },
    );
  });
}

describe("concurrency primitives", () => {
  describe("createSequenceGuard", () => {
    it("accepts only the latest request token", () => {
      const guard = createSequenceGuard("chat-stream");

      const first = guard.next();
      const second = guard.next();

      expect(guard.isCurrent(first)).toBe(false);
      expect(guard.isCurrent(second)).toBe(true);
      expect(guard.current()).toEqual(second);
    });

    it("prevents stale out-of-order completion from committing", () => {
      const guard = createSequenceGuard("title-generation");
      const first = guard.next();
      const second = guard.next();

      const accepted: string[] = [];

      if (guard.isCurrent(second)) {
        accepted.push("second");
      }

      if (guard.isCurrent(first)) {
        accepted.push("first");
      }

      expect(accepted).toEqual(["second"]);
    });
  });

  describe("createAbortManager", () => {
    it("aborts the previous lease when a new lease starts", () => {
      const manager = createAbortManager();

      const first = manager.begin();
      expect(first.isAborted()).toBe(false);

      const second = manager.begin();

      expect(first.isAborted()).toBe(true);
      expect(second.isAborted()).toBe(false);
      expect(manager.hasActive()).toBe(true);
    });

    it("aborts superseded async work under withAbort", async () => {
      const manager = createAbortManager();

      const first = manager.withAbort(async (signal) => waitForAbort(signal));
      const second = manager.withAbort(async () => "fresh-result");

      await expect(first).rejects.toMatchObject({ name: "AbortError" });
      await expect(second).resolves.toBe("fresh-result");
      expect(manager.hasActive()).toBe(false);
    });
  });

  describe("idempotency utilities", () => {
    it("generates deterministic idempotency keys", () => {
      const first = createIdempotencyKey("provider-send", ["chat-1", 3, true]);
      const second = createIdempotencyKey("provider-send", ["chat-1", 3, true]);
      const third = createIdempotencyKey("provider-send", ["chat-1", 4, true]);

      expect(first).toBe(second);
      expect(first).not.toBe(third);
    });

    it("deduplicates in-flight async operations for the same key", async () => {
      const registry = createIdempotencyRegistry<string>();
      const key = createIdempotencyKey("stream", ["conversation-1", "assistant"]);
      let callCount = 0;

      const task = async (): Promise<string> => {
        callCount += 1;
        await Promise.resolve();
        return "ok";
      };

      const first = registry.run(key, task);
      const second = registry.run(key, task);

      expect(registry.has(key)).toBe(true);
      expect(registry.size()).toBe(1);
      expect(await first).toBe("ok");
      expect(await second).toBe("ok");
      expect(callCount).toBe(1);
      expect(registry.size()).toBe(0);
    });

    it("allows retries after an in-flight operation settles", async () => {
      const registry = createIdempotencyRegistry<number>();
      const key = createIdempotencyKey("db-save", ["message-42"]);
      let attempts = 0;

      const task = async (): Promise<number> => {
        attempts += 1;
        return attempts;
      };

      await expect(registry.run(key, task)).resolves.toBe(1);
      await expect(registry.run(key, task)).resolves.toBe(2);
      expect(attempts).toBe(2);
    });
  });

  describe("isAbortError", () => {
    it("detects abort errors", () => {
      expect(isAbortError(createAbortError())).toBe(true);
      expect(isAbortError(new Error("boom"))).toBe(false);
    });
  });

  describe("seeded stress interleavings", () => {
    const STRESS_SEED_COUNT = process.env.CI ? 12 : 24;
    const STRESS_SEEDS = Array.from({ length: STRESS_SEED_COUNT }, (_, index) => index + 1);

    it.each(STRESS_SEEDS)(
      "preserves latest-only mutation and stale-error isolation (seed=%s)",
      async (seed) => {
        const random = createSeededRandom(seed);
        const guard = createSequenceGuard("stress-chat");
        const manager = createAbortManager();

        const commits: string[] = [];
        const surfacedErrors: string[] = [];
        const requests: Promise<void>[] = [];

        const deferredByName = {
          first: createDeferred<string>(),
          second: createDeferred<string>(),
          third: createDeferred<string>(),
        };

        const startRequest = (name: "first" | "second" | "third"): void => {
          const token = guard.next();
          const request = manager
            .withAbort(async (signal) => {
              const result = await deferredByName[name].promise;

              if (signal.aborted) {
                throw createAbortError(`${name}-aborted`);
              }

              if (guard.isCurrent(token)) {
                commits.push(result);
              }
            })
            .catch((error: unknown) => {
              if (!isAbortError(error) && guard.isCurrent(token)) {
                surfacedErrors.push(name);
              }
            });

          requests.push(request);
        };

        const operations: Array<{
          name: string;
          requires: string[];
          run: () => void;
        }> = [
          {
            name: "start-first",
            requires: [],
            run: () => startRequest("first"),
          },
          {
            name: "start-second",
            requires: ["start-first"],
            run: () => startRequest("second"),
          },
          {
            name: "start-third",
            requires: ["start-second"],
            run: () => startRequest("third"),
          },
          {
            name: "settle-first",
            requires: ["start-second"],
            run: () => {
              if (random() < 0.5) {
                deferredByName.first.resolve("first");
                return;
              }

              deferredByName.first.reject(new Error("first-network-error"));
            },
          },
          {
            name: "settle-second",
            requires: ["start-third"],
            run: () => {
              if (random() < 0.5) {
                deferredByName.second.resolve("second");
                return;
              }

              deferredByName.second.reject(new Error("second-network-error"));
            },
          },
          {
            name: "settle-third",
            requires: ["start-third"],
            run: () => {
              deferredByName.third.resolve("third");
            },
          },
        ];

        const completed = new Set<string>();

        while (completed.size < operations.length) {
          const ready = operations.filter(
            (operation) =>
              !completed.has(operation.name) &&
              operation.requires.every((requiredStep) => completed.has(requiredStep)),
          );

          const nextIndex = Math.floor(random() * ready.length);
          const nextOperation = ready[nextIndex];

          nextOperation.run();
          completed.add(nextOperation.name);
        }

        await Promise.all(requests);

        expect(commits).toEqual(["third"]);
        expect(surfacedErrors).toEqual([]);
      },
    );

    it("regression: stale failure is ignored after supersession", async () => {
      const guard = createSequenceGuard("stress-chat");
      const manager = createAbortManager();

      const deferredFirst = createDeferred<void>();
      const deferredSecond = createDeferred<void>();

      const commits: string[] = [];
      const surfacedErrors: string[] = [];

      const startRequest = (name: "first" | "second", deferred: Deferred<void>): Promise<void> => {
        const token = guard.next();

        return manager
          .withAbort(async (signal) => {
            await deferred.promise;

            if (signal.aborted) {
              throw createAbortError(`${name}-aborted`);
            }

            if (guard.isCurrent(token)) {
              commits.push(name);
            }
          })
          .catch((error: unknown) => {
            if (!isAbortError(error) && guard.isCurrent(token)) {
              surfacedErrors.push(name);
            }
          });
      };

      const first = startRequest("first", deferredFirst);
      const second = startRequest("second", deferredSecond);

      deferredFirst.reject(new Error("late-stale-failure"));
      deferredSecond.resolve(undefined);

      await Promise.all([first, second]);

      expect(commits).toEqual(["second"]);
      expect(surfacedErrors).toEqual([]);
    });
  });
});
