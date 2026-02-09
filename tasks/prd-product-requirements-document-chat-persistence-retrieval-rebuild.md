# Product Requirements Document: Chat Persistence + Retrieval Rebuild

## 1) Overview

Rebuild chat persistence and retrieval orchestration to eliminate reliability issues in save/load flows, remove chat list softlocks, and harden the system against race conditions.  
The current DB schema is largely retained, with only minimal backward-compatible additions allowed.

This is a **logic/orchestration rewrite** (not a full schema replacement), with a **big-bang release**.

## 2) Confirmed Product Decisions

- Rebuild scope: **Keep DB schema, rewrite data access/orchestration** (`1B`)
- Source of truth: **Memory-first** (`2B`)
- Priority: **All known failures equally critical** (`3D`)
- Quality gates per story: **`npm run lint` + `npx tsc --noEmit`** (`4A`)
- Schema strategy: **Minimal backward-compatible additions allowed** (`5B`)
- Consistency model: **Optimistic UI + durable checkpoints** (`6C`)
- Title failure behavior: **Leave untitled; user can rename manually** (`7D`)
- Rollout: **Big-bang cutover** (`8A`)
- Crash handling for in-flight unsaved messages: **No special recovery requirement** (`9A`)
- Observability: **Full telemetry + alerting hooks** (`10D`)
- Performance target: **Use recommended realistic SLA** (`11D`)
- Hardening scope: **Broad hardening across all persistence flows** (`12C`)

## 3) Problem Statement

Current chat persistence system has systemic reliability problems:
- Title generation/save inconsistencies
- Chat hydration failures when opening existing chats
- Softlocks/freezes on chat list screen
- Unknown edge-case failures likely caused by concurrency and state drift

These issues indicate architectural fragility in orchestration, ordering, and failure handling.

## 4) Goals

- Make chat save/load behavior deterministic and race-safe.
- Ensure chat list and chat detail screens never softlock under normal failure modes.
- Preserve fast UX with optimistic memory-first updates.
- Improve traceability and debuggability with production-grade telemetry.
- Keep migration risk low by minimizing schema changes.

## 5) Non-Goals

- Full schema redesign or destructive migration.
- Exactly-once recovery of unsaved in-flight messages after app crash/force-close.
- Automatic background retry for failed title generation.
- Gradual rollout/dual-write architecture.

## 6) Functional Requirements

### FR1. New Persistence Orchestrator
- Introduce a single persistence orchestration layer for chat + messages.
- Enforce ordered writes per chat (serialize critical mutations per conversation).
- Keep UI optimistic (memory-first), then checkpoint durable state to DB.
- Prevent duplicate writes caused by retries/re-renders.

### FR2. Deterministic Retrieval/Hydration
- Loading a chat must resolve to a consistent snapshot (chat metadata + messages).
- Hydration must guard against partial reads and stale in-memory references.
- Retrieval pipeline must fail gracefully and surface recoverable UX states.

### FR3. Chat List Stability
- Chat list query path must be non-blocking and resilient to malformed/partial rows.
- Remove deadlock/softlock vectors in list hydration and sorting logic.
- Ensure list refresh cannot permanently block user interaction.

### FR4. Title Generation Behavior
- If title generation fails, chat remains untitled with safe placeholder UX.
- No mandatory automatic retry loop.
- User can manually rename untitled chats reliably.

### FR5. Backward-Compatible DB Changes
- Allow minimal additive schema updates only (new columns/tables/indexes as needed).
- No destructive changes to existing chat/message data.
- Existing records remain readable post-release.

### FR6. Broad Concurrency Hardening
- Audit and harden all persistence flows (create chat, append message, edit, delete, list, open).
- Define clear lock/order semantics for overlapping operations.
- Eliminate race conditions between streaming updates and DB checkpoints.

### FR7. Observability + Alerting Hooks
- Implement structured telemetry across save/load/list/title flows.
- Emit counters, timings, and failure taxonomies.
- Provide hooks compatible with alerting systems for regression detection.

## 7) User Stories + Acceptance Criteria

### US1: Save Message Reliably (Optimistic + Durable Checkpoint)
As a user, when I send a message, I see it immediately and it is persisted reliably afterward.

Acceptance Criteria:
- Message appears in UI immediately.
- Durable checkpoint writes complete in deterministic order per chat.
- Duplicate/phantom messages do not appear after refresh/reopen.
- On write failure, user sees non-blocking error state and can continue.
- `npm run lint` and `npx tsc --noEmit` pass.

