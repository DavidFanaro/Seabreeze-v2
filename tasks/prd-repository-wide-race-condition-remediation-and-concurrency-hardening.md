# PRD: Repository-Wide Race Condition Remediation and Concurrency Hardening

## Overview
This initiative performs a full-repository pass to identify, fix, and prevent race conditions across the Seabreeze Expo/React Native chat app. It targets both known and latent concurrency defects and introduces durable architectural safeguards so future changes remain race-safe.  
Scope includes `app/`, `hooks/`, `stores/`, `providers/`, `db/`, and `lib/`.

## Goals
- Eliminate known race-condition bugs in production-critical and non-critical paths.
- Establish explicit concurrency invariants for critical modules.
- Create broad, deterministic race-focused regression coverage across the repository.
- Standardize concurrency control patterns (cancellation, idempotency, sequencing, atomic updates).
- Reduce nondeterministic behavior in chat, provider fallback, persistence, and hydration flows.

## Quality Gates

These commands must pass for every user story:
- `npm run lint` - Linting
- `npx tsc --noEmit` - Type checking
- `npm test` - Full Jest suite

UI/browser/simulator verification is **not required** for this initiative unless explicitly added later.

## Delivery Strategy
Use **multiple epics by subsystem**:
1. Cross-cutting concurrency framework + observability
2. Chat pipeline (`hooks/`, `app/`)
3. Provider orchestration (`providers/`)
4. State/persistence (`stores/`, DB interactions)
5. Data/storage and background flows (`db/`, `lib/`)
6. Repo-wide race regression suite + invariants documentation

All subsystems are treated as equally high risk and should be executed with parallelizable planning but strict dependency ordering where needed.

## User Stories

### US-001: Define Concurrency Taxonomy and Audit Baseline
**Description:** As an engineer, I want a repository-wide catalog of race classes and vulnerable flows so that remediation is complete and traceable.

**Acceptance Criteria:**
- [ ] Create a race-condition taxonomy document covering at least: stale-response overwrite, double-submit, out-of-order stream events, fallback duplication, hydration/write conflicts, and cancellation leaks.
- [ ] Produce an inventory mapping vulnerable flows to modules/files in `app/`, `hooks/`, `stores/`, `providers/`, `db/`, and `lib/`.
- [ ] Tag each entry with severity, reproducibility, and owner subsystem.
- [ ] Define “fixed” evidence requirements per race class.

### US-002: Establish Shared Concurrency Primitives
**Description:** As an engineer, I want shared utilities for cancellation, sequencing, and idempotency so that all subsystems use consistent race-safe mechanisms.

**Acceptance Criteria:**
- [ ] Introduce reusable primitives for request tokens/sequence guards, abort handling, and idempotency keys.
- [ ] Provide typed interfaces and usage patterns consumable by hooks/providers/stores.
- [ ] Add unit tests validating primitive behavior under out-of-order and aborted async scenarios.
- [ ] Document required usage rules for contributors.

### US-003: Harden Chat Send/Stream Lifecycle Ordering
**Description:** As a user, I want messages and stream updates to appear in correct order so that chat state is consistent under rapid interactions.

**Acceptance Criteria:**
- [ ] Prevent stale stream chunks from mutating newer conversation state.
- [ ] Enforce per-conversation sequencing for send/stream completion events.
- [ ] Ensure stream cancellation guarantees no post-cancel state mutation.
- [ ] Add deterministic tests for rapid send, stream overlap, and stop/start scenarios.

### US-004: Make Retry and Re-send Idempotent
**Description:** As a user, I want retry operations to avoid duplicates so that failed/retried messages do not create conflicting states.

**Acceptance Criteria:**
- [ ] Implement idempotent retry semantics for message sends.
- [ ] Guarantee retry cannot duplicate assistant/user entries for the same logical operation.
- [ ] Handle retry while previous attempts are inflight without state corruption.
- [ ] Add tests for repeated retries, quick taps, and network-flap recovery.

### US-005: Stabilize Provider Fallback and Model Selection Races
**Description:** As a user, I want provider fallback to choose one authoritative execution path so that responses are not duplicated or interleaved incorrectly.

**Acceptance Criteria:**
- [ ] Ensure only one provider response pipeline commits final state per request.
- [ ] Prevent stale fallback branches from overriding active branch state.
- [ ] Protect provider-cache/model-selection from concurrent mutation anomalies.
- [ ] Add tests covering timeout-triggered fallback, late success, and cache contention.

### US-006: Protect Zustand Hydration vs Runtime Mutation
**Description:** As a user, I want persisted state hydration to merge safely with live updates so that startup and resume do not lose or regress state.

**Acceptance Criteria:**
- [ ] Define and enforce deterministic precedence rules between hydration and runtime writes.
- [ ] Prevent hydration completion from overwriting newer in-memory updates.
- [ ] Add guards for multi-store cross-dependency initialization order.
- [ ] Add tests for cold start, resume, and simultaneous store updates.

