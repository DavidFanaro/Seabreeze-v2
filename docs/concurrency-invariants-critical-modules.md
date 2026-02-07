# Concurrency Invariants by Critical Module

Date: 2026-02-07
Owner: Maintainers touching async orchestration, provider selection, hydration, and persistence

This document defines non-negotiable concurrency invariants for critical modules.
Any async change in these areas must preserve these invariants and keep linked
regression tests green.

## 1) Chat Orchestration (`hooks/chat/useChat.ts`, `hooks/chat/useChatStreaming.ts`)

### Invariant: only the authoritative send may mutate chat state

- Guarding code paths:
  - `hooks/chat/useChat.ts` - `sendSequenceGuardRef.current.next()` creates a send token per send.
  - `hooks/chat/useChat.ts` - `canMutateForCurrentSend()` gates callbacks and post-await commits with `isCurrent(sendToken)`, cancel flag, and abort signal.
  - `hooks/chat/useChatStreaming.ts` - `canCommit()` gates chunk/thinking/error writes and callback fan-out.
- Regression tests:
  - `hooks/chat/__tests__/useChat.test.ts` - `prevents post-cancel error mutation from stale stream callbacks`.
  - `hooks/chat/__tests__/useChatStreaming.test.ts` - `blocks stale chunk updates when canMutateState becomes false`.
  - `hooks/chat/__tests__/useChatStreaming.test.ts` - `skips late error content updates when mutation gate is closed`.

### Invariant: retries are idempotent per logical failed operation

- Guarding code paths:
  - `hooks/chat/useChat.ts` - retry key via `createIdempotencyKey("chat-retry", ...)` and `retryOperationRegistryRef.current.run(...)`.
- Regression tests:
  - `hooks/chat/__tests__/useChat.test.ts` - `deduplicates quick retry taps for the same failed operation`.
  - `hooks/chat/__tests__/useChat.test.ts` - `keeps retry state stable when retry is tapped while a retry is inflight`.

## 2) Provider Fallback (`providers/fallback-chain.ts`, chat fallback loop)

### Invariant: fallback progression is deterministic and non-repeating per attempt

- Guarding code paths:
  - `providers/fallback-chain.ts` - `classifyError()` decides if fallback is allowed.
  - `providers/fallback-chain.ts` - `getNextFallbackProvider()` excludes current/failed providers and selects next available in fixed order.
  - `providers/fallback-chain.ts` - `getModelWithFallback()` tracks `attemptedProviders` and skips excluded/unavailable/already-attempted providers.
- Regression tests:
  - `providers/__tests__/fallback-chain.test.ts` - `should skip failed providers`.
  - `providers/__tests__/fallback-chain.test.ts` - `should return null when all providers failed`.
  - `providers/__tests__/fallback-chain.test.ts` - `should track attempted providers`.

### Invariant: fallback retry stays inside a single send pipeline (no duplicated user intent)

- Guarding code paths:
  - `hooks/chat/useChat.ts` - fallback handled in-loop (`while (true)`) with the same send token and assistant slot.
  - `hooks/chat/useChatStreaming.ts` - returns `nextProvider`/`nextModel` metadata for orchestrator-owned retry.
- Regression tests:
  - `hooks/chat/__tests__/useChat.test.ts` - `retries fallback in a single authoritative pipeline without duplicating user messages`.
  - `hooks/chat/__tests__/useChatStreaming.test.ts` - `surfaces timeout-triggered fallback target for authoritative retry branch`.
  - `hooks/chat/__tests__/useChatStreaming.test.ts` - `ignores stale retry-failure fallback branch when mutation gate is closed`.

## 3) Store Hydration Boundaries (`stores/hydration-registry.ts`, persisted stores)

### Invariant: runtime writes with newer version always beat late persisted hydration

- Guarding code paths:
  - `stores/hydration-registry.ts` - `applyRuntimeWriteVersion()` increments `__meta.writeVersion` on runtime mutation.
  - `stores/hydration-registry.ts` - `resolveHydrationMerge()` keeps runtime state when persisted version is older.
  - `stores/useProviderStore.ts` and `stores/useSettingsStore.ts` - `persist.merge` delegates to `resolveHydrationMerge` and `partialize` persists `writeVersion`.
- Regression tests:
  - `stores/__tests__/hydrationGuards.test.ts` - `applies persisted state on cold start when no runtime mutations exist`.
  - `stores/__tests__/hydrationGuards.test.ts` - `keeps newer runtime provider writes when hydration finishes later`.
  - `stores/__tests__/hydrationGuards.test.ts` - `preserves simultaneous runtime mutations across provider and settings stores`.

### Invariant: hydration readiness respects store dependencies

- Guarding code paths:
  - `stores/hydration-registry.ts` - dependency map + readiness helpers (`areStoreDependenciesHydrated`, `markHydrationReady`).
- Regression tests:
  - `stores/__tests__/hydrationGuards.test.ts` - dependency-aware hydration scenarios (provider/settings + coordinated hydration behavior).

## 4) DB Persistence Boundaries (`hooks/useMessagePersistence.ts`)

### Invariant: persistence operations are idempotent by snapshot key

- Guarding code paths:
  - `hooks/useMessagePersistence.ts` - snapshot key from `createIdempotencyKey("chat-persistence", ...)`.
  - `hooks/useMessagePersistence.ts` - `saveRegistryRef.current.run(snapshot.key, ...)` dedupes in-flight identical saves.
  - `hooks/useMessagePersistence.ts` - `lastPersistedSnapshotKeyRef` skips already-persisted snapshot commits.
- Regression tests:
  - `hooks/__tests__/useMessagePersistence.test.ts` - `deduplicates concurrent identical saves at the persistence boundary`.

### Invariant: writes are serialized; post-insert saves promote to update

- Guarding code paths:
  - `hooks/useMessagePersistence.ts` - FIFO queue via `writeQueueRef` chains save operations.
  - `hooks/useMessagePersistence.ts` - `activeChatIdRef` upgrades queued follow-up write from insert path to update path.
- Regression tests:
  - `hooks/__tests__/useMessagePersistence.test.ts` - `serializes superseding writes and upgrades follow-up save to update`.

## Required Patterns for New Async Code

- Create a local sequence token at operation start; gate every post-await mutation with freshness checks.
- Propagate and honor cancellation (`AbortSignal` or equivalent) across orchestrator, worker, and callback layers.
- Use deterministic idempotency keys from domain identity (scope + stable IDs), not random values.
- Keep fallback/retry progression explicit and return next-step metadata rather than recursively re-entering top-level handlers.
- Serialize side-effecting write boundaries when logical operations can overlap.
- Add deterministic regression tests for each new guard path (deferred promises/fake timers over timing sleeps).

## Anti-Patterns (Do Not Introduce)

- Async callbacks mutating shared state without token/cancellation gate checks.
- Recursive retry/fallback flows that re-add user/assistant rows or create parallel pipelines for one intent.
- Hydration merge logic that blindly spreads persisted state over runtime state.
- DB writes keyed only by transient ordering (for example index/time) instead of snapshot identity.
- Tests depending on nondeterministic wall-clock races instead of controlled interleavings.

## Contributor Workflow Integration

- Read this doc before modifying any async logic in `hooks/chat/`, `providers/`, `stores/`, or persistence hooks.
- Keep `docs/concurrency-primitives.md` and this module-invariants doc aligned when adding new primitives or race guards.
- When a stress run reveals an issue, add a fixed `regression:` test that asserts the invariant listed here.
