# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- Per-chat persistence orchestration pattern (`hooks/useMessagePersistence.ts`): build deterministic snapshot key via `createIdempotencyKey`, dedupe in-flight saves with `createIdempotencyRegistry`, serialize writes with `writeQueueRef` promise chaining, and promote queued post-insert saves to update using `activeChatIdRef` once insert returns the canonical chat ID.
- Chat-switch stale result guard pattern (`hooks/useMessagePersistence.ts`): stamp each snapshot with `chatScope` (`chatIdParam` at snapshot creation) and ignore completion/error state updates when the snapshot scope no longer matches `activeChatScopeRef`, preventing late writes from prior chats from mutating the current chat UI state.
- Deterministic hydration guard pattern (`app/chat/[id].tsx`): start each chat-load attempt with `createSequenceGuard("chat-hydration")` token, reject stale post-await continuations via `isCurrent(token)`, normalize DB payloads into one immutable snapshot, then commit related state updates in one `unstable_batchedUpdates` block so metadata + messages hydrate atomically.
- Retrieval recovery UX split pattern (`app/chat/[id].tsx`): keep retrieval/hydration failures on a dedicated recovery surface (`RetrievalRecoveryView`) with its own retry trigger, while preserving `RetryBanner` only for send-stream failures so users get context-specific error messaging and retry behavior.
- Resilient list row normalization pattern (`app/index.tsx`): normalize unknown DB rows through a strict adapter (`normalizeChatRow` + `coerceTimestamp`) and drop malformed entries before render so one corrupt row cannot crash/blank an entire list; pair with a lightweight banner to communicate partial visibility.
- Title sentinel normalization pattern (`lib/chat-title.ts`): keep `"Chat"` as an internal/default sentinel, map it to `null` at persistence boundaries (`normalizeTitleForPersistence`) and to an explicit UX fallback label at render boundaries (`getChatTitleForDisplay`) so failed auto-title generation never blocks chat flows and untitled chats stay rename-safe.
- Additive migration safety pattern (`drizzle/__tests__/schemaCompatibility.test.ts`): treat migration SQL as a pre-release contract by scanning every journaled migration for destructive statements and asserting each statement matches additive forms only, then compare legacy/current snapshots to guarantee original chat columns remain readable after upgrade.
- Shared chat flow lock pattern (`lib/chat-persistence-coordinator.ts`): serialize list-level operations with `runListOperation`, serialize per-chat checkpoint/delete mutations with `runChatOperation`, and guard open/checkpoint writes during delete windows via `acquireChatDeleteLock` + `isChatDeleteLocked`.
- Structured persistence telemetry wrapper pattern (`lib/persistence-telemetry.ts`): model each operation as a started/succeeded/failed lifecycle with one generated `correlationId`, always emit `errorClassification` (`"none"` for non-failures), and centralize success/failure counters plus latency histogram bucket updates in shared helpers to keep instrumentation consistent across hooks/screens.
- Persistence alert hook pattern (`lib/persistence-telemetry.ts`): register alert consumers through a shared `registerPersistenceAlertHook` registry and evaluate alerting rules in the same success/failure lifecycle path so failure-rate spikes, SLA latency regressions, and repeated softlock signatures are emitted uniformly for all instrumented persistence flows.

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

## 2026-02-09 - US-003
- What was implemented
  - Hardened `app/chat/[id].tsx` hydration flow to load existing chats through a deterministic guard token (`createSequenceGuard`) so stale async loads cannot mutate current chat state after navigation changes.
  - Added snapshot normalization for DB payloads (`messages`, `thinkingOutput`, `title`) and idempotent hydration signature checks to avoid replaying stale/equivalent hydrations.
  - Committed hydration state atomically using `unstable_batchedUpdates` for reset + apply paths, ensuring metadata and message history become visible together as one consistent snapshot.
  - Added recoverable hydration failure UX: invalid IDs and DB-read failures now set explicit hydration errors, reset to safe empty state, unblock initialization, and expose a retry path through `RetryBanner`.
