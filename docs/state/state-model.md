# State Model

This document defines the state boundaries, ownership, and transition rules for Seabreeze's state management system.

## Purpose

The state model establishes clear boundaries between different state domains, defines ownership responsibilities, and specifies how state transitions occur across the application.

## Concepts

### State Domains

Seabreeze divides state into three primary domains, each managed by a dedicated Zustand store:

| Domain | Store | Storage | Purpose |
|--------|-------|---------|---------|
| Authentication | `useAuthStore` | SecureStore | API credentials for AI providers |
| Provider/Model | `useProviderStore` | SecureStore | Selected provider, models, custom/hidden models |
| Settings | `useSettingsStore` | SecureStore | App preferences (theme, haptics, font size) |

### Ownership Model

Each store has a defined owner with specific responsibilities:

- **Auth Store Owner**: Core team - Handles credential storage and retrieval
- **Provider Store Owner**: Core team - Manages AI provider selection and model lists
- **Settings Store Owner**: Core team - Controls app preferences and defaults

### State Properties

All persisted stores include a `__meta` property with:

```typescript
interface HydrationMetaState {
  writeVersion: number;  // Incremented on each state mutation
  hasHydrated: boolean;  // True after initial hydration from storage
}
```

**Invariant**: The `writeVersion` ensures runtime mutations take precedence over stale persisted data during hydration.

## File Map

```
stores/
├── index.ts                    # Public exports
├── hydration-registry.ts       # Cross-store hydration coordination
├── useAuthStore.ts             # Authentication credentials
├── useProviderStore.ts         # Provider and model selection
└── useSettingsStore.ts         # Application settings

stores/__tests__/
├── useProviderStore.test.ts    # Provider store tests
├── useSettingsStore.test.ts    # Settings store tests
└── hydrationGuards.test.ts     # Hydration behavior tests
```

### Key Files

| File | Responsibility |
|------|----------------|
| `hydration-registry.ts` | Manages hydration order, version conflicts, store dependencies |
| `useAuthStore.ts` | Stores API keys for OpenAI, OpenRouter, Ollama |
| `useProviderStore.ts` | Manages provider selection, model lists, custom models |
| `useSettingsStore.ts` | Persists user preferences (theme, haptics, thinking) |

## State Transitions

### Auth Store Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                    Auth Store States                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐    setOpenAIApiKey     ┌─────────────────┐  │
│   │  null    │ ──────────────────────▶│  openaiApiKey   │  │
│   └──────────┘                        │  (string)       │  │
│                                         └─────────────────┘  │
│   ┌──────────┐    setOpenRouterApiKey ┌─────────────────┐  │
│   │  null    │ ──────────────────────▶│ openrouterApiKey│  │
│   └──────────┘                        │  (string)       │  │
│                                         └─────────────────┘  │
│   ┌──────────┐    setOllamaUrl        ┌────────────────┐   │
│   │  null    │ ──────────────────────▶│  ollamaUrl    │   │
│   └──────────┘                         │  (string)      │   │
│                                          └────────────────┘   │
│                                                             │
│   All credentials ──────▶ clearAllCredentials ──────▶ null │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Rules**:
- Each credential field is independent; changing one does not affect others
- Setting a credential to `null` clears it
- `clearAllCredentials` atomically clears all credentials

