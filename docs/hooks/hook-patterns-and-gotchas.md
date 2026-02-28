# Hook Patterns and Gotchas

This guide documents recommended patterns and anti-patterns for working with Seabreeze's custom hooks.

## Purpose

Provide actionable guidance for contributors extending or debugging hook functionality. Covers patterns discovered through implementation and common pitfalls to avoid.

## Recommended Patterns

### 1. Composition Over Inheritance

**Pattern**: Use hook composition to build complex behavior from simpler primitives.

```typescript
// GOOD: Compose child hooks into orchestrator
function useChat(options: UseChatOptions): UseChatReturn {
  const chatState = useChatState(chatId);
  const { executeStreaming } = useChatStreaming();
  const { streamState, ...lifecycle } = useStreamLifecycle({...});
  const { title, generateTitle } = useTitleGeneration(...);
  // Combine and return unified API
}

// AVOID: Single monolithic hook doing everything
function useMegaChat() {
  // 1000+ lines mixing concerns - hard to test and maintain
}
```

**Why**: Enables independent testing, easier debugging, and clearer separation of concerns.

---

### 2. Refs for Async State Access

**Pattern**: Use refs to access latest state in async callbacks without stale closures.

```typescript
// GOOD: Ref maintains latest value across renders
const messagesRef = useRef<ModelMessage[]>([]);
useEffect(() => {
  messagesRef.current = messages;
}, [messages]);

const sendMessage = useCallback(async () => {
  // Always accesses current messages without re-creating callback
  const current = messagesRef.current;
  // ... async operation
}, []);

// BAD: Direct state in async callback causes stale closure
const sendMessage = useCallback(async () => {
  // Will see stale messages from render when callback was created
  const current = messages; // ❌ Stale!
}, []); // Empty deps = never updates
```

**Why**: React's useCallback captures state at creation time; refs provide mutable access to current values.

---

### 3. Sequence Guards for Concurrent Operations

**Pattern**: Prevent concurrent mutations with sequence guards.

```typescript
// GOOD: Only process current send operation
const sendSequenceGuardRef = useRef(createSequenceGuard(`chat-send-${chatId}`));

const sendMessage = useCallback(async () => {
  const token = sendSequenceGuardRef.current.next();
  
  // ... async operation ...
  
  // Only commit if still current
  if (sendSequenceGuardRef.current.isCurrent(token)) {
    setMessages(updated);
  }
}, []);

// BAD: No guard allows race conditions
const sendMessage = useCallback(async () => {
  // Two rapid sends can interleave and corrupt state
  setMessages(updated1);
  setMessages(updated2);
}, []);
```

**Why**: Async operations can complete out of order; guards ensure only the latest operation commits.

---

### 4. Idempotency Keys for Deduplication

**Pattern**: Generate deterministic keys to skip duplicate operations.

```typescript
// GOOD: Skip if same operation already in progress
const saveKey = createIdempotencyKey("chat-persistence", [
  chatId,
  messagesJson,
  thinkingJson,
]);

if (saveKey === lastPersistedKeyRef.current) {
  return; // Skip duplicate
}
lastPersistedKeyRef.current = saveKey;

// BAD: Always save regardless of content
await saveToDatabase(messages); // Duplicates on rapid changes
```

**Why**: React effects can fire multiple times; idempotency prevents redundant work.

---

### 5. AbortSignal Integration

**Pattern**: Propagate cancellations throughAbortSignal.

```typescript
// GOOD: Check abort signal throughout async operations
const executeStreaming = useCallback(async (abortSignal?: AbortSignal) => {
  for await (const chunk of stream) {
    if (abortSignal?.aborted) return; // Respect cancellation
    // Process chunk
  }
}, []);

// Cancel via AbortController
const controller = new AbortController();
executeStreaming(controller.signal);
// Later: controller.abort()
```

**Why**: AbortSignal provides standard cancellation that works across async boundaries.

---

### 6. Memoization for Derived State

**Pattern**: Use useMemo to prevent unnecessary recalculations.

```typescript
// GOOD: Only recalculates when dependencies change
const effectiveProviderModel = useMemo(() => {
  if (chatId === "new") {
    return { provider: selectedProvider, model: selectedModel };
  }
  return getEffectiveProviderModel(chatId);
}, [chatId, selectedProvider, selectedModel]);

// GOOD: Stable function references with useCallback
const setOverride = useCallback((provider, model) => {
  setChatOverride(chatId, provider, model);
}, [chatId, setChatOverride]);
```

**Why**: Prevents unnecessary re-renders and recalculations in consuming components.

---

