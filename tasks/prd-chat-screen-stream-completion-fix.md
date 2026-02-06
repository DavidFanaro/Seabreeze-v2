# PRD: Chat Screen Stream Completion Fix

## Overview
Fix critical issues in the chat screen where streaming responses fail to complete properly and markdown doesn't update during the streaming process. The current flow (Stream → State → Render → Save on complete) has race conditions that cause partial message loss and broken stream handling.

## Goals
- Eliminate stream interruption issues for all scenarios (background, large payloads, race conditions)
- Ensure messages are fully saved to the database after stream completion
- Maintain existing user experience while fixing underlying reliability
- Add proper error handling for partial stream failures

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` - TypeScript type checking
- `npm run lint` - ESLint validation
- All existing Jest tests pass (`npm test`)

## User Stories

### US-001: Implement reliable stream completion detection
**Description:** As a user, I want chat streams to always complete fully so that I never lose partial AI responses.

**Acceptance Criteria:**
- [ ] Detect stream end using both `done` signal and fallback timeout (30s)
- [ ] Handle stream interruption scenarios: app backgrounding, network drops, component unmount
- [ ] Add stream state tracking (`streaming` | `completing` | `completed` | `error`)
- [ ] Cancel in-progress streams gracefully when user navigates away
- [ ] Log stream lifecycle events for debugging

### US-002: Fix race condition between stream and save operations
**Description:** As a user, I want my chat history to persist reliably so that no messages are lost.

**Acceptance Criteria:**
- [ ] Queue save operation to run only after stream reaches `completed` state
- [ ] Implement atomic "stream complete → save message" transaction
- [ ] Handle save failures with 3 retry attempts and exponential backoff
- [ ] Show user-friendly error if save fails after retries
- [ ] Ensure partial stream content is preserved even if save fails

### US-003: Add stream cancellation and cleanup
**Description:** As a user, I want to cancel ongoing streams so that I can start fresh conversations.

**Acceptance Criteria:**
- [ ] Add cancel button visible during active streaming
- [ ] Cancel button stops stream and preserves partial content
- [ ] Cleanup all stream resources (abort controllers, timers, subscriptions)
- [ ] Update UI state immediately on cancel (show "Stopped" indicator)
- [ ] Prevent memory leaks from uncleaned stream handlers

### US-004: Improve error recovery for failed streams
**Description:** As a user, I want clear feedback when streams fail so that I know what happened.

**Acceptance Criteria:**
- [ ] Display error message when stream fails mid-response
- [ ] Show "Retry" button for failed messages
- [ ] Preserve partial stream content on failure (don't discard)
- [ ] Log detailed error info for debugging (provider, timestamp, error type)
- [ ] Gracefully degrade to showing raw text if markdown render fails

## Functional Requirements

- FR-1: Stream must transition through states: `idle` → `streaming` → `completing` → `completed` | `error`
- FR-2: Save to database must only occur after `completed` state is reached
- FR-3: Stream cancellation must trigger immediate cleanup without saving incomplete messages
- FR-4: All stream handlers must be wrapped in try/catch with proper error propagation
- FR-5: Partial stream content must be preserved in component state even if save fails
- FR-6: Background app state must pause stream processing and resume on foreground (or cancel)
- FR-7: Maximum stream duration must be capped at 5 minutes with graceful timeout handling
- FR-8: Failed saves must retry up to 3 times with 1s, 2s, 4s delays before showing error

## Non-Goals

- Redesigning the UI/UX of the chat screen
- Changing the markdown rendering library (keeping custom implementation)
- Implementing optimistic updates for messages
- Adding real-time collaboration features
- Modifying the provider API layer
- Implementing offline queueing for when device is offline

## Technical Considerations

- Current architecture uses React state for stream accumulation, then saves on complete
- Custom markdown renderer needs stream-chunk updates (may need debouncing)
- Database writes use Drizzle ORM with SQLite
- Stream comes from AI providers via async generators
- Must maintain compatibility with existing `useChat` hook interface
- AbortController pattern recommended for cancellation

## Success Metrics

- Zero reports of incomplete stream messages in testing
- 100% of completed streams successfully saved to database
- No memory leaks detected during 100+ message stress test
- Stream cancellation responds within 100ms
- All existing tests pass without modification

## Open Questions

- Should partial streams be auto-saved as drafts for recovery?
- What is the expected behavior when app is backgrounded mid-stream?
- Should we add telemetry/logging for stream failure analysis?