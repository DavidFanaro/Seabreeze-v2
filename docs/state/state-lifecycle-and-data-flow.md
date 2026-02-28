# State Lifecycle and Data Flow

This document describes the runtime lifecycle of state management, including how data flows through the system and how state transitions occur during app execution.

## Purpose

Understanding the runtime behavior of state management is essential for:
- Debugging state-related issues
- Adding new features that interact with state
- Understanding side effects and their ordering
- Avoiding regressions when modifying state logic

## Concepts

### Runtime Lifecycle Stages

Each store goes through distinct lifecycle stages:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Store Lifecycle Stages                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. INITIALIZATION                                              │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ - Store created with DEFAULT values                │     │
│     │ - __meta.writeVersion = 0                          │     │
│     │ - __meta.hasHydrated = false                       │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                       │
│                          ▼                                       │
│  2. HYDRATION                                                   │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ - Reads persisted state from SecureStore            │     │
│     │ - Resolves version conflicts (runtime wins)        │     │
│     │ - Merges persisted state with defaults             │     │
│     │ - __meta.hasHydrated = true                        │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                       │
│                          ▼                                       │
│  3. ACTIVE USE                                                  │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ - User interactions trigger actions                 │     │
│     │ - State updates trigger re-renders                 │     │
│     │ - Changes persist asynchronously to SecureStore    │     │
│     │ - __meta.writeVersion increments on each mutation  │     │
│     └─────────────────────────────────────────────────────┘     │
│                          │                                       │
│                          ▼                                       │
│  4. REHYDRATION (optional)                                     │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ - Triggered by app foregrounding                    │     │
│     │ - Same conflict resolution as initial hydration   │     │
│     │ - Runtime changes are preserved if version newer   │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Flow Overview                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐     ┌──────────────┐     ┌─────────────────┐    │
│   │  User   │────▶│   Action    │────▶│   State Update  │    │
│   │Input/UI │     │  (setTheme, │     │  (Zustand set)  │    │
│   │         │     │  setProvider│     │                 │    │
│   └──────────┘     │  etc.)     │     └────────┬────────┘    │
│                    └──────────────┘              │             │
│                                                  │             │
│                                                  ▼             │
│   ┌──────────┐     ┌──────────────┐     ┌─────────────────┐    │
│   │  UI     │◀────│  Selector    │◀────│  Persistence    │    │
│   │Re-render│     │  (useStore)  │     │  (SecureStore)  │    │
│   └──────────┘     └──────────────┘     └─────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Control Flow

#### User Action to Persistence

```
User Changes Setting
        │
        ▼
┌───────────────────┐
│  UI Component     │
│  Calls Action     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Zustand Store    │
│  Action Handler  │
│  (applyRuntime   │
│   WriteVersion)  │
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────────┐
│ State │ │ Persist       │
│Update │ │ Middleware    │
└───┬───┘ └───────┬───────┘
    │             │
    │             ▼
    │     ┌───────────────┐
    │     │ SecureStore   │
    │     │ (Async Write) │
    │     └───────┬───────┘
    │             │
    ▼             ▼
┌───────┐   (No Return)
│  UI   │    Needed
│Reacts │
└───────┘
```

## Store-Specific Flows

### Auth Store Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Auth Store Data Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SET CREDENTIAL:                                                │
│  ┌─────────────┐    setOpenAIApiKey(key)    ┌──────────────┐  │
│  │ User enters │ ──────────────────────────▶ │ useAuthStore │  │
│  │ API key in  │                            │  .setOpenAI  │  │
│  │   Settings  │                            │   ApiKey()   │  │
│  └─────────────┘                            └───────┬───────┘  │
│                                                      │          │
│                                                      ▼          │
│                                              ┌──────────────┐  │
│                                              │ applyRuntime │  │
│                                              │ WriteVersion │  │
│                                              └───────┬──────┘  │
│                                                      │          │
│                           ┌─────────────────────────┼─────────┐│
│                           ▼                         ▼         ▼│
│                      ┌──────────┐            ┌──────────────┐  │
│                      │ State    │            │  SecureStore │  │
│                      │ Updates  │            │  (persisted) │  │
│                      └──────────┘            └──────────────┘  │
│                                                                 │
│  READ CREDENTIAL:                                               │
│  ┌─────────────┐                        ┌──────────────┐       │
│  │ Provider    │◀───────────────────────│ getProvider  │       │
│  │ Factory     │                        │   Auth()     │       │
│  └─────────────┘                        └───────┬──────┘       │
│                                                   │             │
│                                                   ▼             │
│                                          ┌──────────────┐       │
│                                          │ useAuthStore │       │
│                                          │   .getState()│       │
│                                          └──────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Side Effects**:
- Credential changes trigger async write to SecureStore
- UI re-renders when store state changes
- Provider factory reads credentials synchronously via `getState()`

**Invariant**: Apple provider always returns empty auth (no API key needed)

