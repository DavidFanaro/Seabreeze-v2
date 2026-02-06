# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

### Stream Lifecycle Management
- Use a dedicated hook (`useStreamLifecycle`) to manage stream state
- Track states: `idle` | `streaming` | `completing` | `completed` | `error` | `cancelled`
- Always pair streaming state with AbortController for cancellation
- Use `useRef` for AbortController to persist across renders
- Implement timeout fallback (30s default) using `setTimeout` + `clearTimeout`
- Handle component unmount with `useEffect` cleanup to avoid memory leaks
- Support both `onBeforeStream` and `onAfterStream` callbacks for external integration

### Error Recovery Pattern
- Wrap streaming operations with `executeWithRetry` for automatic retries
- Maintain `failedProvidersRef` to track failed providers during fallback chain
- Use consistent error type: `{ message: string; isFatal?: boolean; shouldRetry?: boolean }`
- Provide user-friendly error messages via centralized `lib/error-messages.ts`

### React Native App State Handling
- Import `AppState` from 'react-native' (not from 'expo-*' packages)
- Use `AppState.addEventListener('change', callback)` for background detection
- Always remove listeners in cleanup to prevent memory leaks

---

## [2026-02-06] - US-001

### What was implemented
- **Created** `hooks/chat/useStreamLifecycle.ts`: Centralized stream lifecycle management
  - 6 stream states: idle, streaming, completing, completed, error, cancelled
  - 30-second timeout fallback for stream completion detection
  - AppState listener for handling app backgrounding
  - AbortController-based cancellation with proper cleanup
  - Comprehensive lifecycle event logging for debugging
  - ~540 lines of production-ready code with error handling
  
- **Updated** `hooks/chat/useChatStreaming.ts`: Integrated stream lifecycle
  - Added `abortSignal` support to streaming options
  - Checks abort signal before each chunk processing
  - Integrates with lifecycle callbacks (onBeforeStream, onAfterStream)
  - Returns accumulated content on cancellation for partial recovery
  
- **Updated** `hooks/chat/useChat.ts`: Exposed stream state to consumers
  - Integrated `useStreamLifecycle` hook
  - Added `streamState` to hook return value
  - Updated `cancel()` to use lifecycle `abort()` method
  - Added `onBeforeStream` callback to initialize lifecycle
  - Added `onAfterStream` callback for cleanup
  
- **Updated** `types/chat.types.ts`: Added stream state types
  - Added `StreamState` type definition
  - Added `streamState` to `UseChatReturn` interface

### Files changed
- `hooks/chat/useStreamLifecycle.ts` (NEW - 540 lines)
- `hooks/chat/useChatStreaming.ts` (MODIFIED - +20 lines)
- `hooks/chat/useChat.ts` (MODIFIED - +12 lines)
- `types/chat.types.ts` (MODIFIED - +3 lines)

### Quality checks
- ✅ TypeScript: `npx tsc --noEmit` passes
- ✅ ESLint: `npm run lint` passes
- ✅ Jest tests: All 77 tests pass (hooks/chat/, useChat, useChatStreaming)

### **Learnings:**
- **Pattern: Ref-based Stream State**: Using `useRef` for AbortController prevents React re-renders during streaming while maintaining cancellation capability
- **Pattern: Dual Detection Strategy**: Implement both explicit `done` signal AND timeout fallback for robust stream completion detection
- **Pattern: Lifecycle Logging**: Centralized logging with structured prefixes (`[StreamLifecycle]`) makes debugging significantly easier
- **Gotcha: AppState import**: Must import `AppState` from 'react-native' core, not from Expo packages
- **Gotcha: AbortController timing**: AbortController must be created BEFORE streaming starts to avoid race conditions with cleanup
- **Gotcha: Timeout cleanup**: Always clear timeouts in cleanup to prevent memory leaks and false positive timeouts after unmount
- **Pattern: State Machine**: Explicit state machine (idle → streaming → completing → completed/error/cancelled) makes complex async flow manageable

---

