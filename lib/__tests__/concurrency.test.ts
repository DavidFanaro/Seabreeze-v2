import {
  createAbortError,
  createAbortManager,
  createIdempotencyKey,
  createIdempotencyRegistry,
  createSequenceGuard,
  isAbortError,
} from "../concurrency";

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
});
