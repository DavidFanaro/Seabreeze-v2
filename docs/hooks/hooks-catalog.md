# Hooks Catalog

This document catalogs each major custom hook in Seabreeze with purpose, inputs/outputs, side effects, and pitfalls.

## Purpose

The hooks catalog provides a comprehensive reference for contributors to understand hook contracts, side effects, and safe extension patterns. Each hook is documented with its interface, behavior, and known limitations.

## Concepts

### Hook Architecture

Seabreeze's hooks follow a composition pattern where `useChat` serves as the main orchestrator, delegating to specialized child hooks:

```
useChat (orchestrator)
├── useChatState         → Provider/model override resolution
├── useChatStreaming     → AI SDK streaming logic
├── useStreamLifecycle  → Stream state machine & timeouts
├── useTitleGeneration  → AI-powered title generation
└── useMessagePersistence → Database persistence (external)
```

### Hook Categories

| Category | Hooks | Purpose |
|----------|-------|---------|
| Chat Orchestration | `useChat` | Main entry point combining all chat functionality |
| Streaming | `useChatStreaming`, `useStreamLifecycle` | Real-time AI response handling |
| State Management | `useChatState`, `useProviderStore` | Provider/model configuration |
| Persistence | `useMessagePersistence`, `useDatabase` | Database operations |
| Utilities | `useErrorRecovery`, `useHapticFeedback` | Error handling & UX |

---

## Hook Reference

### useChat

Main orchestrator hook combining message state, streaming, provider management, fallback, retry, and title generation.

**File**: `hooks/chat/useChat.ts`

#### Purpose

Central hub for all chat operations. Manages the complete message flow from user input through AI streaming to persistence.

#### Inputs

```typescript
interface UseChatOptions {
  initialMessages?: ModelMessage[];    // Starting conversation
  initialText?: string;                 // Initial input text
  placeholder?: boolean;                 // Show placeholder response
  chatId?: string;                      // Unified state management ID
  model?: LanguageModel;                // Direct model injection (testing)
  onChunk?: (chunk: string, acc: string) => void;
  onThinkingChunk?: (chunk: string, acc: string) => void;
  enableThinking?: boolean;              // Default: true
  thinkingLevel?: ThinkingLevel;         // Reasoning effort
  onError?: (error: Error) => void;
  onComplete?: () => void;
  onFallback?: (from: ProviderId, to: ProviderId, reason: string) => void;
  enableFallback?: boolean;              // Default: true
  enableRetry?: boolean;                // Default: true
  retryConfig?: Partial<RetryConfig>;
}
```

#### Outputs

```typescript
interface UseChatReturn {
  text: string;                    // Current input
  setText: (value: string) => void;
  messages: ModelMessage[];         // Conversation history
  setMessages: React.Dispatch<React.SetStateAction<ModelMessage[]>>;
  thinkingOutput: string[];
  setThinkingOutput: React.Dispatch<React.SetStateAction<string[]>>;
  isThinking: boolean;              // Reasoning in progress
  isStreaming: boolean;             // Response streaming
  streamState: StreamState;         // Lifecycle state
  sendMessage: (input?: ChatSendInput) => Promise<void>;
  cancel: () => void;
  reset: () => void;
  title: string;
  setTitle: (title: string) => void;
  generateTitle: () => Promise<string>;
  currentProvider: ProviderId;
  currentModel: string;
  isUsingFallback: boolean;
  retryLastMessage: () => Promise<void>;
  canRetry: boolean;
  errorMessage: string | null;
}
```

#### Side Effects

- **State**: Creates React state for messages, text, thinking output, streaming status
- **Async**: Initiates AI streaming on `sendMessage()`, handles retries
- **Persistence**: Triggers saves via `useMessagePersistence` on stream completion
- **Subscribes**: To `useChatState` for provider overrides

#### Pitfalls

- **Stale closures**: `sendMessage` uses refs (`messagesRef`, `canceledRef`) to avoid stale state in async callbacks
- **Race conditions**: `sendSequenceGuardRef` prevents concurrent send operations
- **Provider switching**: Active provider resets after each message to clear fallback state

---

### useChatState

Manages chat-specific provider/model overrides with SecureStore persistence.

**File**: `hooks/useChatState.ts`

#### Purpose

Provides per-chat AI provider configuration that overrides global settings. New chats always use global settings; existing chats can have custom overrides.

#### Inputs

```typescript
// chatId: string | null
// - null/"new" → always use global settings
// - string → check for chat-specific override
```

#### Outputs

```typescript
interface UseChatStateReturn {
  provider: ProviderId;           // Effective provider (override or global)
  model: string;                 // Effective model (override or global)
  isOverridden: boolean;          // Whether using chat-specific override
  globalProvider: ProviderId;     // Current global provider
  globalModel: string;            // Current global model
  setOverride: (provider: ProviderId, model: string) => void;
  clearOverride: () => void;
  syncFromDatabase: (dbProvider: ProviderId | null, dbModel: string | null) => void;
  hasOverride: boolean;
}
```

