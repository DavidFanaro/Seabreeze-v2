# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- Concurrency audits should use a stable schema per entry: `Race Class`, `Vulnerable Flow`, `Modules/Files`, `Severity`, `Reproducibility`, and `Owner Subsystem`, plus class-level fixed evidence gates to make remediation traceable.
- For async workflows, compose a local trio per scope: `createSequenceGuard` to gate commits, `createAbortManager` to cancel superseded work, and `createIdempotencyRegistry` with deterministic keys to dedupe in-flight side effects.
- For overlapping chat sends, assign a new sequence token per send and require all stream-side callbacks/state commits (chunks, errors, provider switches, completion) to pass a shared `canMutateState` gate built from token freshness + abort/cancel flags.
- For retry UX, persist a retryable logical operation key on failure and run retry cleanup/send through an in-flight idempotency registry keyed by that operation so rapid taps collapse into one execution.
- For fallback chains, keep retries inside the same send token and pass explicit `nextProvider`/`nextModel` metadata back to the orchestrator so fallback attempts reuse the same assistant slot instead of recursively starting a new send.
- For persisted Zustand stores, include a monotonic `writeVersion` metadata field and a custom `persist.merge` that keeps runtime state when `persisted.writeVersion < runtime.writeVersion`; use `partialize` to persist only `writeVersion` from metadata.
- For critical DB write paths, build a deterministic persistence snapshot key and route writes through a single serialized queue plus a key-scoped in-flight idempotency registry; keep authoritative record identity in a mutable ref so queued post-insert writes promote to update instead of issuing duplicate inserts.
- For async retry domains, pair execution-sequence tokens with snapshot-based selector helpers so stale closures cannot partially mutate shared retry metadata (`attempt`, `lastError`, `isRetrying`, `nextRetryIn`) and derived UI flags stay invariant-safe.
- For regression closure across subsystems, map each taxonomy race class to at least one deterministic suite (deferred/barrier/fake-timer controlled) and keep a representative matrix spanning hooks/chat, providers, stores, DB persistence, and shared concurrency utilities.

---

## 2026-02-06 - US-006
- What was implemented
  - Added deterministic hydration-vs-runtime precedence guards for persisted stores (`useAuthStore`, `useProviderStore`, `useSettingsStore`, `useChatOverrideStore`) using shared monotonic `writeVersion` metadata.
  - Added explicit `persist.partialize`, guarded `persist.merge`, and hydration completion metadata updates so late hydration cannot overwrite newer in-memory mutations.
  - Added a cross-store hydration dependency guard so chat overrides apply only after both `chatOverride` and its `provider` dependency are hydrated.
  - Added race-condition coverage for cold start hydration, resume/runtime-first writes, and simultaneous provider/settings runtime updates.
