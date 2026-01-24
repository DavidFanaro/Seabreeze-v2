# Seabreeze - Agent Guidelines

An AI chat application built with React Native and Expo, supporting multiple AI providers (Apple Intelligence, OpenAI, OpenRouter, Ollama).

## Commands

### Development
- `npm run start` - Start Expo dev server (DO NOT start without explicit user request)
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

### Code Quality
- `npm run lint` - Run ESLint with Expo config (flat config in eslint.config.js)
- `npx tsc --noEmit` - TypeScript type checking (strict mode)

### Database (Drizzle ORM)
- `npm run db:generate` - Generate database migrations from schema changes
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio for database inspection

### Testing
- No test framework configured currently

## Code Style

### TypeScript
- Strict mode enabled (`"strict": true` in tsconfig.json)
- Use explicit types for function parameters and return values
- Define interfaces for component props
- Use type imports: `import type { X } from "module"`
- Prefer `interface` for object shapes, `type` for unions/intersections

### Imports
- Use `@/*` path aliases (maps to project root)
- Order: polyfills first, then external packages, then internal modules
- Group imports by category with blank lines between groups

```typescript
// Polyfills first (if needed)
import "@/lib/polyfills";

// External packages
import { useState, useCallback } from "react";
import { View, Text } from "react-native";

// Internal modules
import { useTheme } from "@/components/ui/ThemeProvider";
import type { ProviderId } from "@/types/provider.types";
```

### Components
- Functional components only (no class components)
- Use `React.FC<Props>` or explicit return types
- Props interface named `{ComponentName}Props`
- Export named components (not default) for most files
- Default exports for hooks (e.g., `export default function useChat()`)

```typescript
interface MessageBubbleProps {
    content: string;
    isUser: boolean;
    style?: ViewStyle;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    content,
    isUser,
    style,
}) => {
    // ...
};
```

### Naming Conventions
- `camelCase` - Variables, functions, hook names
- `PascalCase` - Components, interfaces, types, classes
- `SCREAMING_SNAKE_CASE` - Constants
- `use{Name}` - Custom hooks prefix
- Files: `camelCase.ts` for utilities, `PascalCase.tsx` for components

### State Management
- React hooks for local state: `useState`, `useCallback`, `useMemo`, `useRef`
- Zustand for global state (stores in `stores/` directory)
- Persist sensitive data with `expo-secure-store`
- Use `createJSONStorage` for Zustand persistence

### Styling
- Tailwind CSS via `uniwind` for utility classes (className prop)
- React Native `StyleSheet` for complex/dynamic styles
- Theme values from `useTheme()` hook
- Inline styles for one-off dynamic values

```typescript
<View
    className="rounded-lg max-w-[85%]"
    style={{ backgroundColor: theme.colors.surface }}
>
```

### Error Handling
- Try-catch blocks for async operations
- User-friendly error messages (see `lib/error-messages.ts`)
- Silent failures for non-critical operations (e.g., SecureStore)
- Use `executeWithRetry` from `useErrorRecovery` for API calls

### File Headers
Use JSDoc comments for complex files:
```typescript
/**
 * @file useChat.ts
 * @purpose Main chat orchestrator with state management
 * @connects-to useChatStreaming, useTitleGeneration, useChatState
 */
```

## Architecture

### Directory Structure
```
app/                    # Expo Router pages and layouts
  _layout.tsx           # Root layout with providers
  index.tsx             # Home screen
  chat/[id].tsx         # Dynamic chat route
  settings/             # Settings screens
components/             # Reusable UI components
  chat/                 # Chat-specific components
  settings/             # Settings-specific components
  ui/                   # Generic UI components
  index.ts              # Barrel exports
hooks/                  # Custom React hooks
  chat/                 # Chat-related hooks
  useDatabase.ts        # Database access hook
  useChatState.ts       # Chat state management
stores/                 # Zustand stores
  useSettingsStore.ts   # App settings
  useProviderStore.ts   # AI provider config
  useAuthStore.ts       # Authentication state
providers/              # AI provider implementations
  apple-provider.ts     # Apple Intelligence
  openai-provider.ts    # OpenAI API
  openrouter-provider.ts# OpenRouter API
  ollama-provider.ts    # Ollama local
  provider-factory.ts   # Provider instantiation
  provider-cache.ts     # Model caching
  fallback-chain.ts     # Provider fallback logic
db/                     # Database layer
  schema.ts             # Drizzle schema definitions
drizzle/                # Generated migrations
types/                  # TypeScript type definitions
  provider.types.ts     # Provider-related types
  chat.types.ts         # Chat-related types
  store.types.ts        # Store-related types
lib/                    # Utilities and constants
  polyfills.ts          # Required polyfills for AI SDK
  constants.ts          # App constants
  error-messages.ts     # User-facing error messages
assets/                 # Static assets
  fonts/                # Custom fonts
  images/               # Images
```

### Key Patterns

#### Provider System
- Providers implement a common interface via `provider-factory.ts`
- Use `getCachedModel()` for model instances
- Fallback chain for provider failures
- Provider IDs: `"apple" | "openai" | "openrouter" | "ollama"`

#### Database
- Drizzle ORM with SQLite via `expo-sqlite`
- Schema in `db/schema.ts`
- Access via `useDatabase()` hook
- Migrations auto-run on app start

#### Chat Flow
- `useChat` hook orchestrates messaging
- Streaming via `useChatStreaming`
- Title generation via `useTitleGeneration`
- Retry/fallback via `useErrorRecovery`

## Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| expo | ^54.0.30 | Framework |
| react-native | 0.81.4 | Mobile runtime |
| react | 19.1.0 | UI library |
| typescript | ~5.9.2 | Type system |
| expo-router | ~6.0.7 | File-based routing |
| drizzle-orm | ^0.44.5 | Database ORM |
| zustand | ^5.0.9 | State management |
| ai | ^6.0.9 | Vercel AI SDK |
| @react-native-ai/apple | ^0.11.0 | Apple Intelligence |
| @shopify/flash-list | 2.0.2 | Performant lists |
| react-native-reanimated | ~4.1.0 | Animations |
| tailwindcss | ^4.0.0 | Styling |
| uniwind | ^1.0.0 | Tailwind for RN |

## Documentation
When you need to search external docs, use `context7` tools.
When you need to search the internet, use `searxng` tools.
When you need to search github, use `gh_grep` tools.

## External tool
When you need to access to the ios simulator, use `ios-simulator` tools.

## Important when using the apps chat feature
Make sure to use only the apple ai provider and model. Never use the other provider unless told too.
