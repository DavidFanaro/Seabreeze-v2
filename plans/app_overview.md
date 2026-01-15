# Seabreeze Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Chat List  │  │  Chat View   │  │      Settings      │  │
│  │  index.tsx  │  │ chat/[id]     │  │  settings/*.tsx     │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘  │
└─────────┼───────────────────┼──────────────────────┼───────────────┘
          │                   │                      │
          ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         HOOKS LAYER                            │
│  useDatabase  ←→  useChat  ←→  useChatState  ←→  useHaptic     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         STATE LAYER                              │
│         useAuthStore  ←────→  useProviderStore                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PROVIDER LAYER                           │
│  provider-factory → provider-cache → fallback-chain             │
│         ↓                                                       │
│  apple | openai | openrouter | ollama                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                            │
│              Drizzle ORM → SQLite (expo-sqlite)                 │
│              chat table: id, title, messages, provider...       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
seabreeze/
├── app/                          # Expo Router (unchanged)
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── chat/
│   │   └── [id].tsx
│   └── settings/
│       ├── index.tsx
│       └── general.tsx
│
├── components/                   # Reorganized by purpose
│   ├── index.ts                  # Barrel exports
│   ├── chat/                     # Chat-specific components
│   │   ├── ChatListItem.tsx
│   │   ├── ChatContextMenu.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── ThemedMarkdown.tsx
│   │   └── RetryBanner.tsx
│   ├── settings/                 # Settings-specific components
│   │   ├── ModelSelector.tsx
│   │   ├── ModelListManager.tsx
│   │   ├── ModelRow.tsx          # Extracted from ModelListManager
│   │   ├── ProviderSelector.tsx
│   │   └── SettingInput.tsx
│   └── ui/                       # Generic reusable UI
│       ├── GlassButton.tsx
│       ├── GlassInput.tsx
│       ├── IconButton.tsx
│       ├── SaveButton.tsx
│       ├── ProviderIcons.tsx
│       └── ThemeProvider.tsx
│
├── hooks/                        # Split and organized
│   ├── index.ts                  # Barrel exports
│   ├── useDatabase.ts
│   ├── useHapticFeedback.ts
│   ├── useChatState.ts
│   ├── useErrorRecovery.ts
│   └── chat/                     # Chat-specific hooks (split from useChat)
│       ├── useChat.ts            # Main orchestrator
│       ├── useChatStreaming.ts   # Streaming logic
│       └── useTitleGeneration.ts # Auto-title logic
│
├── stores/                       # Split into separate files
│   ├── index.ts                  # Barrel exports
│   ├── useAuthStore.ts           # Auth credentials only
│   ├── useProviderStore.ts       # Provider/model selection
│   └── useSettingsStore.ts      # App-wide settings
│
├── providers/                    # RENAMED from lib/providers
│   ├── index.ts                  # Barrel exports
│   ├── provider-factory.ts
│   ├── provider-cache.ts
│   ├── fallback-chain.ts
│   ├── apple-provider.ts
│   ├── openai-provider.ts
│   ├── openrouter-provider.ts
│   └── ollama-provider.ts
│
├── types/                        # Centralized types
│   ├── index.ts                  # Barrel exports
│   ├── provider.types.ts         # Provider-related types
│   ├── chat.types.ts             # Chat-related types
│   └── store.types.ts            # Store-related types
│
├── lib/                          # Core utilities only
│   ├── polyfills.ts              # Streaming polyfills
│   ├── error-messages.ts         # Error formatting
│   └── constants.ts              # Magic numbers, config values
│
├── db/                           # Database (unchanged)
│   └── schema.ts
│
├── drizzle/                      # Migrations (unchanged)
│
├── assets/                       # Static assets (unchanged)
│
└── plans/                        # Planning docs
    └── app_overview.md           # This file
```

## Component Connections

### Chat Flow
```
app/index.tsx (Chat List)
  ↓
app/chat/[id].tsx (Chat View)
  ↓
  ├→ MessageList (display messages)
  ├→ MessageBubble (individual messages)
  ├→ MessageInput (compose messages)
  └→ RetryBanner (retry failed responses)
```

### Settings Flow
```
app/settings/index.tsx (Settings Hub)
  ↓
  ├→ ProviderSelector (select AI provider)
  ├→ ModelSelector/ModelListManager (select AI model)
  └→ app/settings/general.tsx (app-wide settings)
```

### Data Flow

#### Chat Message Flow
```
User Input
  ↓
MessageInput component
  ↓
useChat hook (main orchestrator)
  ↓
useChatStreaming hook (streaming logic)
  ↓
provider-factory (selects provider)
  ↓
provider-{type} (specific provider implementation)
  ↓
AI API response (streamed)
  ↓
MessageList update (display)
```

#### Settings State Flow
```
Settings UI component
  ↓
useSettingsStore (Zustand store)
  ↓
SecureStore (persistent storage)
  ↓
useProviderStore / useAuthStore (access settings)
  ↓
Provider configuration (applied to chat)
```

## Key Integrations

### useChat Hook Integration
- **useChat**: Main orchestrator, manages overall chat state
  - Uses `useChatStreaming` for streaming responses
  - Uses `useTitleGeneration` for auto-titles
  - Connects to `useChatState` for database sync
  - Connects to `useProviderStore` for provider/model selection

### Store Integration
- **useAuthStore**: Stores API credentials (OpenAI, OpenRouter, Ollama)
  - Uses SecureStore for persistence
  - Exported via `@/stores`
- **useProviderStore**: Manages provider/model selection and custom models
  - Uses SecureStore for persistence
  - Exported via `@/stores`
- **useSettingsStore**: App-wide settings (theme, haptics, etc.)
  - Uses SecureStore for persistence
  - Exported via `@/stores`

### Provider System Integration
- **provider-factory**: Central factory for creating provider instances
  - Uses `provider-cache` to cache provider models
  - Uses `fallback-chain` for error recovery
- **provider-{type}**: Individual provider implementations
  - Each exports `test*Connection()` for verification
  - All follow same interface pattern

### Database Integration
- **useDatabase**: Provides Drizzle database instance
  - Used by `useChatState` for chat persistence
  - Migrations managed via `db/migrations/`
  - Schema defined in `db/schema.ts`

## New Features Added

### 1. Retry UI
- **Location**: `components/chat/RetryBanner.tsx`
- **Integration**: Displayed in `app/chat/[id].tsx` below failed messages
- **Dependencies**: Uses `canRetry` and `retryLastMessage` from `useChat`

### 2. General Settings
- **Location**: `app/settings/general.tsx` and `stores/useSettingsStore.ts`
- **Features**:
  - Theme selection (Light/Dark/System)
  - Haptic feedback toggle
  - Auto-generate titles toggle
  - Message font size slider
  - Clear all chats action

### 3. Real Provider Connection Tests
- **Updated Providers**:
  - `openai-provider.ts`: Lists models via OpenAI API
  - `openrouter-provider.ts`: Fetches models via OpenRouter API
  - `ollama-provider.ts`: Checks /tags endpoint
  - `apple-provider.ts`: Validates Apple Intelligence availability

## Bug Fixes Applied

### 1. Missing Return Statement
- **File**: `app/_layout.tsx:27-31`
- **Fix**: Added `return` statement to error handling block
- **Impact**: App now properly displays migration errors

### 2. Removed Unused Code
- **Deleted Files**:
  - `util/kvtags.tsx` (unused enums)
  - `util/testdata.ts` (test data never imported)
  - `util/types.ts` (unused types)
  - `lib/types/` (moved to `types/`)
  - `stores/useAIStore.ts` (split into useAuthStore and useProviderStore)
- **Cleaned**: All `console.log` statements removed

### 3. Code Cleanup
- **File**: `lib/constants.ts`
- **Purpose**: Centralized app constants (LAYOUT, CACHE values)
- **Magic Numbers**: Extracted from codebase to constants

## File Organization Principles

### Type-Based Structure
- **components/chat/****: All chat-related UI components
- **components/settings/****: All settings-related UI components
- **components/ui/**: Reusable generic UI components
- **hooks/chat/**: Chat-specific hook implementations
- **providers/****: All provider implementations
- **types/**: All TypeScript type definitions
- **stores/**: All Zustand stores

### Barrel Exports
Each new folder has an `index.ts` barrel export for clean imports:
```typescript
// Example: components/ui/index.ts
export * from './GlassButton';
export * from './GlassInput';
export * from './IconButton';
// ...
```

## Testing & Verification

### ESLint Status
- **Errors**: 0 (all resolved)
- **Warnings**: 5 (non-breaking, related to React hooks deps)

### Type Safety
- All components have TypeScript interfaces
- Type exports via `@/types`
- No `any` types in new code

## Migration Guide

### Import Path Changes

**Old Paths** → **New Paths**:
```typescript
// Components
import { Component } from '@/components/Component'
↓
import { Component } from '@/components/{subfolder}/Component'

// Providers
import { provider } from '@/lib/providers/provider'
↓
import { provider } from '@/providers/provider'

// Stores
import { useAIAuthStore, useAIProviderStore } from '@/stores/useAIStore'
↓
import { useAuthStore } from '@/stores'
import { useProviderStore } from '@/stores'
```

### Store Changes

**Old Store** → **New Stores**:
```typescript
// Old: Single file with both stores
import { useAIAuthStore, useAIProviderStore } from '@/stores/useAIStore';

// New: Separate stores
import { useAuthStore } from '@/stores';
import { useProviderStore } from '@/stores';
```

## Technology Stack

### Core Framework
- React Native 0.81.4
- Expo Router ~6.0.7
- React 19.1.0
- TypeScript 5.9.2 (strict mode)

### State Management
- Zustand ^5.0.9
- Secure storage via expo-secure-store

### Data Layer
- Drizzle ORM ^0.44.5
- SQLite via expo-sqlite ~16.0.10

### AI Integration
- Vercel AI SDK ^5.0.0-beta.34
- Apple Intelligence (@react-native-ai/apple ^0.5.0)
- OpenRouter (@openrouter/ai-sdk-provider ^1.2.0)
- Ollama (ollama-ai-provider-v2 ^1.3.1)

### UI Libraries
- expo-symbols
- expo-haptics
- expo-glass-effect
- react-native-reanimated ~4.1.0

---

**Last Updated**: January 15, 2026
**Version**: 1.0.0
**Status**: Restructuring Complete - 0 ESLint Errors