- Files changed
  - `stores/hydration-registry.ts`
  - `stores/useAuthStore.ts`
  - `stores/useProviderStore.ts`
  - `stores/useSettingsStore.ts`
  - `hooks/useChatState.ts`
  - `hooks/__tests__/useChatState.test.ts`
  - `stores/__tests__/hydrationGuards.test.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - A tiny store-hydration registry (`isStoreHydrated` + dependency map) is an effective seam for enforcing multi-store initialization order without tightly coupling stores.
    - Persist middleware behavior is safest when merge precedence is explicit and tested; default merge semantics can silently regress runtime-updated state during delayed hydration.
  - Gotchas encountered
    - `onRehydrateStorage` does not expose `set`, so hydration-complete metadata must be updated through the provided state reference or external store APIs.
    - Repository-wide `npx tsc --noEmit` and `npm test -- --watchAll=false` still fail due unrelated baseline issues; US-006-specific suites pass.
---

## 2026-02-06 - US-001
- What was implemented
  - Added a repository-wide concurrency taxonomy and audit baseline covering stale-response overwrite, double-submit, out-of-order stream events, fallback duplication, hydration/write conflicts, and cancellation leaks.
  - Produced an inventory of vulnerable flows mapped to files across `app/`, `hooks/`, `stores/`, `providers/`, `db/`, and `lib/`, each tagged with severity, reproducibility, and owner subsystem.
  - Defined fixed evidence requirements per race class for remediation closure.
- Files changed
  - `docs/concurrency-taxonomy-audit-baseline.md`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Chat flow already has partial stale-load protection (`loadIdRef`) in route-based loading, but streaming and fallback paths need equivalent generation/idempotency controls.
    - Persisted Zustand stores and runtime DB synchronization create repeated hydration precedence risks unless authority order is explicit and tested.
  - Gotchas encountered
    - Stream lifecycle utilities define robust transitions, but integration gaps can still produce out-of-order completion semantics if chunk/done/completed markers are not consistently emitted.
    - New-chat persistence relies on runtime guards rather than DB constraints, so duplicate insert races remain plausible under timing pressure.
---

## 2026-02-06 - US-002
- What was implemented
  - Added shared concurrency primitives in `lib/concurrency.ts` for sequence guards, abort lifecycle management, abort error detection, deterministic idempotency keys, and in-flight idempotency registries.
  - Introduced typed contracts in `types/concurrency.types.ts` and exported them via `types/index.ts` for use by hooks/providers/stores.
  - Added contributor-facing usage rules and an integration recipe in `docs/concurrency-primitives.md`.
  - Added unit tests covering stale token rejection, out-of-order completion gating, superseded abort behavior, and idempotent in-flight deduplication.
- Files changed
  - `lib/concurrency.ts`
  - `lib/__tests__/concurrency.test.ts`
  - `types/concurrency.types.ts`
  - `types/index.ts`
  - `docs/concurrency-primitives.md`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Sequence guards are most reliable when every async request gets a fresh token at launch and every commit path checks token freshness right before mutation.
    - Abort managers and idempotency registries should be scoped per workflow (not global) to avoid cross-feature cancellation and dedupe collisions.
  - Gotchas encountered
    - Deduplication should only cover in-flight work; keeping completed promises in a registry can suppress legitimate retries.
    - Abort handling is most maintainable when abort outcomes are normalized (`AbortError`) and filtered from fallback/error UX flows.
---

## 2026-02-06 - US-003
- What was implemented
  - Hardened `useChat` send lifecycle ordering by introducing per-send sequence tokens and guarding all async completion paths so stale sends cannot flip stream state or trigger completion callbacks.
  - Added mutation gating plumbing (`canMutateState`) to `useChatStreaming` so text/reasoning chunks, callbacks, and error-content writes are ignored after cancellation or when a send becomes stale.
  - Updated cancel behavior to invalidate active sequence tokens and immediately clear streaming/thinking UI state, preventing post-cancel completion races.
  - Added deterministic concurrency tests covering rapid send overlap ordering, post-cancel stale callback suppression, stale chunk gating, and abort-driven stop/start behavior.
- Files changed
  - `hooks/chat/useChat.ts`
  - `hooks/chat/useChatStreaming.ts`
  - `hooks/chat/__tests__/useChat.test.ts`
  - `hooks/chat/__tests__/useChatStreaming.test.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - A single `canMutateState` gate shared between orchestrator (`useChat`) and stream worker (`useChatStreaming`) is an effective seam for enforcing ordering without tightly coupling hook internals.
    - Cancel semantics are safer when cancellation both aborts transport and invalidates sequencing tokens, so late async work self-rejects even if already in flight.
  - Gotchas encountered
    - Guarding stale completion paths can accidentally leave `isStreaming` stuck `true` unless cancel explicitly clears UI stream flags.
    - Mocked streaming tests need deferred promises and captured callback options to deterministically reproduce overlap/cancel races.
---

## 2026-02-06 - US-004
- What was implemented
  - Added idempotent retry semantics in `useChat` by tracking a retryable logical send key on failure and deduplicating retry execution with an in-flight idempotency registry.
  - Hardened retry cleanup so failed assistant/user tail entries are removed in one deterministic pass before re-send, preventing duplicate message rows and thinking-state drift.
  - Added concurrency-focused tests for rapid double-tap retry, retry presses while an earlier retry is still in-flight, and repeated network-flap retry recovery.
- Files changed
  - `hooks/chat/useChat.ts`
  - `hooks/chat/__tests__/useChat.test.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Retry dedupe is most reliable when logical-operation identity is captured at failure time and reused as the idempotency key for all follow-up retry attempts.
    - Tail-pruning both message and thinking arrays in one retry transaction avoids split-state corruption under rapid UI interactions.
  - Gotchas encountered
    - Triggering retries back-to-back in tests requires a microtask flush before asserting streaming invocations because idempotency-registry tasks are promise-queued.
    - Repo-wide `tsc` and `npm test` currently fail due unrelated baseline issues, so targeted story verification was used to confirm retry behavior.
---

## 2026-02-06 - US-005
- What was implemented
  - Reworked `useChat` fallback execution to stay within one authoritative send pipeline: fallback retries now loop within the same send token and assistant placeholder instead of recursively calling `sendMessage`, preventing duplicate/interleaved response branches.
  - Extended `useChatStreaming` to return `nextProvider`/`nextModel` metadata and added stale-branch gating before fallback/error handling commits so superseded paths cannot schedule fallback retries or mutate provider/error state.
  - Added contention-safe provider-cache model creation via `getCachedModelWithContentionProtection`, deduplicating concurrent async model creation for the same provider/model key through an in-flight idempotency registry.
  - Added concurrency-focused tests for timeout-triggered fallback routing, stale fallback-branch suppression, single-pipeline fallback retries, and provider-cache contention deduplication.
- Files changed
  - `hooks/chat/useChat.ts`
  - `hooks/chat/useChatStreaming.ts`
  - `hooks/chat/__tests__/useChat.test.ts`
  - `hooks/chat/__tests__/useChatStreaming.test.ts`
  - `providers/provider-cache.ts`
  - `providers/__tests__/provider-cache.test.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Returning concrete fallback targets (`nextProvider`, `nextModel`) from stream workers removes hidden coupling to asynchronous React state updates and makes orchestration deterministic.
    - Cache contention controls should use key-scoped in-flight dedupe and a second cache read inside the deduped closure (double-check pattern) before creating expensive instances.
  - Gotchas encountered
    - Recursive fallback retries in the orchestrator can accidentally enqueue duplicate user/assistant entries even when per-chunk mutation guards exist; retries must stay inside the original send transaction.
    - Repository-wide `npx tsc --noEmit` and `npm test` still fail because of unrelated pre-existing issues in other suites/files, so story-level verification required targeted tests for modified modules.
