# Feature Flows

This document covers core user journeys and UI state transitions in Seabreeze.

## Core User Journeys

### 1. Creating a New Chat

**Flow:**
```
Home Screen → Tap "+" Button → Chat Screen (new) → Send Message → Auto-save
```

**Steps:**
1. User taps "+" button on Home screen header
2. Navigation pushes `/chat/new` route
3. Chat screen initializes with empty message state
4. User types message and taps send
5. `useChat` hook sends message to active AI provider
6. Response streams back and displays in `MessageList`
7. After stream completes, `useMessagePersistence` saves chat to SQLite
8. If no title exists, auto-title generation triggers
9. User can navigate back - chat persists in database
10. On return to Home, new chat appears in list

**State Transitions:**
- `streamState`: `idle` → `completing` → `streaming` → `completed`
- `messages`: `[]` → `[userMsg]` → `[userMsg, assistantMsg]`
- `saveStatus`: `idle` → `saving` → `saved` (or `error` with retry)

### 2. Opening Existing Chat

**Flow:**
```
Home Screen → Tap Chat Item → Hydrate from Database → Display Messages
```

**Steps:**
1. User taps chat item in FlatList
2. Navigation pushes `/chat/{id}` route with numeric ID
3. Chat screen's `useEffect` triggers hydration:
   - Queries SQLite for chat by ID
   - Normalizes persisted messages (handles legacy formats)
   - Restores thinking output if applicable
   - Applies snapshot to UI via `setMessages`, `setThinkingOutput`
4. Chat displays with full message history
5. User can continue conversation
6. Changes auto-save after each message completion

**State Transitions:**
- `isInitializing`: `true` → `false` (after hydration)
- `chatID`: `0` → `persisted ID` (after first save)
- `hydrationError`: `null` → error message (on failure)

### 3. Configuring AI Provider

**Flow:**
```
Settings Index → Select Provider → Configure API Key → Select Model → Save
```

**Steps:**
1. User taps gear icon → navigates to Settings Index
2. User taps provider row (e.g., "OpenAI")
3. Navigation pushes `/settings/openai`
4. User enters API key in `GlassInput`
5. User selects model from `ModelSelector`
6. On change, store updates (`useSettingsStore`, `useProviderStore`)
7. API key persists to expo-secure-store
8. Provider marked as configured
9. User navigates back - new provider available in chat

**State Transitions:**
- Provider config: `unconfigured` → `configured`
- Selected model: `default` → user-selected

### 4. Changing App Appearance

**Flow:**
```
Settings Index → Tap Appearance → Select Theme → Apply
```

**Steps:**
1. User navigates to Settings Index
2. User taps "Appearance" row
3. Navigation pushes `/settings/appearance`
4. User selects theme (light/dark/system)
5. Store updates (`useSettingsStore`)
6. Theme applies immediately via `ThemeProvider` context
7. Navigation colors update via `ThemeContext`

### 5. Deleting a Chat

**Flow:**
```
Home Screen → Swipe Chat Item → Confirm Delete → Remove from Database
```

**Steps:**
1. User swipes left on chat item (or long-press)
2. Delete button appears
3. User taps delete
4. Confirmation alert shows
5. User confirms
6. `deleteChat` callback executes:
   - Acquires delete lock (prevent race with open)
   - Deletes from SQLite via `db.delete(chat)`
   - Releases lock
7. FlatList re-renders - chat removed

**Invariant:** Delete locks prevent opening a chat while it's being deleted.

### 6. Retrying Failed Message

**Flow:**
```
Error Occurs → Retry Banner Appears → Tap Retry → Resend Last Message
```

**Steps:**
1. Message send fails (network error, API error)
2. `streamState` transitions to `error`
3. `RetryBanner` displays with error message
4. User taps "Retry" button
5. `retryLastMessage` callback invoked
6. Same message re-sent to provider
7. Banner dismisses on success

**State Transitions:**
- `streamState`: `completed` → `error` → `completing` → `streaming` → `completed`
- `canRetry`: `true` when last message failed and is retryable

## UI State Transitions

### Chat Screen States

| State | Description | UI Effect |
|-------|-------------|-----------|
| `initializing` | Loading existing chat | Shows loading, disables input |
| `ready` | Chat loaded, awaiting input | Input enabled, messages displayed |
| `streaming` | AI response streaming | Input locked, thinking indicator |
| `completing` | Finalizing message | Brief transition state |
| `completed` | Message exchange done | Input enabled |
| `error` | Failure occurred | Retry banner shown |

### Save Status States

| Status | Description | UI Effect |
|--------|-------------|-----------|
| `idle` | No pending saves | Normal operation |
| `saving` | Save in progress | Subtle indicator |
| `saved` | Save successful | Brief confirmation |
| `error` | Save failed | Error banner with retry |
| `retrying` | Retrying failed save | Shows attempt count |

### Provider Configuration States

| State | Indicator |
|-------|-----------|
| `configured` | Accent-colored icon, model name shown |
| `unconfigured` | Muted icon, no model shown |

## Key Interactions

### Message Input Flow

```
User types → Text state updates → Tap send → 
Input locks → Message added to list → 
API call → Stream starts → Stream ends → 
Save triggers → Title generates (if needed)
```

### Attachment Flow

```
Tap attachment button → ActionSheet (iOS) / Alert (Android) →
Select source (Camera/Library) → Permissions check →
Picker opens → Assets selected → 
Normalization (size, type check) → 
Attachments added to pending state →
Sent with next message
```

### Auto-Title Generation

```
First assistant message completes → 
Check: title exists? → No → 
Generate title via AI → 
Save to database → 
Display in header
```

**Constraints:**
- Max 3 attempts
- Skips if title already exists
- Uses current provider/model

## Error Recovery Paths

### Chat Load Failure

```
Hydration fails → Show RetrievalRecoveryView →
Tap Retry → Re-attempt load → Success/Error
```

### Save Failure

```
Save fails → Show SaveErrorBanner → 
Auto-retry with backoff → Success/Stay showing
```

### Network Error During Stream

```
Stream errors → Show RetryBanner →
Tap Retry → Resend message
```

## Related

- [Layout and Navigation](./layout-and-navigation.md) - Screen structure and navigation
- [Architecture Overview](../architecture/overview.md) - System architecture
- [Codebase Map](../architecture/codebase-map.md) - File locations and ownership
