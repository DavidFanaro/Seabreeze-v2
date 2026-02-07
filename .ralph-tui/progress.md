# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- Concurrency audits should use a stable schema per entry: `Race Class`, `Vulnerable Flow`, `Modules/Files`, `Severity`, `Reproducibility`, and `Owner Subsystem`, plus class-level fixed evidence gates to make remediation traceable.

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