---

## 2026-02-06 - US-007
- What was implemented
  - Serialized critical chat persistence writes inside `useMessagePersistence` by introducing snapshot-based deduplication, key-scoped in-flight idempotency, and a single FIFO write queue so overlapping save triggers cannot race each other.
  - Eliminated duplicate-new-chat insert races by promoting post-insert queued writes to updates via an authoritative `activeChatIdRef` and by persisting title/provider/model/message/thinking state in one atomic save path.
  - Removed competing title-only DB writes from `app/chat/[id].tsx` so persistence boundary logic is centralized in the serialized hook path.
  - Added concurrency tests covering duplicate concurrent save requests and interrupted/superseding save sequencing to verify dedupe and ordered write behavior.
- Files changed
  - `hooks/useMessagePersistence.ts`
  - `app/chat/[id].tsx`
  - `hooks/__tests__/useMessagePersistence.test.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Persistence-level dedupe is most reliable when the key includes the full logical record payload (title/provider/model/messages/thinking output) rather than only message content.
    - Serializing writes with a queue and retaining resolved row identity in a ref closes the common "double insert before first ID returns" race in new-record flows.
  - Gotchas encountered
    - Full-repo `npx tsc --noEmit` and `npm test -- --watchAll=false` remain red from unrelated baseline issues (existing `useErrorRecovery`/`ollama-provider` typing failures and multiple UI test expectation mismatches), so US-007 validation relied on targeted persistence tests in addition to the required global command attempts.
---

## 2026-02-06 - US-008
- What was implemented
  - Refactored `useErrorRecovery` async retry flow into token-gated atomic commit phases so stale retry callbacks/countdown ticks cannot write partial derived state after newer executions or abort/reset actions.
  - Removed closure read-modify-write risks by committing full retry snapshots through one normalization path and by deriving selector outputs (`canRetry`, `getRetryAfter`) from exported selector helpers.
  - Added selector/invariant coverage and concurrent supersession tests in `useErrorRecovery` to assert stable derived flags under overlapping executions and abort-triggered cancellation.
- Files changed
  - `hooks/useErrorRecovery.ts`
  - `hooks/__tests__/useErrorRecovery.test.ts`
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Execution-token guards are a lightweight way to enforce atomicity in hook-local async workflows without introducing global coordination state.
    - Selector helper exports make retry invariants testable in isolation while keeping hook consumers on one derived-state contract.
  - Gotchas encountered
    - Repository-level `npx tsc --noEmit` and `npm test -- --watchAll=false` remain failing due pre-existing baseline issues (`app/index.tsx` type mismatch, legacy Jest typing friction in older suites, and existing UI expectation mismatches), but the updated `hooks/__tests__/useErrorRecovery.test.ts` suite passes in isolation.
---

## 2026-02-07 - US-009
- What was implemented
  - Verified and consolidated cross-subsystem concurrency regression coverage against the taxonomy classes using deterministic race controls already present in the repository.
  - Confirmed representative deterministic suites for all race classes across: chat/hooks (`useChat`, `useChatStreaming`), providers (`provider-cache` contention), stores (hydration guards), DB async persistence (`useMessagePersistence`), and utility async flows (`lib/concurrency`, `useErrorRecovery`).
  - Executed targeted representative regression matrix suites to validate fail-class guards remain green under controlled ordering (`deferred` promises, in-flight barriers, fake timers, mutation gates).
  - Executed requested global quality commands (`npm run lint`, `npx tsc --noEmit`, `npm test -- --watchAll=false`) and captured current repo baseline outcomes.
- Files changed
  - `.ralph-tui/progress.md`
- **Learnings:**
  - Patterns discovered
    - Cross-subsystem race closure is easiest to keep stable when each taxonomy class has an explicit representative suite owner (hook/provider/store/db/utility) and deterministic timing primitives are mandatory in those tests.
    - A small representative matrix run (selected suites) is a fast signal for concurrency regressions even when full-repo test baselines include unrelated failures.
  - Gotchas encountered
    - Repository-wide `npx tsc --noEmit` and `npm test -- --watchAll=false` still fail from pre-existing unrelated issues (not introduced by US-009), so acceptance verification for race classes must rely on deterministic representative suites until baseline debt is cleared.
---