### US2: Open Existing Chat Correctly
As a user, opening any existing chat loads complete content without corruption or hangs.

Acceptance Criteria:
- Chat metadata and message history load consistently from DB.
- No partial-hydration state that traps UI.
- Recovery UI appears if retrieval fails, with retry path.
- `npm run lint` and `npx tsc --noEmit` pass.

### US3: Chat List Never Softlocks
As a user, the chat list remains responsive during load/refresh/error states.

Acceptance Criteria:
- No permanent spinner/dead state during list hydration.
- List interactions remain responsive under transient DB/provider errors.
- Faulty row/data case does not block entire list rendering.
- `npm run lint` and `npx tsc --noEmit` pass.

### US4: Title Failure Does Not Break Flow
As a user, if title generation fails, chat still works and can be renamed manually.

Acceptance Criteria:
- Failed title generation does not block save/open/list.
- Untitled chats render with fallback UX label.
- Manual rename persists correctly.
- `npm run lint` and `npx tsc --noEmit` pass.

### US5: Backward-Compatible Data Continuity
As a user, existing chats remain available after upgrade.

Acceptance Criteria:
- Existing chat/message data loads without migration loss.
- Any new schema additions are additive and backward compatible.
- `npm run lint` and `npx tsc --noEmit` pass.

### US6: Concurrency Hardening Across All Flows
As a user, concurrent operations do not corrupt chat state.

Acceptance Criteria:
- Concurrent append/load/list operations preserve consistent state.
- No known race reproductions from current bug set.
- Defensive handling exists for likely unknown races.
- `npm run lint` and `npx tsc --noEmit` pass.

### US7: Production Telemetry + Alerting Hooks
As an engineer, I can detect and triage persistence regressions quickly.

Acceptance Criteria:
- Structured events for save/load/list/title with correlation IDs.
- Metrics include success/failure counts + latency histograms.
- Alerting hooks exist for critical thresholds.
- `npm run lint` and `npx tsc --noEmit` pass.

## 8) Performance & Reliability Targets (Recommended)

Given `11D`, recommended realistic success SLAs:

- Chat list first usable render (warm): **< 300ms p95**
- Open chat to usable content (warm): **< 500ms p95**
- Chat list first usable render (cold): **< 900ms p95**
- Open chat to usable content (cold): **< 1200ms p95**
- Softlock rate on chat list/open flows: **0 reproducible blocking states in release validation**
- Persistence operation failure rate (non-network local DB path): **< 0.5%**

## 9) Telemetry Specification (Minimum)

Track at least:
- `chat_save_started|succeeded|failed`
- `chat_load_started|succeeded|failed`
- `chat_list_load_started|succeeded|failed`
- `title_generation_started|succeeded|failed`
- `manual_rename_started|succeeded|failed`
- `persistence_queue_depth`
- `db_write_latency_ms`, `db_read_latency_ms`, `chat_open_latency_ms`, `chat_list_latency_ms`
- Error classification fields: operation, error class, retryable, chatId presence, correlationId

Alerting hooks:
- Failure rate spikes
- Latency regressions above SLA
- Repeated softlock-signature events

## 10) Rollout Plan (Big-Bang)

- Implement new orchestration path and remove old runtime path in same release train.
- Pre-release validation on representative datasets (small/large/legacy chats).
- Ship in one production cutover.
- If severe regression occurs, rollback via app release rollback procedure (not runtime flag).

## 11) Risks & Mitigations

- Risk: memory-first drift from DB under edge failures  
  Mitigation: durable checkpoints + deterministic write ordering + reconciliation on open.
- Risk: unknown race conditions persist  
  Mitigation: broad hardening scope, concurrency invariants, stress tests.
- Risk: big-bang release blast radius  
  Mitigation: stronger pre-release test matrix + telemetry-first monitoring on launch day.
- Risk: no crash recovery for in-flight unsaved messages  
  Mitigation: explicitly accepted tradeoff in scope (`9A`); message-loss edge documented.

## 12) Definition of Done

- All user stories implemented and accepted.
- Known issues (title/save/load/softlock) resolved in validation.
- Broad concurrency hardening completed across persistence flows.
- Telemetry and alerting hooks active.
- Quality gates green: `npm run lint` and `npx tsc --noEmit`.
- Performance/reliability targets meet or exceed stated SLAs in release testing.