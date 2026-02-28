# Codebase Map

## Purpose

This document provides a map of the Seabreeze codebase, identifying key files, ownership boundaries, and areas where safe changes can be made.

## Concepts

### Directory Structure

```
Seabreeze-v2/
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout with providers
│   ├── index.tsx          # Home/chat list screen
│   ├── chat/
│   │   └── [id].tsx       # Individual chat screen
│   └── settings/          # Settings screens
├── components/            # UI components
│   ├── ui/                # HeroUI theme components
│   ├── chat/              # Chat-specific components
│   └── settings/          # Settings components
├── hooks/                 # React hooks
│   ├── chat/              # Chat-related hooks
│   └── useDatabase.ts     # Database hook
├── lib/                   # Core utilities
│   └── *.ts               # Chat logic, persistence, error handling
├── providers/             # AI provider implementations
│   ├── provider-factory.ts
│   ├── fallback-chain.ts
│   └── apple-provider.ts, etc.
├── stores/                # Zustand stores
│   ├── useAuthStore.ts
│   ├── useSettingsStore.ts
│   └── useProviderStore.ts
├── db/                    # Database schema
│   └── schema.ts
├── drizzle/               # Migrations
├── types/                 # TypeScript types
│   ├── provider.types.ts
│   └── chat.types.ts
└── docs/                  # Documentation
```

## File Map

### Root Level Configuration

| File | Purpose |
|------|---------|
| `app.json` | Expo configuration |
| `package.json` | Dependencies |
| `tsconfig.json` | TypeScript config |
| `drizzle.config.ts` | Drizzle configuration |
| `eslint.config.js` | Linting rules |
| `metro.config.js` | Metro bundler config |

### App Layer (Routing)

| File | Purpose | Ownership |
|------|---------|------------|
| `app/_layout.tsx` | Root layout with all providers | Core team |
| `app/index.tsx` | Home screen (chat list) | UI team |
| `app/chat/[id].tsx` | Chat screen (32KB, main UI) | UI team |
| `app/settings/index.tsx` | Settings hub | UI team |
| `app/settings/appearance.tsx` | Theme settings | UI team |
| `app/settings/apple.tsx` | Apple provider config | UI team |
| `app/settings/openai.tsx` | OpenAI provider config | UI team |
| `app/settings/openrouter.tsx` | OpenRouter config | UI team |
| `app/settings/ollama.tsx` | Ollama config | UI team |

### Components Layer

| File | Purpose | Ownership |
|------|---------|------------|
| `components/index.ts` | Theme exports | UI team |
| `components/ui/HeroUIThemeProvider.tsx` | Theme integration | UI team |
| `components/chat/*.tsx` | Chat UI components | UI team |
| `components/settings/*.tsx` | Settings UI components | UI team |

### Hooks Layer

| File | Purpose | Ownership |
|------|---------|------------|
| `hooks/useChatState.ts` | Chat state management | Core team |
| `hooks/useDatabase.ts` | Database initialization | Core team |
| `hooks/useErrorRecovery.ts` | Error handling | Core team |
| `hooks/useMessagePersistence.ts` | Message persistence | Core team |
| `hooks/chat/` | Chat-specific hooks | Core team |

### Stores Layer

| File | Purpose | Ownership |
|------|---------|------------|
| `stores/useAuthStore.ts` | Auth state | Core team |
| `stores/useSettingsStore.ts` | Settings state | Core team |
| `stores/useProviderStore.ts` | Provider selection | Core team |
| `stores/hydration-registry.ts` | State hydration | Core team |

### Providers Layer

| File | Purpose | Ownership |
|------|---------|------------|
| `providers/provider-factory.ts` | Factory for creating providers | Core team |
| `providers/fallback-chain.ts` | Provider fallback logic | Core team |
| `providers/apple-provider.ts` | Apple Intelligence | Core team |
| `providers/openai-provider.ts` | OpenAI integration | Core team |
| `providers/openrouter-provider.ts` | OpenRouter integration | Core team |
| `providers/ollama-provider.ts` | Ollama integration | Core team |
| `providers/provider-cache.ts` | Provider caching | Core team |

### Library Layer

| File | Purpose | Ownership |
|------|---------|------------|
| `lib/polyfills.ts` | Required polyfills | Core team |
| `lib/concurrency.ts` | Concurrency primitives | Core team |
| `lib/chat-persistence-coordinator.ts` | Persistence logic | Core team |
| `lib/chat-message-normalization.ts` | Message processing | Core team |
| `lib/error-messages.ts` | Error definitions | Core team |
| `lib/safe-secure-store.ts` | Secure storage wrapper | Core team |

### Database Layer

| File | Purpose | Ownership |
|------|---------|------------|
| `db/schema.ts` | Drizzle schema | Core team |
| `drizzle/migrations/` | DB migrations | Core team |

### Types Layer

| File | Purpose | Ownership |
|------|---------|------------|
| `types/provider.types.ts` | Provider types | Core team |
| `types/chat.types.ts` | Chat types | Core team |
| `types/concurrency.types.ts` | Concurrency types | Core team |

## Flow

### App Initialization Flow

```
app/_layout.tsx
  ├── GestureHandlerRootView
  ├── HeroUINativeProvider
  ├── ThemeProvider
  ├── SQLiteProvider (with migrations)
  └── Stack Navigator
      ├── index (Home)
      └── settings/*
```

### Provider Selection Flow

```
User selects provider → useProviderStore → ProviderFactory → AI SDK → Chat
                              │
                              ▼
                        Secure Storage (API keys)
```

## Examples

### Safe Changes by Area

**UI Components** (Low Risk)
- Edit `components/chat/` files
- Modify `components/settings/` files
- Update styling in existing components

**Settings** (Low Risk)
- Add new settings fields
- Modify settings UI
- Add validation to settings inputs

**State Management** (Medium Risk)
- Modify store logic in `stores/`
- Add new store fields
- Update hydration logic

### Example: Adding a New Setting

1. Add type in `types/` (if needed)
2. Add to `stores/useSettingsStore.ts`
3. Add UI in `app/settings/`
4. Add secure storage in `lib/safe-secure-store.ts` (if needed)

## Gotchas

- **Root Layout**: All providers must be in `_layout.tsx` - do not move them
- **Polyfills**: Must import `lib/polyfills.ts` first in any file that uses AI SDK streaming
- **Database**: Schema changes require migration generation (`npm run db:generate`)
- **Secure Storage**: Never use AsyncStorage for API keys - use `safe-secure-store.ts`
- **Provider Factory**: All new providers must be registered in `provider-factory.ts`

## Change Guide

### Ownership Boundaries

| Team | Responsible For |
|------|-----------------|
| Core Team | Providers, Stores, Hooks, DB, Lib, Types |
| UI Team | Components, App pages, Settings screens |

### Making Safe Changes

**Low Risk Changes**
- UI styling and layout
- Component props and variants
- Settings UI
- Documentation

**Medium Risk Changes**
- Store state structure
- Hook logic
- New settings fields

**High Risk Changes**
- Database schema
- Provider interface changes
- Root layout structure
- Persistence layer changes
