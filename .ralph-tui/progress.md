# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- Per-chat persistence orchestration pattern (`hooks/useMessagePersistence.ts`): build deterministic snapshot key via `createIdempotencyKey`, dedupe in-flight saves with `createIdempotencyRegistry`, serialize writes with `writeQueueRef` promise chaining, and promote queued post-insert saves to update using `activeChatIdRef` once insert returns the canonical chat ID.
- Chat-switch stale result guard pattern (`hooks/useMessagePersistence.ts`): stamp each snapshot with `chatScope` (`chatIdParam` at snapshot creation) and ignore completion/error state updates when the snapshot scope no longer matches `activeChatScopeRef`, preventing late writes from prior chats from mutating the current chat UI state.

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

## 2026-02-09 - US-002
- What was implemented
  - Hardened `useMessagePersistence` to preserve optimistic UX while preventing stale persistence callbacks from prior chat scopes from mutating current-chat save state.
  - Added `chatScope` snapshots + `activeChatScopeRef` guard so late save completions/errors are ignored after chat changes.
  - Reset persistence orchestration state (`writeQueueRef`, pending save ref, save status/error/attempt counters) on `chatIdParam` changes to avoid cross-chat leakage.
  - Expanded persistence tests to cover: placeholder-only error streams not persisting, stale save completion after chat switch, and non-blocking save error recovery path.
- Files changed
  - `hooks/useMessagePersistence.ts`
  - `hooks/__tests__/useMessagePersistence.test.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Snapshot scope stamping (`chatScope`) plus scope-ref validation is a low-cost way to keep async durability pipelines safe across route/chat transitions without cancelling in-flight writes.
    - Explicitly resetting queue/error refs on chat changes keeps per-chat ordering deterministic while avoiding stale UI status bleed into the next chat session.
  - Gotchas encountered
    - Repository-wide `npx tsc --noEmit` and `npm run lint` still fail due pre-existing unrelated issues (e.g. `app/index.tsx`, `hooks/__tests__/useErrorRecovery.test.ts`, `providers/__tests__/ollama-provider.test.ts`, `components/chat/__tests__/MessageList.test.tsx`), so full acceptance checks cannot be green from US-002 changes alone.
---