#### Side Effects

- **Persistence**: Writes to SecureStore on `setOverride`/`clearOverride`
- **Hydration**: Waits for store hydration before reading overrides

#### Pitfalls

- **Hydration ordering**: Uses `canUseChatOverrides()` guard to prevent cross-store race conditions
- **New chat protection**: Cannot set overrides on new chats (ID: "new" or null)
- **Sync timing**: `syncFromDatabase` only creates override if values differ from global settings

---

### useChatStreaming

Handles real-time AI text generation with error recovery and provider fallback.

**File**: `hooks/chat/useChatStreaming.ts`

#### Purpose

Core streaming logic using AI SDK's `streamText`. Manages chunk processing, error classification, retry, and fallback to alternative providers.

#### Inputs

```typescript
interface StreamingOptions {
  model: FallbackResult;           // Resolved model with metadata
  enableRetry: boolean;
  retryConfig: Partial<RetryConfig>;
  enableFallback: boolean;
  activeProvider: ProviderId;
  effectiveProviderId: ProviderId;
  thinkingLevel?: ThinkingLevel;
  abortSignal?: AbortSignal;
  canMutateState?: () => boolean;
  onChunk?: (chunk: string, accumulated: string) => void;
  onThinkingChunk?: (chunk: string, accumulated: string) => void;
  onChunkReceived?: () => void;
  onDoneSignalReceived?: () => void;
  onStreamCompleted?: () => void;
  onError?: (error: unknown) => void;
  onFallback?: (from: ProviderId, to: ProviderId, reason: string) => void;
  onProviderChange?: (provider: ProviderId, model: string, isFallback: boolean) => void;
}
```

#### Outputs

```typescript
interface StreamingResult {
  success: boolean;
  shouldRetryWithFallback: boolean;
  accumulated: string;
  wasCancelled: boolean;
  nextProvider?: ProviderId;
  nextModel?: string;
}
```

#### Side Effects

- **Async**: Opens stream to AI provider, processes chunks in real-time
- **State**: Updates messages via `setMessages` callback
- **Callbacks**: Fires onChunk, onThinkingChunk, onError throughout stream

#### Pitfalls

- **Abort handling**: Checks `abortSignal.aborted` after each chunk to respect cancellations
- **Partial content**: Preserves accumulated text when errors occur after partial response
- **OpenRouter video**: Uses custom SSE transport for video attachments via OpenRouter API

---

### useStreamLifecycle

State machine managing stream lifecycle with timeout protection.

**File**: `hooks/chat/useStreamLifecycle.ts`

#### Purpose

Tracks stream state transitions and provides timeout/error detection. Prevents runaway streams and ensures proper cleanup.

#### Inputs

```typescript
interface StreamLifecycleOptions {
  timeoutMs?: number;           // Inactivity timeout (default: 30000ms)
  completionGraceMs?: number;    // Post-done grace period (default: 8000ms)
  enableLogging?: boolean;
  onStateChange?: (state: StreamState) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  backgroundBehavior?: "cancel" | "pause" | "continue"; // Default: "cancel"
}
```

#### Outputs

```typescript
type StreamState = "idle" | "streaming" | "completing" | "completed" | "error" | "cancelled";

interface UseStreamLifecycleReturn {
  streamState: StreamState;
  isStreamActive: boolean;
  isStreaming: boolean;
  isCompleting: boolean;
  isTerminal: boolean;
  eventLog: StreamLifecycleLogEntry[];
  initializeStream: () => AbortController;
  markChunkReceived: () => void;
  markDoneSignalReceived: () => void;
  markCompleting: () => void;
  markCompleted: () => void;
  markError: (error: Error) => void;
  cancelStream: () => void;
  abortController: AbortController | null;
  clearEventLog: () => void;
}
```

#### Side Effects

- **Timers**: Sets up inactivity timeout, max duration timeout (5 min), completion grace timeout
- **App state**: Listens to AppState for background/foreground transitions

#### Pitfalls

- **State machine**: Invalid transitions are silently ignored (except explicit restarts)
- **Timeout behavior**: Inactivity timeout errors the stream; max duration provides hard cap
- **App background**: Default "cancel" behavior may terminate long streams

---

### useTitleGeneration

Generates AI-powered chat titles from conversation content.

**File**: `hooks/chat/useTitleGeneration.ts`

#### Purpose

Creates concise 2-4 word titles based on user/assistant message history using AI models.

#### Inputs

```typescript
// messages: { role: string; content: string }[]
// model: LanguageModel | null
// enableRetry: boolean (default: true)
// retryConfig: Partial<RetryConfig>
```

#### Outputs

```typescript
interface UseTitleGenerationReturn {
  title: string;
  setTitle: (title: string) => void;
  generateTitle: () => Promise<string>;
  resetTitle: () => void;
}
```

