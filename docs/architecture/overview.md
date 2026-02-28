# Architecture Overview

## Purpose

This document describes the high-level system architecture of Seabreeze, an Expo + React Native AI chat application supporting multiple AI providers (Apple Intelligence, OpenAI, OpenRouter, and Ollama).

## Concepts

### Core Architecture

Seabreeze follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      Expo Router (app/)                      │
│  - File-based routing                                        │
│  - Stack navigation                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (components/)                    │
│  - HeroUI components                                         │
│  - Custom chat UI components                                 │
│  - Settings UI components                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  State Layer (stores/ + hooks/)               │
│  - Zustand stores for global state                           │
│  - React hooks for UI logic                                  │
│  - React Query for server state                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Provider Layer (providers/)                   │
│  - AI SDK integration                                       │
│  - Provider abstraction                                      │
│  - Fallback chain                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Persistence Layer (db/ + drizzle/)             │
│  - Drizzle ORM with SQLite                                  │
│  - expo-sqlite driver                                       │
│  - Message persistence hooks                                 │
└─────────────────────────────────────────────────────────────┘
```

### Supported AI Providers

| Provider | Description | API Key Required | URL Required |
|----------|-------------|-----------------|--------------|
| Apple | On-device AI (Apple Silicon) | No | No |
| OpenAI | GPT-4 and models | Yes | No |
| OpenRouter | Multi-provider aggregator | Yes | No |
| Ollama | Local models | No | Yes |

### Key Patterns

- **Provider Abstraction**: Unified interface for all AI providers via AI SDK
- **Fallback Chain**: Automatic failover between providers on failure
- **Message Persistence**: SQLite-based chat storage with optimistic updates
- **Error Recovery**: Automatic retry with exponential backoff

## File Map

### Entry Points

- `app/_layout.tsx` - Root layout with all providers
- `app/index.tsx` - Home screen (chat list)
- `app/chat/[id].tsx` - Individual chat screen

### Core Modules

| Module | Location | Responsibility |
|--------|----------|----------------|
| Providers | `providers/` | AI SDK integration, fallback chains |
| Stores | `stores/` | Global state (auth, settings, providers) |
| Hooks | `hooks/` | Chat logic, persistence, error recovery |
| DB | `db/` | Schema definitions |
| Drizzle | `drizzle/` | Migrations |
| Types | `types/` | TypeScript definitions |

## Flow

### Chat Message Flow

```
User Input → useChatState → Provider Factory → AI SDK → Stream Response
                │                                           │
                ▼                                           ▼
           Message Store                              Display Update
                │                                           │
                ▼                                           ▼
           SQLite DB ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← Persistence
```

### Settings Flow

```
Settings Screen → useSettingsStore → Secure Storage (Keychain)
                                      │
                                      ▼
                              Provider Initialization
```

## Examples

### Adding a New Provider

1. Add provider types in `types/provider.types.ts`
2. Create provider implementation in `providers/`
3. Register in `providers/index.ts`
4. Add settings UI in `app/settings/`

### Modifying Chat Persistence

- Core logic: `hooks/chat/useMessagePersistence.ts`
- Coordinator: `lib/chat-persistence-coordinator.ts`
- Schema: `db/schema.ts`

## Gotchas

- **AI SDK Streaming**: Must import polyfills first in `_layout.tsx`
- **Expo SQLite**: Use `expo-sqlite` with `drizzle-orm/expo-sqlite`
- **Provider Fallback**: Fallback chain requires all providers to share compatible message formats
- **Secure Storage**: Use `lib/safe-secure-store.ts` for API keys (not AsyncStorage)
- **HeroUI**: Requires `HeroUINativeProvider` wrapper

## Change Guide

### Safe Change Areas

| Area | Risk Level | Notes |
|------|------------|-------|
| UI Components | Low | Isolated, well-tested |
| Settings UI | Low | Independent screens |
| Store logic | Medium | State changes may affect UI |
| Provider config | Medium | Affects API calls |

### High-Risk Areas

| Area | Risk Level | Notes |
|------|------------|-------|
| Database schema | High | Requires migration |
| Provider interface | High | Affects all chats |
| Persistence coordinator | High | Data integrity |

### Making Changes

1. **UI Changes**: Modify components in `components/`
2. **State Changes**: Update stores in `stores/`
3. **Provider Changes**: Modify providers in `providers/`
4. **Schema Changes**: Update `db/schema.ts` and run `npm run db:generate`
