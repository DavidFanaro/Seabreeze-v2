# Shared Concurrency Primitives

Use these primitives for **every async flow** in hooks, providers, and stores so
race handling is consistent across the app.

## Available Primitives

- `createSequenceGuard(scope)`
  - Issues incrementing request tokens.
  - Gate state commits with `isCurrent(token)` so stale completions are dropped.
- `createAbortManager()`
  - Creates managed abort leases (`begin`, `abortActive`, `withAbort`).
  - New work should cancel superseded in-flight work for the same scope.
- `createIdempotencyKey(scope, parts)`
  - Builds deterministic keys from stable inputs.
- `createIdempotencyRegistry<T>()`
  - Deduplicates in-flight operations per key and releases keys on settle.

## Required Usage Rules

1. **Tokenize every mutable async request**
   - Create a sequence token before starting work.
   - Only commit results if `guard.isCurrent(token)` remains true.
2. **Abort superseded work in the same scope**
   - Use one `AbortManager` per independently-cancelable workflow.
   - Prefer `withAbort` for one-shot tasks; call `abortActive` on cleanup/unmount.
3. **Deduplicate side-effecting operations**
   - Build idempotency keys from stable domain identifiers (conversation ID,
     provider ID, message ID, attempt number).
   - Wrap create/update/write requests in `registry.run(key, task)`.
4. **Keep scopes local and explicit**
   - Do not share a single global guard/abort manager/registry for unrelated
     flows.
   - Scope examples: `chat-stream`, `title-generation`, `db-save-message`.
5. **Treat abort as a first-class outcome**
   - Use `isAbortError(error)` to short-circuit noisy logging and fallback loops.
   - Only surface user-facing errors for non-abort failures.

## Integration Pattern

```ts
import {
  createAbortManager,
  createIdempotencyKey,
  createIdempotencyRegistry,
  createSequenceGuard,
} from "@/lib/concurrency";

const guard = createSequenceGuard("chat-stream");
const abortManager = createAbortManager();
const registry = createIdempotencyRegistry<void>();

async function runStream(conversationId: string): Promise<void> {
  const token = guard.next();

  await abortManager.withAbort(async (signal) => {
    const key = createIdempotencyKey("chat-stream", [conversationId, token.sequence]);

    await registry.run(key, async () => {
      const result = await fetchStream(signal);

      if (!guard.isCurrent(token)) {
        return;
      }

      commitResult(result);
    });
  });
}
```
