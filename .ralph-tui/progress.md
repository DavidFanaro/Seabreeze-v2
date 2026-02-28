# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

### Documentation Structure
- Two-layer approach: Topic index docs (root `docs/README.md`) + deep-dive docs (subfolder `*/README.md`)
- Navigation table in index doc helps users locate relevant documentation quickly
- Each subfolder contains its own index README with "Contents" and "Related" sections

---

## 2026-02-28 - US-001
- Created `docs/README.md` as canonical docs entrypoint with navigation table
- Created folder structure: docs/architecture, docs/ui, docs/state, docs/hooks, docs/providers, docs/contributing
- Created index README.md files in each folder for topic navigation
- **Learnings:**
  - Two-layer docs structure: topic index docs (root) + deep-dive docs (subfolders)
  - Navigation table in README helps users find relevant docs quickly
---

## 2026-02-28 - US-002
- Created `docs/architecture/overview.md` with system boundaries, core modules, and interaction model
- Created `docs/architecture/codebase-map.md` with major folders, key files, and ownership boundaries
- Both docs follow the required format: Purpose, Concepts, File Map, Flow, Examples, Gotchas, Change Guide
- Updated `docs/architecture/README.md` and `docs/README.md` to cross-link the new architecture docs
- **Learnings:**
  - Directory structure: app/ (routing), components/ (UI), hooks/ (logic), stores/ (state), providers/ (AI), lib/ (utilities), db/ (persistence), types/ (definitions)
  - Ownership boundaries: Core team owns providers, stores, hooks, db, lib, types; UI team owns components and app pages
  - Key gotchas: Polyfills must be imported first, database schema changes require migrations, secure storage for API keys
  - Safe change areas: UI components (low risk), store logic (medium risk), database schema (high risk)

---

## 2026-02-28 - US-003
- Created `docs/ui/layout-and-navigation.md` covering screen structure, route/navigation behavior, and layout boundaries
- Created `docs/ui/feature-flows.md` covering core user journeys and UI state transitions
- Updated `docs/ui/README.md` to cross-link the new docs
- Verified inline comments already exist in UI components (ChatListItem, MessageList, MessageInput, ProviderSelector)
- **Learnings:**
  - Screen structure uses Expo Router with Stack Navigator
  - Provider hierarchy pattern: GestureHandler → HeroUI → Theme → SQLite → Navigation → Query
  - Database Gate pattern ensures migrations run before any screen renders
  - Key UI states: streamState (idle→completing→streaming→completed/error), saveStatus (idle→saving→saved/error)
  - Auto-title generation triggers after first assistant message completes with max 3 attempts

---

## 2026-02-28 - US-004
- Created `docs/state/state-model.md` covering state boundaries, ownership, and transition rules
- Created `docs/state/state-lifecycle-and-data-flow.md` covering runtime lifecycle and data/control flow
- Updated `docs/state/README.md` and `docs/README.md` to cross-link the new state docs
- Verified inline comments already exist in state modules (stores have extensive JSDoc comments)
- Lint passes with only pre-existing warnings, TypeScript passes
- Tests: 57/62 pass (failures are pre-existing mocking issues unrelated to documentation)
- **Learnings:**
  - State domains: Auth (API keys), Provider (models), Settings (preferences)
  - Zustand stores with SecureStore persistence, hydration via writeVersion conflict resolution
  - Store dependencies: chatOverride depends on provider; auth/provider/settings are independent
  - Version conflict: runtime mutations always win over stale persisted data (writeVersion comparison)
  - Provider selection auto-fallbacks to first visible model when current is unavailable
  - Ollama-specific: custom models overlapping fetched models are automatically removed