- Files changed
  - `app/chat/[id].tsx`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Route-driven hydration is safest when it mirrors persistence guards: tokenized load attempts + stale-result rejection + atomic state commit prevent partial/stale UI snapshots.
    - Reusing existing retry surfaces (here `RetryBanner`) for hydration failures gives a low-friction recovery path without introducing another transient-error component.
  - Gotchas encountered
    - Repository-wide `npx tsc --noEmit` and `npm run lint` still fail on pre-existing unrelated files (same baseline issues, plus lint error in `components/chat/__tests__/MessageList.test.tsx`), so acceptance checks remain blocked outside US-003 scope.
---

## 2026-02-09 - US-004
- What was implemented
  - Added a dedicated retrieval recovery UI (`RetrievalRecoveryView`) that appears when chat hydration/retrieval fails, replacing the previous dead-end feeling of an empty chat with only generic retry messaging.
  - Wired a safe hydration retry path in `app/chat/[id].tsx` (`retryHydration`) that re-runs retrieval by bumping `hydrationAttempt` while `createSequenceGuard` continues to reject stale async completions.
  - Separated error surfaces so retrieval failures render in `RetrievalRecoveryView`, while `RetryBanner` now stays focused on send/retry-last-message failures to avoid mixed semantics.
- Files changed
  - `app/chat/[id].tsx`
  - `components/chat/RetrievalRecoveryView.tsx`
  - `components/index.ts`
  - `components/chat/index.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Keeping hydration retry UX separate from message-send retry UX reduces user confusion and avoids coupling unrelated retry pipelines.
    - Re-triggering retrieval through a monotonic attempt counter plus sequence-token stale guards gives safe retries without duplicating hydrated state.
  - Gotchas encountered
    - Repository-wide acceptance checks remain blocked by pre-existing issues: typecheck errors in `app/index.tsx`, `hooks/__tests__/useErrorRecovery.test.ts`, `providers/__tests__/ollama-provider.test.ts`, and lint error in `components/chat/__tests__/MessageList.test.tsx`.
---

## 2026-02-09 - US-005
- What was implemented
  - Hardened chat list rendering in `app/index.tsx` with row normalization (`normalizeChatRow`) and timestamp coercion (`coerceTimestamp`) so malformed/partial DB rows are safely skipped instead of breaking full-list rendering.
  - Added safe preview extraction guards in `getPreview` to prevent unexpected message payload shapes from throwing during list render.
  - Added non-blocking pull-to-refresh (`onRefresh`/`refreshing`) backed by `refreshNonce` re-query triggers and transient error handling that always clears refreshing state.
  - Added lightweight banner messaging for transient list-refresh/query errors and partial-row drops, keeping the list interactive and visible during degraded states.
- Files changed
  - `app/index.tsx`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - `useLiveQuery` refreshes can be safely user-triggered by coupling a monotonic dependency nonce with a best-effort direct query, while keeping UI non-blocking via `finally`-driven refresh reset.
    - Treating list rows as untrusted runtime data (even when typed) and adapting them into a strict view model prevents single-record corruption from escalating into full-screen failures.
  - Gotchas encountered
    - Repository-wide `npm run lint` and `npx tsc --noEmit` still fail due pre-existing unrelated issues in test files (`components/chat/__tests__/MessageList.test.tsx`, `hooks/__tests__/useErrorRecovery.test.ts`, `providers/__tests__/ollama-provider.test.ts`) outside US-005 scope.
---

## 2026-02-09 - US-006
- What was implemented
  - Added shared chat-title normalization utilities (`lib/chat-title.ts`) to separate internal title sentinel handling from persistence and display fallback behavior.
  - Updated persistence and list/chat rendering to use the shared title helpers so untitled rows reliably render with fallback UX and default/sentinel titles persist as `null`.
  - Hardened auto-title flow to be non-blocking and safer around manual title updates: auto-generation now triggers once per chat save lifecycle and ignores stale results after user/manual title changes.
  - Added regression coverage proving untitled saves can later persist manual rename updates (`hooks/__tests__/useMessagePersistence.test.ts`).
- Files changed
  - `lib/chat-title.ts`
  - `hooks/useMessagePersistence.ts`
  - `app/chat/[id].tsx`
  - `app/index.tsx`
  - `components/chat/ChatListItem.tsx`
  - `hooks/chat/useTitleGeneration.ts`
  - `hooks/__tests__/useMessagePersistence.test.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Centralizing default-title sentinel rules in one helper avoids drift between DB serialization and UI fallback labels, which prevents untitled/renamed regressions.
    - Title-generation async results should be version-guarded against concurrent manual updates to avoid late AI responses clobbering user intent.
  - Gotchas encountered
    - Repository-wide `npm run lint` and `npx tsc --noEmit` still fail due pre-existing unrelated test issues (`components/chat/__tests__/MessageList.test.tsx`, `hooks/__tests__/useErrorRecovery.test.ts`, `providers/__tests__/ollama-provider.test.ts`).
