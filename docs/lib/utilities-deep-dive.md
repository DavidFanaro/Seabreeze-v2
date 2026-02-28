# Utilities Deep Dive

## Purpose

The `lib/` folder provides shared utility modules that support chat functionality, persistence coordination, security, and device capabilities across the application.

## Concepts

### Concurrency Primitives

- **Idempotency keys**: Prevent duplicate operations using `createIdempotencyKey()`
- **Sequence guards**: Ensure exclusive access to critical sections
- **AbortSignal propagation**: Standard cancellation across async boundaries

### Persistence Coordination

- **Queue-based ordering**: Ensures saves/deletes happen in sequence
- **Softlock detection**: Watchdog timers detect stuck operations
- **Delete locks**: Prevent saves to chats being deleted

### Security

- **Fallback storage**: In-memory Map when SecureStore unavailable
- **Lazy loading**: SecureStore module loaded on-demand

## File Map

| File | Purpose |
|------|---------|
| `lib/concurrency.ts` | Idempotency keys, sequence guards, AbortSignal helpers |
| `lib/chat-persistence-coordinator.ts` | Queue coordination for saves/deletes |
| `lib/chat-attachments.ts` | Image/video attachment handling and validation |
| `lib/chat-content-parts.ts` | Message content parsing (text, images, files) |
| `lib/chat-message-normalization.ts` | Message format standardization |
| `lib/chat-title.ts` | Chat title normalization for display/storage |
| `lib/safe-secure-store.ts` | SecureStore wrapper with fallback |
| `lib/error-messages.ts` | Centralized error message strings |
| `lib/chat-error-annotations.ts` | Error categorization and annotations |
| `lib/persistence-telemetry.ts` | Performance telemetry for persistence ops |
| `lib/deviceCapabilities.ts` | Device feature detection |
| `lib/polyfills.ts` | Required polyfills (must import first) |
| `lib/constants.ts` | App-wide constant values |

## Flow

### Attachment Processing Flow

1. User selects images/videos via ImagePicker
2. `normalizePickerAsset()` converts picker response to ChatAttachment
3. Validates media type support
4. Converts local URIs to data URIs if needed
5. Attaches to message before sending

### Persistence Queue Flow

1. Checkpoint timer triggers (15s initial, 10s intervals)
2. `runChatOperation()` enqueues the save task
3. Operations execute in FIFO order per chat
4. Watchdog monitors for softlocks (>8s = timeout)
5. On completion: cleanup tail reference

### SecureStore Flow

1. First access triggers lazy module load
2. Attempts to import expo-secure-store
3. Validates required methods exist
4. If unavailable: falls back to in-memory Map
5. All operations work identically regardless of backend

## Extension Points

### Adding New Concurrency Primitives

Add to `lib/concurrency.ts`:
```typescript
export function createNewPrimitive() {
  // Implement and document in this file
}
```

### Adding New Attachment Types

Update `lib/chat-attachments.ts`:
1. Add media type to supported set
2. Add detection helper function
3. Update `normalizePickerAsset()` if needed

### Adding New Constants

Update `lib/constants.ts`:
- Group by domain (LAYOUT, CACHE, etc.)
- Use `as const` for type safety

## Gotchas

- **Polyfills import order**: `lib/polyfills.ts` MUST be imported first in app entry
- **SecureStore fallback**: Data lost on app restart if SecureStore unavailable
- **Large attachments**: 30MB limit enforced, may need to compress
- **Queue memory**: Chat operation tails held in memory until complete
- **Softlock timeouts**: 8s watchdog may fire on slow devices

## Change Guide

### Adding a Utility Function

1. Determine appropriate file in `lib/`
2. Add function with JSDoc header
3. Export from `lib/index.ts` if creating new file
4. Add inline comments explaining edge cases

### Modifying Constants

1. Add new constant to appropriate group in `lib/constants.ts`
2. Update TypeScript types if needed
3. Document in this file if it's a new group