#### Side Effects

- **Async**: Calls AI model to generate title
- **State**: Updates title on success

#### Pitfalls

- **Generation guard**: Only generates if messages exist and model is available
- **Version tracking**: Uses `titleVersionRef` to prevent stale generations overwriting newer titles
- **Retry limit**: Max 2 retries regardless of config to avoid excessive API calls

---

### useMessagePersistence

Atomic database persistence with retry logic and checkpoint saves.

**File**: `hooks/useMessagePersistence.ts`

#### Purpose

Saves chat messages to SQLite after stream completion, with retry on failures and checkpoint saves during long streams.

#### Inputs

```typescript
interface MessagePersistenceOptions {
  streamState: StreamState;
  chatIdParam: string;
  messages: ModelMessage[];
  thinkingOutput: string[];
  providerId: ProviderId;
  modelId: string;
  title: string;
  onSaveComplete?: (chatId: number) => void;
  onSaveError?: (error: Error, attempts: number) => void;
  enabled?: boolean;
}
```

#### Outputs

```typescript
type SaveStatus = "idle" | "queued" | "saving" | "retrying" | "saved" | "error";

interface UseMessagePersistenceReturn {
  saveStatus: SaveStatus;
  saveAttempts: number;
  saveError: Error | null;
  userFriendlyError: string | null;
  isSaving: boolean;
  hasSaveError: boolean;
  triggerSave: () => Promise<void>;
  clearError: () => void;
  lastSavedChatId: number | null;
}
```

#### Side Effects

- **Async**: Database write operations with retry
- **State**: Updates save status throughout operation

#### Pitfalls

- **Idempotency**: Uses `lastPersistedSnapshotKeyRef` to skip duplicate saves
- **Chat scope**: Monitors `chatIdParam` changes to reset state
- **Checkpoint timing**: Saves at 15s after start + every 10s during long streams
- **Delete protection**: `isChatDeleteLocked()` prevents saves during chat deletion

---

### useErrorRecovery

Exponential backoff retry with error classification.

**File**: `hooks/useErrorRecovery.ts`

#### Purpose

Provides both utility function and React hook for retrying failed operations with intelligent backoff.

#### Inputs (Hook)

```typescript
interface RetryConfig {
  maxRetries: number;              // Default: 3
  baseDelayMs: number;             // Default: 1000
  maxDelayMs: number;              // Default: 10000
  backoffMultiplier: number;       // Default: 2
  retryableCategories: ErrorCategory[];
}
```

#### Outputs (Hook)

```typescript
interface UseErrorRecoveryReturn {
  retryState: RetryState;
  canRetry: boolean;
  executeWithRecovery: <T>(operation: () => Promise<T>) => Promise<RetryResult<T>>;
  recordError: (error: unknown) => ErrorClassification;
  resetRetryState: () => void;
  abortRetry: () => void;
  getRetryAfter: () => number | null;
  config: RetryConfig;
}
```

#### Side Effects

- **Timers**: Sets up countdown interval during retry delay
- **State**: Updates retry state in real-time

#### Pitfalls

- **Jitter**: Adds 0-25% random jitter to prevent thundering herd
- **Rate limiting**: Special handling for `rate_limit` category with `retryAfter` support
- **Sequence guard**: Prevents stale executions from committing state

---

### useDatabase

Provides Drizzle ORM instance for SQLite operations.

**File**: `hooks/useDatabase.ts`

#### Purpose

Single entry point for all database operations, wrapping expo-sqlite with Drizzle ORM.

#### Inputs

None (uses context).

#### Outputs

```typescript
// ReturnType<typeof drizzle> - Drizzle database instance
```

#### Side Effects

- **Caching**: Caches client and DB instance to prevent multiple connections

#### Pitfalls

- **Context requirement**: Must be used within SQLiteProvider
- **Caching**: Instance cached by client reference; context must be stable

---

### useHapticFeedback

Wrapper around expo-haptics for device haptic feedback.

**File**: `hooks/useHapticFeedback.ts`

#### Purpose

Provides semantic methods for triggering haptic feedback on supported devices.

#### Inputs

None.

#### Outputs

```typescript
interface UseHapticFeedbackReturn {
  triggerPress: (strength?: "light" | "medium" | "heavy") => void;
  triggerSuccess: () => void;
  triggerError: () => void;
  triggerWarning: () => void;
  trigger: (type: HapticType) => void;
}
```

#### Side Effects

- **Native**: Calls expo-haptics native module

#### Pitfalls

- **Platform**: Only works on physical devices; simulators may have limited support

---

## Related

- [State Model](../state/state-model.md) - Zustand stores and persistence
- [State Lifecycle](./state-lifecycle-and-data-flow.md) - Runtime data flow
- [Layout and Navigation](../ui/layout-and-navigation.md) - Screen structure
- [Provider Documentation](../providers/README.md) - AI provider configuration