---

## 2026-02-09 - US-007
- What was implemented
  - Added additive-only schema updates by introducing non-destructive chat indexes (`chat_updated_at_idx`, `chat_provider_id_idx`) in `db/schema.ts` and generating migration `drizzle/0001_boring_sabretooth.sql`.
  - Updated Drizzle migration registry wiring in `drizzle/migrations.js` and journal metadata in `drizzle/meta/_journal.json` / `drizzle/meta/0001_snapshot.json`.
  - Added pre-release compatibility validation in `drizzle/__tests__/schemaCompatibility.test.ts` that enforces migration SQL is additive-only and verifies legacy chat columns remain readable in the latest snapshot.
  - Ran `npx jest drizzle/__tests__/schemaCompatibility.test.ts` (pass).
  - Ran acceptance checks: `npm run lint` (fails on pre-existing lint error in `components/chat/__tests__/MessageList.test.tsx`, plus existing warning) and `npx tsc --noEmit` (fails on pre-existing test typing errors in `hooks/__tests__/useErrorRecovery.test.ts` and `providers/__tests__/ollama-provider.test.ts`).
- Files changed
  - `db/schema.ts`
  - `drizzle/0001_boring_sabretooth.sql`
  - `drizzle/meta/_journal.json`
  - `drizzle/meta/0001_snapshot.json`
  - `drizzle/migrations.js`
  - `drizzle/__tests__/schemaCompatibility.test.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Journal-driven migration tests are a reliable pre-release guardrail: they catch destructive SQL before release and make compatibility requirements executable.
    - Snapshot-diff assertions (legacy vs latest) provide a low-friction contract that upgrades preserve read-shape compatibility for existing records.
- Gotchas encountered
  - Repository-wide lint/typecheck remain red due unrelated baseline issues in existing test files outside US-007 scope.
---

## 2026-02-09 - US-008
- What was implemented
  - Added explicit lock + ordering semantics for persistence-adjacent chat flows via new coordinator module (`runListOperation`, `runChatOperation`, delete lock helpers) and wired it into list refresh, open, create navigation, and delete paths in `app/index.tsx`.
  - Hardened delete/open race window by locking chat IDs during delete and skipping stale open attempts while delete is active.
  - Hardened persistence checkpoints during delete races by queueing save work through `runChatOperation` and short-circuiting update checkpoints when `isChatDeleteLocked(chatId)` is true in `hooks/useMessagePersistence.ts`.
  - Added deterministic regression coverage for ordering + lock lifecycle (`lib/__tests__/chat-persistence-coordinator.test.ts`) and delete-lock checkpoint suppression (`hooks/__tests__/useMessagePersistence.test.ts`).
  - Cleared the long-standing lint error in `components/chat/__tests__/MessageList.test.tsx` by assigning a display name to the mocked `FlashList` forwardRef component.
  - Ran checks: `npm run lint` (passes with one existing warning in `components/chat/CustomMarkdown/CustomMarkdown.tsx`) and `npx tsc --noEmit` (still fails on pre-existing unrelated test typing errors in `hooks/__tests__/useErrorRecovery.test.ts` and `providers/__tests__/ollama-provider.test.ts`).
- Files changed
  - `lib/chat-persistence-coordinator.ts`
  - `app/index.tsx`
  - `hooks/useMessagePersistence.ts`
  - `lib/__tests__/chat-persistence-coordinator.test.ts`
  - `hooks/__tests__/useMessagePersistence.test.ts`
  - `components/chat/__tests__/MessageList.test.tsx`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Unifying list/open/delete sequencing and persistence checkpoint sequencing behind a shared coordinator removes cross-surface race windows that per-hook local queues cannot see.
    - Delete-lock checks are a practical defensive guard for unknown race windows: no-oping stale open/checkpoint writes during active delete avoids inconsistent UI/database recovery paths.
- Gotchas encountered
  - `components/chat/__tests__/ChatListItem.test.tsx` appears to have existing test-environment instability around gesture-handler swipeable rendering; US-008 regression verification was anchored in deterministic coordinator/persistence tests instead.
  - Repository-wide `npx tsc --noEmit` remains blocked by pre-existing type errors outside US-008 scope.
---

## 2026-02-09 - US-009
- What was implemented
  - Added a shared telemetry module (`lib/persistence-telemetry.ts`) for persistence operation lifecycles that emits structured started/succeeded/failed events with `correlationId`, `errorClassification`, operation metadata, and latency.
  - Wired save telemetry into `useMessagePersistence` so each save attempt emits structured events and records success/failure counters plus latency histogram buckets.
  - Wired load telemetry into `app/chat/[id].tsx` hydration flow (including invalid ID and DB-read failure paths).
  - Wired list telemetry into `app/index.tsx` list-query lifecycle so refresh/initial list fetches emit started/succeeded/failed events with row-count metadata.
  - Wired title-generation and manual-rename telemetry into `hooks/chat/useTitleGeneration.ts` for both retry and non-retry paths.
- Files changed
  - `lib/persistence-telemetry.ts`
  - `hooks/useMessagePersistence.ts`
  - `app/chat/[id].tsx`
  - `app/index.tsx`
  - `hooks/chat/useTitleGeneration.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Keeping telemetry lifecycle primitives (`start/succeed/fail`) in one module avoids per-feature drift and guarantees required fields (`correlationId`, `errorClassification`) are present consistently.
    - Query-style flows (`useLiveQuery`) are easiest to instrument by pairing an explicit "start" trigger (dependency change) with a resolution effect that marks success/failure once data or error lands.
  - Gotchas encountered
    - `npx tsc --noEmit` still fails on pre-existing unrelated test typing issues in `hooks/__tests__/useErrorRecovery.test.ts` and `providers/__tests__/ollama-provider.test.ts`.
    - `npm run lint` passes with one pre-existing warning in `components/chat/CustomMarkdown/CustomMarkdown.tsx` (`react-hooks/exhaustive-deps`).
