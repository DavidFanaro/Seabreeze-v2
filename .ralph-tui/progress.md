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
