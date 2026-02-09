# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- Per-chat persistence orchestration pattern (`hooks/useMessagePersistence.ts`): build deterministic snapshot key via `createIdempotencyKey`, dedupe in-flight saves with `createIdempotencyRegistry`, serialize writes with `writeQueueRef` promise chaining, and promote queued post-insert saves to update using `activeChatIdRef` once insert returns the canonical chat ID.

---

## 2026-02-09 - US-001
- What was implemented
  - Verified the per-chat persistence orchestrator already exists in `hooks/useMessagePersistence.ts` and satisfies create + append flow orchestration through one save pipeline (`createSnapshot` -> `runSerializedSave` -> `saveWithRetry` -> `executeSave`).
  - Verified deterministic per-chat serialization via FIFO promise queue (`writeQueueRef`) and insert-to-update promotion with `activeChatIdRef`.
  - Verified idempotency guards prevent duplicate writes using deterministic snapshot keys, in-flight dedupe (`saveRegistryRef`), and persisted snapshot suppression (`lastPersistedSnapshotKeyRef`).
  - Ran focused regression coverage in `hooks/__tests__/useMessagePersistence.test.ts`; all US-001-relevant tests pass.
- Files changed
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - The orchestrator keeps `chatIdParam` as an initial hint only; once insert succeeds, `activeChatIdRef` becomes the authoritative chat identity for all subsequent queued writes.
    - Combining queue serialization and idempotency registry is necessary: queue alone orders writes but does not dedupe identical concurrent triggers; registry closes that gap.
  - Gotchas encountered
    - Repository-wide `npm run lint` and `npx tsc --noEmit` currently fail due to pre-existing unrelated issues outside US-001 scope, so acceptance checks cannot be fully green without separate cleanup work.
---