---

## 2026-02-09 - US-010
- What was implemented
  - Added persistence alert hook support in `lib/persistence-telemetry.ts` via `registerPersistenceAlertHook` and structured alert event types for three regression classes: `failure_rate_spike`, `latency_regression`, and `repeated_softlock_signature`.
  - Added in-module alerting rules for critical persistence flows (`save`, `load`, `list`) that detect rolling-window failure-rate spikes and SLA latency regressions, and emit alert events through a shared alert dispatcher.
  - Added softlock regression alerting support via metadata signature extraction in normal failure telemetry and explicit `reportSoftlockSignatureEvent` reporting for repeated signature detection within a bounded time window.
  - Added focused regression tests in `lib/__tests__/persistence-telemetry.test.ts` to verify all three alert hook paths.
  - Ran `npm run lint` (passes with existing warning) and `npx tsc --noEmit` (still fails on pre-existing unrelated test typing issues).
- Files changed
  - `lib/persistence-telemetry.ts`
  - `lib/__tests__/persistence-telemetry.test.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Keeping alert-rule evaluation colocated with shared telemetry lifecycle handlers prevents instrumentation drift and guarantees each persistence surface inherits the same regression detection behavior.
    - Event-signature windows (e.g., softlock signature rolling counts) are a lightweight way to turn repeated low-level failures into actionable higher-level regression signals.
  - Gotchas encountered
    - `npx tsc --noEmit` remains blocked by pre-existing test typing failures in `hooks/__tests__/useErrorRecovery.test.ts` and `providers/__tests__/ollama-provider.test.ts`, outside US-010 scope.
    - `npm run lint` passes but retains one existing warning in `components/chat/CustomMarkdown/CustomMarkdown.tsx` (`react-hooks/exhaustive-deps`).
---
