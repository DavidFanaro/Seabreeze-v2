# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- Concurrency audits should use a stable schema per entry: `Race Class`, `Vulnerable Flow`, `Modules/Files`, `Severity`, `Reproducibility`, and `Owner Subsystem`, plus class-level fixed evidence gates to make remediation traceable.
- For async workflows, compose a local trio per scope: `createSequenceGuard` to gate commits, `createAbortManager` to cancel superseded work, and `createIdempotencyRegistry` with deterministic keys to dedupe in-flight side effects.
- For overlapping chat sends, assign a new sequence token per send and require all stream-side callbacks/state commits (chunks, errors, provider switches, completion) to pass a shared `canMutateState` gate built from token freshness + abort/cancel flags.

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
