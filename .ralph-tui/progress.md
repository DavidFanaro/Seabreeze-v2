# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

### Documentation Structure
- Two-layer approach: Topic index docs (root `docs/README.md`) + deep-dive docs (subfolder `*/README.md`)
- Navigation table in index doc helps users locate relevant documentation quickly
- Each subfolder contains its own index README with "Contents" and "Related" sections

### Hook Patterns
- **Composition over inheritance**: useChat orchestrates child hooks for separation of concerns
- **Refs for async state**: Use refs (messagesRef) to access latest state in async callbacks without stale closures
- **Sequence guards**: createSequenceGuard prevents concurrent operations from corrupting state
- **Idempotency keys**: createIdempotencyKey prevents duplicate saves/operations
- **AbortSignal**: Propagate cancellations through standard AbortSignal across async boundaries

### Stream Lifecycle
- State machine: idle → streaming → completing → completed/error/cancelled
- Timeout protection: inactivity timeout (30s), max duration (5 min), completion grace (8s)
- Checkpoint saves: 15s initial + 10s intervals during long streams

### Provider Fallback
- Chain: Apple → OpenAI → OpenRouter → Ollama
- Automatic reset after each message to clear fallback state

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

## 2026-02-28 - US-006
- Created `docs/providers/provider-architecture.md` covering provider internals and extension boundaries
- Created `docs/providers/adding-a-provider.md` with step-by-step interface contracts for local and remote providers
- Created `docs/providers/provider-validation-and-troubleshooting.md` with validation checklist, smoke-test path, fallback behavior, and common failure modes
- Updated `docs/providers/README.md` and `docs/README.md` to cross-link the new documentation
- npm run lint passes (only pre-existing warnings)
- npx tsc --noEmit passes
- Provider tests: 7/7 pass (1 pre-existing failure in unrelated useProviderStore persistence test)
- **Learnings:**
  - Provider architecture: Factory pattern with 4 providers (Apple, OpenAI, OpenRouter, Ollama)
  - Extension boundaries: Types → Provider Implementation → Auth Store → Factory
  - Model caching with LRU eviction and TTL for performance optimization
  - URL normalization required for local providers (Ollama)
  - Expo fetch required instead of global fetch for React Native compatibility
  - Error categorization (auth/network/model/unknown) for appropriate UI handling
  - Provider fallback chain resets after each message
  - Credential storage uses SecureStore for iOS Keychain / Android EncryptedSharedPreferences

---

## 2026-02-28 - US-005
- Created `docs/hooks/hooks-catalog.md` documenting all 9 custom hooks with purpose, inputs/outputs, side effects, and pitfalls
- Created `docs/hooks/hook-patterns-and-gotchas.md` with 6 recommended patterns and 5 anti-patterns
- Updated `docs/hooks/README.md` to link to the new documentation
- Verified inline comments already exist in hook modules (all hooks have extensive JSDoc headers)
- npm run lint passes (only pre-existing warnings)
- npx tsc --noEmit passes
- Tests: 6/9 pass (3 pre-existing failures in useDatabase test for db name mismatch)
- **Learnings:**
  - Hook architecture: useChat as orchestrator, delegates to child hooks (useChatState, useChatStreaming, useStreamLifecycle, useTitleGeneration)
  - Key patterns: refs for async state access, sequence guards for concurrent ops, idempotency keys for deduplication, AbortSignal for cancellation
  - Stream lifecycle state machine: idle→streaming→completing→completed/error/cancelled with timeout protection
  - Checkpoint saves every 15s + 10s intervals during long streams
  - Provider fallback chain: Apple → OpenAI → OpenRouter → Ollama
---

## 2026-02-28 - US-007
- Created `docs/contributing/dev-setup-and-workflow.md` with complete setup instructions (clone, install, env config, database setup, iOS pods), day-to-day workflow (branch creation → make changes → quality checks → commit → PR), project structure overview, key conventions (provider hierarchy, stream lifecycle, fallback chain), and common tasks (adding screens, hooks, database changes)
- Created `docs/contributing/lint-typecheck-test-guide.md` with quality check commands, targeted test execution strategies by area (providers/hooks/components/db/stores), review expectations checklist, phase labels and reviewer responsibilities, and coverage matrix process for tracking reviewed files, updated docs, and comments
- Updated `docs/contributing/README.md` to link to the new guides
- Updated `docs/README.md` navigation table to include new contributing docs
- npm run lint passes (12 pre-existing warnings, 0 errors)
- npx tsc --noEmit passes
- **Learnings:**
  - Commands: npm run lint, npx tsc --noEmit, npm test, npx jest path/to/test.tsx, npx jest -t "pattern"
  - Test areas: providers, hooks, components, db, stores, integration
  - Pre-existing test warnings: require() imports in test files, unused imports in test files
  - Documentation coverage matrix tracks files reviewed, docs updated, and comments added
  - Reviewer responsibilities: code correctness, type safety, test coverage for code; accuracy, cross-links, terminology for docs; "why" not "what" for comments

---

## 2026-02-28 - US-008
- Created `docs/db/README.md` and `docs/db/database-architecture.md` with schema design, migration strategy, persistence patterns, file map, flow diagrams, examples, gotchas, and change guide
- Created `docs/lib/README.md` and `docs/lib/utilities-deep-dive.md` covering concurrency primitives, persistence coordination, security utilities, all file mappings, extension points, gotchas, and change guide
- Updated `docs/README.md` navigation table and quick links to include new Database and Utilities sections
- Added inline comments to lib/chat-title.ts, lib/constants.ts, and lib/safe-secure-store.ts to improve documentation coverage
- npm run lint passes (12 pre-existing warnings, 0 errors)
- npx tsc --noEmit passes
- **Learnings:**
  - Database uses Drizzle ORM with SQLite via expo-sqlite for local chat persistence
  - Single `chat` table with JSON columns for messages, thinking output, and provider metadata
  - Queue coordination via chat-persistence-coordinator ensures ordered saves/deletes
  - Softlock watchdog detects stuck operations (>8s timeout)
  - lib/ folder contains cross-cutting utilities: concurrency primitives, attachment handling, content parsing, secure storage, device capabilities
  - Constants grouped by domain (LAYOUT, CACHE) with `as const` for type safety
  - Fallback storage (in-memory Map) when SecureStore unavailable