### Provider Store Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Store Data Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SELECT PROVIDER:                                               │
│  ┌─────────────┐                                           ┌───┴────┐│
│  │  Provider   │ ──▶ setSelectedProvider("openai") ──────▶│ State  ││
│  │  Selector   │                                           │Update  ││
│  └─────────────┘                                           └───┬────┘│
│                                                                  │    │
│                         ┌───────────────────────────────────────┼────┤
│                         ▼                                       ▼    │
│                    ┌──────────┐                           ┌─────────┐│
│                    │ getVisible│                           │Persist  ││
│                    │ Models()  │                           │to Store ││
│                    └─────┬─────┘                           └─────────┘│
│                          │                                        │
│                          ▼                                        │
│                    ┌──────────────┐                               │
│                    │ selectedModel│                               │
│                    │ auto-updated │                               │
│                    └──────────────┘                               │
│                                                                 │
│  FETCH MODELS (Ollama):                                          │
│  ┌─────────────┐    useEffect    ┌──────────────┐    ┌─────────┐│
│  │ ChatScreen  │ ──────────────▶│ Provider     │───▶│ API     ││
│  │             │                 │ fetchModels  │    │ Call   ││
│  └─────────────┘                 └──────┬───────┘    └────┬────┘│
│                                          │                  │     │
│                                          ▼                  ▼     │
│                                   ┌──────────────┐    ┌─────────┐│
│                                   │ setAvailable │◀───│ Model   ││
│                                   │ Models()     │    │ List    ││
│                                   └──────────────┘    └─────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Side Effects**:
- Provider changes trigger model list refresh for Ollama
- Model list changes trigger UI re-render
- Selected model auto-falls back if current selection becomes unavailable

**Edge Cases**:
- Ollama custom models overlapping with fetched models are removed
- Hidden models automatically unhide when fetched
- Selection falls back to first visible model if current is deleted

### Settings Store Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Settings Store Data Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  THEME CHANGE:                                                 │
│  ┌─────────────┐                        ┌───────────────────┐   │
│  │  Settings   │ ──▶ setTheme('nord')─▶│  useSettingsStore │   │
│  │  Screen    │                        │     .setTheme     │   │
│  └─────────────┘                        └────────┬──────────┘   │
│                                                  │              │
│                                                  ▼              │
│                                         ┌───────────────────┐   │
│                                         │  State Update +   │   │
│                                         │  Persist         │   │
│                                         └────────┬──────────┘   │
│                                                  │              │
│                                                  ▼              │
│                                         ┌───────────────────┐   │
│                                         │ ThemeProvider    │   │
│                                         │ Reacts + Applies │   │
│                                         │ New Theme        │   │
│                                         └───────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Side Effects**:
- Theme changes propagate through ThemeProvider
- Haptic settings affect all touch interactions
- Font size changes affect message rendering

## Hydration Runtime Behavior

### Hydration Sequence

```
App Launch
    │
    ▼
┌─────────────────────────────────────┐
│  Database Gate (db/index.ts)       │
│  - Runs migrations first            │
│  - Ensures schema ready             │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Provider Tree Mounts              │
│  - Auth Store hydrates              │
│  - Settings Store hydrates          │
│  - Provider Store hydrates          │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  First Screen Renders               │
│  - All stores hydrated              │
│  - UI uses persisted or default     │
│  - __meta.hasHydrated = true        │
└─────────────────────────────────────┘
```

### Version Conflict Resolution

**Scenario**: User changes provider while app is hydrating

```
Timeline:
─────────────────────────────────────────────────────────────▶

T0: App starts, store initialized (version=0)
    │
T1: User changes provider to "openai" (version=1)
    │   Runtime state: selectedProvider = "openai"
    │
T2: Hydration completes, persisted = "ollama" (version=0)
    │
T3: resolveHydrationMerge() executes
    │   - persistedWriteVersion (0) < runtimeWriteVersion (1)
    │   - Runtime state preserved!
    │   - Result: selectedProvider = "openai"
    │
T4: Final state: selectedProvider = "openai"
```

**Invariant**: Always prefer runtime mutations over stale persisted data.

## Inline Comments Guide

The state modules include inline comments for:

### Side Effects

```typescript
// Silent fail on security exceptions (access denied, etc.)
// This ensures app continues working even if storage is unavailable
```

### Invariants

```typescript
// Prevent duplicate custom models
if (existing.includes(model)) return state;
```

### Edge Cases

```typescript
// Update selected model if deleted model was selected
// Falls back to first available visible model
selectedModel:
  state.selectedModel === model
    ? allVisible[0] || ""
    : state.selectedModel,
```

### Security Considerations

```typescript
// Uses device's secure storage (Keychain on iOS, Keystore on Android)
// Encrypts data at rest
```

## Related

- [Architecture Overview](../architecture/overview.md)
- [State Model](./state-model.md)
- [Provider Configuration](../providers/README.md)