### US-007: Serialize Critical DB Write Paths
**Description:** As an engineer, I want atomic/serialized DB operations in critical flows so that concurrent writes cannot create inconsistent records.

**Acceptance Criteria:**
- [ ] Identify DB operations requiring serialization or transactional grouping.
- [ ] Implement ordering/locking strategy for critical write/read-modify-write paths.
- [ ] Ensure duplicate logical operations are deduplicated at persistence boundaries.
- [ ] Add tests for concurrent writes and interrupted operations.

### US-008: Eliminate Non-Atomic Derived State Updates
**Description:** As an engineer, I want derived state updates to be atomic so that UI and business logic never observe impossible intermediate states.

**Acceptance Criteria:**
- [ ] Refactor multi-step async state transitions into atomic commit phases where needed.
- [ ] Remove unsafe read-modify-write patterns in asynchronous closures.
- [ ] Add selector-level tests asserting invariant preservation under concurrent triggers.
- [ ] Document module-level invariants for updated state domains.

### US-009: Add Cross-Subsystem Concurrency Regression Suite
**Description:** As an engineer, I want broad race-focused tests across repo subsystems so that known race classes cannot regress.

**Acceptance Criteria:**
- [ ] Create deterministic tests for each race class in the taxonomy.
- [ ] Cover chat/hooks, providers, stores, DB, and utility async flows.
- [ ] Include timing-control techniques (fake timers/mocks/barriers) to reproduce ordering bugs.
- [ ] Ensure tests fail before fixes and pass after fixes for representative cases.

### US-010: Add Stress and Interleaving Scenarios
**Description:** As an engineer, I want stress-style async interleaving tests so that subtle concurrency bugs surface before release.

**Acceptance Criteria:**
- [ ] Implement practical stress scenarios with repeated randomized-but-seeded operation orderings.
- [ ] Capture flaky patterns and convert reproducible failures into deterministic regression tests.
- [ ] Gate stress scenarios to run reliably in CI without nondeterministic failures.
- [ ] Publish guidance for extending stress cases safely.

### US-011: Concurrency Invariants Documentation by Critical Module
**Description:** As a maintainer, I want documented invariants per critical module so that future changes preserve concurrency correctness.

**Acceptance Criteria:**
- [ ] Document invariants for chat orchestration, provider fallback, store hydration, and DB boundaries.
- [ ] Link each invariant to guarding code paths and regression tests.
- [ ] Define anti-patterns and required patterns for new async code.
- [ ] Ensure docs are discoverable from contributor workflow docs.

### US-012: Initiative Closure and Verification
**Description:** As a team, I want a formal closure checklist so that the initiative is only complete when all race-hardening outcomes are verifiably achieved.

**Acceptance Criteria:**
- [ ] Confirm no known race-condition bugs remain in tracked inventory.
- [ ] Confirm invariants docs exist for all designated critical modules.
- [ ] Confirm automated regression coverage exists for all identified race classes.
- [ ] Produce a final report mapping fixed issues to tests and invariants.

## Functional Requirements
- FR-1: The system must maintain deterministic state transitions under concurrent async operations.
- FR-2: The system must reject or ignore stale async results when a newer operation supersedes them.
- FR-3: Message send/retry/stream/cancel flows must be idempotent and order-safe.
- FR-4: Provider fallback must commit through a single authoritative branch per request.
- FR-5: Store hydration must not overwrite newer runtime state mutations.
- FR-6: Critical persistence operations must be atomic or serialized to prevent conflicting outcomes.
- FR-7: Each identified race class must have at least one automated regression test.
- FR-8: Critical modules must publish explicit concurrency invariants and associated enforcement points.
- FR-9: New concurrency primitives must be reusable, typed, and covered by tests.
- FR-10: Initiative completion requires satisfying all quality gates and all “done” criteria in this PRD.

## Non-Goals (Out of Scope)
- New user-facing features unrelated to concurrency correctness.
- Performance optimization work not directly tied to race-condition mitigation.
- Visual/UI redesign work.
- Changing product behavior for preference reasons where no concurrency defect exists.
- Infrastructure migrations unrelated to solving or preventing race conditions.

## Technical Considerations
- Align with existing architecture: Expo Router app structure, Zustand stores, provider factory/fallback chain, Drizzle + SQLite.
- Prefer deterministic orchestration patterns over ad hoc async guards.
- Use explicit ownership boundaries between hooks, stores, providers, and DB layers.
- Avoid introducing brittle global locks; favor scoped sequencing and idempotency boundaries.
- Ensure strict TypeScript compatibility and maintainable API surfaces for shared primitives.

## Success Metrics
- Zero known race-condition issues in the tracked inventory at closure.
- 100% of critical modules have documented concurrency invariants.
- 100% of identified race classes have automated regression coverage.
- Reduced flaky/failure incidence in async-heavy test areas over baseline.
- All stories satisfy required quality gates on merge.

## Open Questions
- Should stress/interleaving tests run on every CI run or on a scheduled/nightly lane?
- Do we require invariant templates/checklists in PR review for all future async changes?
- Is additional telemetry needed to detect race signatures in production diagnostics?