## Anti-Patterns

### 1. Direct State Mutation

**Problem**: Mutating objects directly breaks React's change detection.

```typescript
// BAD: Direct mutation - won't trigger re-render
messages.push(newMessage);
setMessages(messages);

// GOOD: Immutable update - creates new array
setMessages([...messages, newMessage]);

// GOOD: Functional update - based on current state
setMessages(prev => [...prev, newMessage]);
```

---

### 2. Missing Dependency Arrays

**Problem**: Incomplete deps cause stale closures or infinite loops.

```typescript
// BAD: Missing dependency causes stale callback
const sendMessage = useCallback(async () => {
  await api.send(text); // text is stale!
}, []); // Missing: text

// BAD: Too many deps causes infinite loop
const sendMessage = useCallback(async () => {
  await api.send(text);
}, [text, setMessages]); // setMessages shouldn't be here!

// GOOD: Use ref for stable access, deps for config only
const textRef = useRef(text);
textRef.current = text;
const sendMessage = useCallback(async () => {
  await api.send(textRef.current);
}, []); // Stable: no changing deps
```

---

### 3. Ignoring Hydration Timing

**Problem**: Accessing persisted store before hydration completes returns stale data.

```typescript
// BAD: Reading store immediately may get empty/partial data
const { selectedProvider } = useProviderStore();
// Override may not be loaded yet!

// GOOD: Check hydration before reading
const { overrides } = useChatOverrideStore();
if (!isStoreHydrated("chatOverride")) {
  return <Loading />;
}
// Safe to read overrides now
```

---

### 4. Not Cleaning Up Timers/Listeners

**Problem**: Memory leaks and stale callbacks from uncleared timers.

```typescript
// BAD: Timer never cleared
useEffect(() => {
  const id = setInterval(checkStatus, 1000);
  // Missing: return () => clearInterval(id)
}, []);

// GOOD: Cleanup on unmount
useEffect(() => {
  const id = setInterval(checkStatus, 1000);
  return () => clearInterval(id);
}, []);
```

---

### 5. Blocking State Updates

**Problem**: Large synchronous operations block the UI thread.

```typescript
// BAD: Heavy computation blocks UI
const processMessages = (messages) => {
  // 100k+ iterations blocks thread
  return messages.map(m => expensiveTransform(m));
};

// GOOD: Chunked processing with setTimeout yield
const processMessages = async (messages) => {
  const results = [];
  for (const chunk of chunks) {
    results.push(...processChunk(chunk));
    await new Promise(r => setTimeout(r, 0)); // Yield to UI
  }
  return results;
};
```

---

## Common Gotchas

### Provider Fallback State Persistence

**Issue**: Fallback provider state bleeds into next message.

**Solution**: Reset provider state after each message:

```typescript
useEffect(() => {
  if (!isStreaming) {
    setActiveProvider(effectiveProviderId); // Reset to original
    setIsUsingFallback(false);
  }
}, [effectiveProviderId, isStreaming]);
```

---

### Stream Lifecycle Race Conditions

**Issue**: Multiple streams can overlap causing state corruption.

**Solution**: Initialize stream clears previous state:

```typescript
const initializeStream = useCallback(() => {
  // Clean up existing stream first
  if (abortController) {
    abortController.abort();
  }
  clearTimeouts();
  // Start fresh
}, [abortController, clearTimeouts]);
```

---

### Database Write During Chat Deletion

**Issue**: Saving to deleted chat causes errors.

**Solution**: Check deletion lock before write:

```typescript
if (isChatDeleteLocked(chatId)) {
  return { success: true, skipped: true };
}
await db.update(chat).set(...);
```

---

### Title Generation Versioning

**Issue**: Stale generation overwrites manually set title.

**Solution**: Track version and skip stale generations:

```typescript
if (titleVersionRef.current === generationVersion 
    && titleRef.current === DEFAULT_CHAT_TITLE) {
  setTitleState(generated);
}
```

---

### Checkpoint Save Storms

**Issue**: Rapid message changes trigger excessive saves.

**Solution**: Debounce and use idempotency keys:

```typescript
const timeoutId = setTimeout(() => {
  pendingSave = runSerializedSave(snapshot);
}, 100); // Debounce 100ms

// In saveWithRetry:
if (snapshot.key === lastPersistedSnapshotKeyRef.current) {
  return; // Skip duplicate
}
```

---

## Related

- [Hooks Catalog](./hooks-catalog.md) - Complete hook reference
- [State Model](../state/state-model.md) - State boundaries
- [Architecture Overview](../architecture/README.md) - System boundaries
