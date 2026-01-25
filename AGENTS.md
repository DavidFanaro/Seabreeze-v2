# Seabreeze Agent Guide

Expo + React Native AI chat application supporting Apple Intelligence, OpenAI,
OpenRouter, and Ollama providers.

## Repo Rules
- No Cursor or Copilot rule files were found.
- Do not start `expo start` without explicit user request.
- When using the in-app chat feature, use the Apple provider/model only unless
  explicitly instructed otherwise.

## Commands

### Development
- `npm run start` - Expo dev server (ask before running).
- `npm run ios` - Build + run on iOS simulator/device.
- `npm run android` - Build + run on Android emulator/device.
- `npm run web` - Run web build in browser.

### Linting / Typecheck
- `npm run lint` - ESLint (Expo config, flat `eslint.config.js`).
- `npx tsc --noEmit` - TypeScript typecheck (strict mode).

### Tests (Jest)
- `npm test` - Jest in watch-all mode.
- `npx jest path/to/test.tsx` - Run a single test file.
- `npx jest -t "test name"` - Run tests matching a name pattern.
- `npm test -- path/to/test.tsx -t "name"` - Single file + name match.

### Database (Drizzle)
- `npm run db:generate` - Generate migrations from `db/schema.ts`.
- `npm run db:push` - Push schema changes to SQLite.
- `npm run db:studio` - Drizzle Studio UI.

## Code Style

### TypeScript
- `strict: true` in `tsconfig.json`.
- Prefer explicit param/return types for public functions and hooks.
- Use `interface` for object shapes, `type` for unions/intersections.
- Use type-only imports: `import type { Foo } from "@/types"`.

### Imports
- Polyfills first, then external packages, then internal modules.
- Use `@/*` alias for internal paths (project root).
- Blank line between import groups.

```ts
import "@/lib/polyfills";

import { useMemo } from "react";
import { View } from "react-native";

import { useTheme } from "@/components";
import type { ProviderId } from "@/types/provider.types";
```

### Formatting
- 2-space indentation (see `app/_layout.tsx`).
- Trailing commas in multi-line objects/arrays.
- Prefer multiline JSX props when 2+ props or nesting.

### Components
- Functional components only.
- Props interface: `{ComponentName}Props`.
- Named exports for components; default exports for hooks.
- Keep component files focused (UI + logic in hooks).

### Naming
- `camelCase` variables, functions, hooks (`useSomething`).
- `PascalCase` components, interfaces, types.
- `SCREAMING_SNAKE_CASE` constants.
- Files: `PascalCase.tsx` components, `camelCase.ts` utilities.

### State & Data
- Local state via React hooks.
- Global state via Zustand in `stores/`.
- Persist sensitive data with `expo-secure-store`.
- Prefer `createJSONStorage` for persisted stores.
- React Query for async cache/data in screens.

### Styling
- Tailwind via `uniwind` (`className` on RN components).
- `StyleSheet` for complex/dynamic styles.
- Theme values from `useTheme()` or HeroUI theme provider.

### Error Handling
- Wrap async calls with try/catch.
- Use `executeWithRetry` in `useErrorRecovery` for API calls.
- Prefer user-friendly strings from `lib/error-messages.ts`.
- Allow silent failures for non-critical storage operations.

### Files & Docs
- Add JSDoc file headers for complex modules.
- Keep file responsibilities narrow; extract helpers when logic grows.

```ts
/**
 * @file useChat.ts
 * @purpose Main chat orchestrator with state management.
 */
```

## Architecture Notes

### High-level Layout
- `app/` - Expo Router pages/layouts.
- `components/` - Reusable UI, including `components/ui/`.
- `hooks/` - Custom hooks (chat, data, utilities).
- `stores/` - Zustand stores.
- `providers/` - AI provider implementations + fallback chain.
- `db/` + `drizzle/` - Schema + migrations.
- `lib/` - Utilities, constants, polyfills, error messages.

### Provider System
- Providers implement shared interface via `providers/provider-factory.ts`.
- Use `provider-cache.ts` for model caching.
- Fallback logic lives in `providers/fallback-chain.ts`.
- Provider IDs: `"apple" | "openai" | "openrouter" | "ollama"`.

### Database
- Drizzle ORM + SQLite (`expo-sqlite`).
- Schema in `db/schema.ts`, migrations in `drizzle/`.
- DB access through `hooks/useDatabase.ts`.

### Chat Flow
- `useChat` orchestrates messaging.
- Streaming via `useChatStreaming`.
- Title generation via `useTitleGeneration`.
- Retry/fallback via `useErrorRecovery`.

## Tooling Tips
- Docs lookup: use Context7 tools when needed.
- Web info: use SearXNG tools.
- GitHub search: use `gh_grep` tools.
- iOS simulator: use `ios-simulator` tools.
