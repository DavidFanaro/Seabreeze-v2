# Concurrency Taxonomy and Audit Baseline (US-001)

Date: 2026-02-06
Scope: `app/`, `hooks/`, `stores/`, `providers/`, `db/`, `lib/`

## Purpose

Create a repository baseline for race-condition classes and currently vulnerable flows so remediation work is complete, prioritized, and traceable.

## Severity and Reproducibility Scale

- Severity: `Critical` (data loss/corruption or security impact), `High` (user-visible incorrect behavior across primary flow), `Medium` (recoverable incorrect state), `Low` (edge inconsistency with easy recovery)
- Reproducibility: `High` (deterministic or easy to trigger), `Medium` (timing-sensitive but repeatable), `Low` (rare/tight timing)

## Race-Condition Taxonomy

### 1) Stale-Response Overwrite

An older async response writes state after a newer intent, replacing correct data with stale results.

Common indicators:
- Missing request/stream generation token checks at write sites
- Position-based writes (`assistantIndex`) without validating stream ownership
- Late callbacks after navigation or cancellation still mutating state

### 2) Double-Submit

The same user intent is sent twice due to rapid actions, asynchronous disabling, or reentrant handlers.

Common indicators:
- UI disable depends on async state flip and can be bypassed with fast repeated taps
- No idempotency key per send attempt
- Multiple entry points call the same send path without single-flight guard

### 3) Out-of-Order Stream Events

Chunks, done signals, or completion handlers arrive out of order and produce invalid intermediate/final state.

Common indicators:
- No ordering or monotonic sequence enforcement for stream events
- Stream lifecycle state machine not fully integrated with chunk/done/completed callbacks
- Completion/persistence triggered without confirming event order for current stream

### 4) Fallback Duplication

Fallback retries append duplicate user/assistant messages or create multiple parallel attempts for one intent.

Common indicators:
- Recursive resend after fallback without dedupe token
- State cleanup before retry is non-atomic across multiple `setState` calls
- Failed provider tracking is mutable/shared without per-attempt isolation

### 5) Hydration/Write Conflicts

Persisted hydration and runtime writes race; whichever finishes last wins, potentially applying obsolete data.

Common indicators:
- Persisted store hydration combined with runtime DB sync or global store updates
- No revision/version checks on persisted state merges
- Silent persistence failures leading to inconsistent startup state

### 6) Cancellation Leaks

A canceled operation continues mutating state or consuming resources due to incomplete abort propagation.

Common indicators:
- Retry loops without externally enforced cancellation for in-flight operations
- Stream cancellation not fully preventing late callbacks/chunks from writing
- Background/unmount transitions cancel controller but downstream writes still occur

## Vulnerable Flow Inventory

Each entry includes race class, mapped modules/files, severity, reproducibility, and owner subsystem.

| ID | Race Class | Vulnerable Flow | Modules / Files | Severity | Reproducibility | Owner Subsystem |
| --- | --- | --- | --- | --- | --- | --- |
| RC-001 | Double-Submit | Rapid repeated send can trigger duplicate requests before `isStreaming` disable is fully effective | `app/chat/[id].tsx`, `hooks/chat/useChat.ts` | High | Medium | Chat UI + Chat Orchestrator |
| RC-002 | Stale-Response Overwrite | Stream chunks write by fixed `assistantIndex`; delayed chunks from older attempt can overwrite newer message state | `hooks/chat/useChatStreaming.ts`, `hooks/chat/useChat.ts` | High | Medium | Streaming Pipeline |
| RC-003 | Out-of-Order Stream Events | Stream lifecycle defines chunk/done/completed transitions, but orchestrator path does not fully mark chunk/done/completed, allowing timeout/completion drift | `hooks/chat/useStreamLifecycle.ts`, `hooks/chat/useChat.ts`, `hooks/useMessagePersistence.ts` | High | Medium | Streaming Lifecycle + Persistence |
| RC-004 | Fallback Duplication | Fallback retry uses recursive resend and mutable failed-provider tracking; can duplicate user/assistant rows for one intent | `hooks/chat/useChat.ts`, `hooks/chat/useChatStreaming.ts`, `providers/fallback-chain.ts` | High | Medium | Fallback Orchestration |
| RC-005 | Hydration/Write Conflicts | Chat-level provider/model overrides and global persisted provider state can race with DB sync during chat switch/startup | `hooks/useChatState.ts`, `stores/useProviderStore.ts`, `stores/useSettingsStore.ts`, `stores/useAuthStore.ts` | Medium | Medium | State Hydration |
| RC-006 | Cancellation Leaks | Retry utilities and async operations can continue running after UI cancellation unless operation-level abort is honored end-to-end | `hooks/useErrorRecovery.ts`, `hooks/chat/useChat.ts`, `hooks/chat/useChatStreaming.ts` | Medium | Medium | Error Recovery + Streaming |
| RC-007 | Hydration/Write Conflicts | New chat persistence insert/update path can race, creating duplicate chat rows or stale writes without DB-level idempotency/versioning | `hooks/useMessagePersistence.ts`, `hooks/useDatabase.ts`, `db/schema.ts` | Critical | Medium | Persistence + Data Layer |
| RC-008 | Stale-Response Overwrite | List/live-query and delete/update interactions can show stale chat rows during concurrent save/delete operations | `app/index.tsx`, `hooks/useMessagePersistence.ts`, `db/schema.ts` | Medium | Low | Chat List + Persistence |
| RC-009 | Fallback Duplication | Cached provider/model objects can remain valid across credential changes if invalidation sequencing misses a path, enabling duplicate/redundant attempts | `providers/provider-factory.ts`, `providers/provider-cache.ts`, `stores/useAuthStore.ts` | Medium | Low | Provider Infrastructure |
| RC-010 | Cancellation Leaks | Error message/retry affordances can surface retries while prior operation cancellation is still propagating | `lib/error-messages.ts`, `hooks/useErrorRecovery.ts`, `hooks/chat/useChat.ts` | Low | Low | UX Error Handling |