### Provider Store Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                  Provider Store Transitions                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Provider Selection:                                        │
│  ┌─────────┐   setSelectedProvider   ┌───────────────┐   │
│  │ ollama  │ ────────────────────────▶│ openai/etc.   │   │
│  └─────────┘                           └───────────────┘   │
│       │                                     │               │
│       │         Auto-selects first         │               │
│       │         available model            │               │
│       ▼                                     ▼               │
│  ┌─────────────────┐              ┌─────────────────┐     │
│  │ selectedModel   │◀─────────────│ selectedModel   │     │
│  │ (gpt-oss:latest)│              │ (gpt-4o/etc.)   │     │
│  └─────────────────┘              └─────────────────┘     │
│                                                             │
│  Model Management:                                          │
│  ┌──────────────┐   addCustomModel    ┌──────────────┐   │
│  │ customModels │ ───────────────────▶│ +customModels │   │
│  │  (empty)     │                      │  (with model) │   │
│  └──────────────┘                      └──────────────┘   │
│                                                             │
│  ┌──────────────┐   deleteModel       ┌──────────────┐   │
│  │ default      │ ───────────────────▶│ +hiddenModels │   │
│  │ model        │                      │  (hidden)     │   │
│  └──────────────┘                      └──────────────┘   │
│                                                             │
│  ┌──────────────┐   deleteModel       ┌──────────────┐   │
│  │ custom       │ ───────────────────▶│ -customModels │   │
│  │ model        │                      │  (removed)    │   │
│  └──────────────┘                      └──────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Rules**:
- `setSelectedProvider` automatically updates `selectedModel` to the first visible model for the new provider
- `setAvailableModels` for Ollama reconciles overlapping custom/hidden entries
- `deleteModel` hides default models (recoverable) but deletes custom models (permanent)
- Adding a custom model automatically unhides it if previously hidden

### Settings Store Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                  Settings Store Transitions                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐   setTheme           ┌──────────────────┐   │
│  │ 'dark'   │ ─────────────────────▶│ 'light'/'nord'/  │   │
│  └──────────┘                       │ 'catppuccin'/etc │   │
│                                       └──────────────────┘   │
│                                                             │
│  ┌──────────┐   setHapticEnabled    ┌──────────────────┐   │
│  │  true    │ ─────────────────────▶│     false        │   │
│  └──────────┘                       └──────────────────┘   │
│                                                             │
│  ┌──────────┐   setMessageFontSize  ┌──────────────────┐   │
│  │    16    │ ──────────────────────▶│     12-24        │   │
│  └──────────┘                       └──────────────────┘   │
│                                                             │
│  All settings ──▶ resetSettings ──▶ DEFAULT_SETTINGS       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Rules**:
- All settings are independent; changing one does not affect others
- `resetSettings` atomically restores all defaults
- Font size validation (12-24px) should be enforced by UI components

## Hydration and Versioning

### Hydration Order

The system uses lazy hydration with write-version conflict resolution:

1. **Cold Start**: Store initializes with defaults, then hydrates from SecureStore
2. **Warm Start**: Store has runtime mutations before hydration completes
3. **Conflict Resolution**: If `persistedWriteVersion < runtimeWriteVersion`, runtime wins

### Store Dependencies

```typescript
const STORE_DEPENDENCIES: Record<PersistedStoreId, PersistedStoreId[]> = {
  auth: [],
  provider: [],
  settings: [],
  chatOverride: ["provider"],  // chatOverride depends on provider being ready
};
```

**Invariant**: Stores without dependencies (`auth`, `provider`, `settings`) can hydrate independently. Stores with dependencies must wait for their dependencies to hydrate first.

## Change Guide

### Making Changes to State

#### Adding a New Store Property

1. Add the property to the state interface
2. Add a corresponding action to the actions interface
3. Implement the action using `applyRuntimeWriteVersion`
4. Include in `partialize` for persistence
5. Update tests to cover the new property

#### Modifying State Transitions

1. Identify affected actions in the store
2. Ensure atomic updates using `applyRuntimeWriteVersion`
3. Update selection fallback logic if needed
4. Add tests for edge cases
5. Update this document with new transition rules

#### Changing Default Values

1. Update the `DEFAULT_*` constants in the store
2. Update `resetToDefaults` or `resetSettings` actions
3. Update tests to reflect new defaults
4. Document the change in release notes

### Risk Areas

| Area | Risk Level | Considerations |
|------|-------------|----------------|
| Hydration registry | High | Changes can cause data loss or corruption |
| Provider selection logic | Medium | May affect user experience if model selection breaks |
| Auth credential handling | High | Security implications - always use SecureStore |
| Settings persistence | Low | Safe to modify, affects UI only |

### Testing Requirements

When modifying state:

1. Unit tests for all new actions
2. Integration tests for cross-store dependencies
3. Hydration tests for version conflict scenarios
4. Edge case tests for selection fallbacks
