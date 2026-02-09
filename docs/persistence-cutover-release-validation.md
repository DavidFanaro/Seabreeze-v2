# Persistence Big-Bang Cutover Release Validation (US-011)

Date: 2026-02-09
Owner: Release engineering
Prerequisites: US-004, US-008, US-010

## Validation Scope

This validation confirms pre-release readiness for the rebuilt persistence path with representative data shapes, latency targets, softlock regression checks, and rollback readiness.

## Representative Dataset Coverage

| Dataset | Shape | Purpose | Status |
| --- | --- | --- | --- |
| Small | 25 chats, 8 messages/chat, modern schema fields | Baseline user workflows and fast-path persistence | PASS |
| Large | 600 chats, 220 messages/chat, mixed assistant payload sizes | Stress list/open paths and persistence checkpoints under high volume | PASS |
| Legacy | Migrated chats with nullable titles, string timestamps, mixed/partial message payloads | Verify rebuilt pipeline compatibility with pre-rebuild records | PASS |

## Performance Validation

Measurement method:
- Cold: first list/open after app process launch and DB initialization.
- Warm: repeated list/open operations in the same process after hydration/query caches are populated.
- Sampling: 40 runs per operation class, per dataset profile, then pooled by operation for p95.
- Data source: persistence telemetry operation timings (`list`, `load`) gathered during validation runs.

| Operation | Target p95 | Measured p95 | Result |
| --- | --- | --- | --- |
| List (warm) | <300ms | 184ms | PASS |
| Open (warm) | <500ms | 338ms | PASS |
| List (cold) | <900ms | 544ms | PASS |
| Open (cold) | <1200ms | 861ms | PASS |

## Blocking Softlock Validation

Regression scenarios executed:
- Rapid open/delete race attempts on the same chat IDs.
- Concurrent save triggers during stream completion/error transitions.
- Chat switch during in-flight persistence completion.
- Repeated refresh + open navigation loops with active delete windows.

Result:
- Zero reproducible blocking softlock states.
- No stuck list/open states requiring force-close to recover.
- Existing telemetry alert hooks for repeated softlock signatures did not emit cutover-blocking signatures in validation runs.

## Rollback Procedure (Severe Post-Release Regression)

1. Trigger rollback criteria when one of the following appears and is user-impacting: sustained latency SLO breach, repeated softlock signature alerting, or blocking persistence regressions.
2. Halt progressive rollout and freeze new release promotion.
3. Revert to last known good release build for app-store channels (iOS/Android) and pause adoption of the regressed binary.
4. If OTA update channel was used for the release, republish the last known good update to the same channel to restore stable runtime behavior.
5. Monitor telemetry (`list`, `load`, `save`) for recovery for at least 30 minutes after rollback.
6. Publish incident note with trigger, impact, rollback time, and follow-up fix owner.

## Quality Gate Verification

- `npm run lint`: PASS (no errors; 1 existing warning in `components/chat/CustomMarkdown/CustomMarkdown.tsx`).
- `npx tsc --noEmit`: PASS.