## Fixed Evidence Requirements (Per Race Class)

These requirements are mandatory before closing remediation for any entry in a class.

### Evidence for Stale-Response Overwrite

1. Automated test proving stale responses/chunks are ignored after a newer generation starts.
2. Code-level generation token (or equivalent) check documented at every async write site.
3. Negative test: old response arrives late and does not modify final state.

### Evidence for Double-Submit

1. Automated test for rapid repeated send/tap that results in exactly one logical request/message pair.
2. Single-flight or idempotency mechanism present in send path (code reference required).
3. Telemetry/log evidence showing dedupe guard activation in repeated-input scenario.

### Evidence for Out-of-Order Stream Events

1. Integration test with synthetic out-of-order chunk/done/completed events.
2. Deterministic ordering guard (sequence number or lifecycle generation) at event handler boundaries.
3. Assertion that completion/persistence occurs only for active stream generation.

### Evidence for Fallback Duplication

1. Test scenario where primary provider fails and fallback succeeds with no duplicate user/assistant entries.
2. Attempt-level correlation/idempotency ID propagated through fallback chain.
3. Log snapshot demonstrating single terminal attempt per user intent.

### Evidence for Hydration/Write Conflicts

1. Startup/chat-switch test proving deterministic precedence rules (hydrated vs runtime vs DB).
2. Conflict strategy documented (version check, merge policy, or explicit authority order).
3. Regression test covering near-simultaneous hydration and runtime write.

### Evidence for Cancellation Leaks

1. Test confirming cancel/unmount/background prevents any further state mutation from canceled operation.
2. End-to-end abort propagation validated across orchestrator, streaming, retry, and persistence layers.
3. Resource cleanup assertion (timers/controllers/promises) after cancel path.

## Baseline Notes

- This inventory is an audit baseline, not a final defect verdict.
- Entries are prioritized for remediation planning in subsequent user stories.
- Severity/reproducibility values should be updated after deterministic repro harnesses are added.

## Closure Verification Snapshot (US-012)

Date: 2026-02-07

| ID | Closure Status | Verification Notes |
| --- | --- | --- |
| RC-001 | Fixed | Covered by chat orchestration mutation-gate and retry-idempotency regressions in `hooks/chat/__tests__/useChat.test.ts`. |
| RC-002 | Fixed | Covered by latest-token/stale-callback rejection in chat stream suites and concurrency primitive tests. |
| RC-003 | Fixed | Covered by deterministic stale chunk/error ordering guards in `hooks/chat/__tests__/useChatStreaming.test.ts`. |
| RC-004 | Fixed | Covered by fallback-order/no-duplication regressions in `providers/__tests__/fallback-chain.test.ts` and chat retry/fallback suites. |
| RC-005 | Fixed | Covered by hydration-write precedence and dependency sequencing in `stores/__tests__/hydrationGuards.test.ts`. |
| RC-006 | Fixed | Covered by cancel/abort mutation-blocking regressions across chat + retry + concurrency suites. |
| RC-007 | Fixed | Covered by serialized persistence + dedupe boundary tests in `hooks/__tests__/useMessagePersistence.test.ts`. |
| RC-008 | Fixed | Covered by stale-write isolation/supersession checks in persistence + concurrency regression suites. |
| RC-009 | Fixed | Covered by provider cache contention/dedupe tests in `providers/__tests__/provider-cache.test.ts`. |
| RC-010 | Fixed | Covered by retry-state cancellation selector invariants in `hooks/__tests__/useErrorRecovery.test.ts`. |

Reference report: `docs/concurrency-initiative-closure-report.md`.
