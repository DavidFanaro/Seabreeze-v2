# Seabreeze Codebase Cleanup Plan

## Overview

This plan outlines a comprehensive restructuring of the Seabreeze codebase to improve organization, readability, and maintainability while **preserving all existing functionality**.

### Goals
1. Reorganize folder structure (type-based)
2. Add file-level and section comments
3. Split large files into smaller, focused modules
4. Fix known bugs
5. Remove unused code and console.log statements
6. Create `app_overview.md` with architecture map

---

## Phase 1: New Folder Structure

### Current Structure (Problematic)
```
seabreeze/
├── app/           # Routes (good)
├── components/    # 17 mixed components
├── hooks/         # 5 hooks
├── stores/        # 1 file with 2 stores
├── lib/           # Providers + types mixed
├── db/            # Database schema
├── util/          # Mixed utilities + unused files
└── drizzle/       # Migrations
```

### Proposed Structure (Type-Based)
```
seabreeze/
├── app/                          # Expo Router (unchanged)
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── chat/[id].tsx
│   └── settings/
│
├── components/                   # Reorganized by purpose
│   ├── index.ts                  # Barrel exports
│   ├── chat/                     # Chat-specific components
│   │   ├── ChatListItem.tsx
│   │   ├── ChatContextMenu.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   └── ThemedMarkdown.tsx
│   ├── settings/                 # Settings-specific components
│   │   ├── ModelSelector.tsx
│   │   ├── ModelListManager.tsx
│   │   ├── ModelRow.tsx          # NEW: Extracted from ModelListManager
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
│       ├── useChat.ts            # Main orchestrator (slimmed)
│       ├── useChatStreaming.ts   # NEW: Streaming logic extracted
│       └── useTitleGeneration.ts # NEW: Auto-title logic extracted
│
├── stores/                       # Split into separate files
│   ├── index.ts                  # Barrel exports
│   ├── useAuthStore.ts           # NEW: Auth credentials only
│   └── useProviderStore.ts       # NEW: Provider/model selection
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
├── types/                        # NEW: Centralized types
│   ├── index.ts                  # Barrel exports
│   ├── provider.types.ts         # Moved from lib/types/
│   ├── chat.types.ts             # ChatMessage, UseChatOptions, etc.
│   └── store.types.ts            # Store-related types
│
├── lib/                          # Core utilities only
│   ├── polyfills.ts              # Streaming polyfills
│   ├── error-messages.ts         # Error formatting
│   └── constants.ts              # NEW: Magic numbers, config values
│
├── db/                           # Database (unchanged)
│   └── schema.ts
│
├── drizzle/                      # Migrations (unchanged)
│
├── assets/                       # Static assets (unchanged)
│
└── plans/                        # Planning docs
    ├── simple_plan.md            # This file
    └── app_overview.md           # NEW: Architecture map
```

---

## Phase 2: File Operations

### 2.1 Files to DELETE (Unused)
| File | Reason |
|------|--------|
| `util/kvtags.tsx` | Completely unused enums |
| `util/testdata.ts` | Test data never imported |
| `util/types.ts` | `ChatMessage` type unused (app uses `ModelMessage` from `ai` package) |
| `util/` folder | Empty after deletions |

### 2.2 Files to MOVE
| From | To |
|------|-----|
| `lib/types/provider-types.ts` | `types/provider.types.ts` |
| `lib/providers/*.ts` (all 7 files) | `providers/*.ts` |

### 2.3 Files to SPLIT

#### A. `stores/useAIStore.ts` → 2 files
**Current:** Single file with `useAIAuthStore` and `useAIProviderStore`

| New File | Contents |
|----------|----------|
| `stores/useAuthStore.ts` | `useAIAuthStore`, `getProviderAuth()`, `isProviderConfigured()` |
| `stores/useProviderStore.ts` | `useAIProviderStore`, `getDefaultModelForProvider()` |

#### B. `hooks/useChat.ts` → 3 files
**Current:** 545 lines handling streaming, fallback, retry, title generation

| New File | Lines | Contents |
|----------|-------|----------|
| `hooks/chat/useChat.ts` | ~150 | Main orchestrator, state management |
| `hooks/chat/useChatStreaming.ts` | ~200 | `streamText` logic, token handling |
| `hooks/chat/useTitleGeneration.ts` | ~100 | Auto-title generation logic |

#### C. `components/ModelListManager.tsx` → 2 files
**Current:** 619 lines with embedded `ModelRow` component

| New File | Lines | Contents |
|----------|-------|----------|
| `components/settings/ModelListManager.tsx` | ~500 | Main manager component |
| `components/settings/ModelRow.tsx` | ~120 | Extracted row component |

### 2.4 Components to REORGANIZE
| Component | Move To |
|-----------|---------|
| `ChatListItem.tsx` | `components/chat/` |
| `ChatContextMenu.tsx` | `components/chat/` |
| `MessageList.tsx` | `components/chat/` |
| `MessageBubble.tsx` | `components/chat/` |
| `MessageInput.tsx` | `components/chat/` |
| `ThemedMarkdown.tsx` | `components/chat/` |
| `ModelSelector.tsx` | `components/settings/` |
| `ModelListManager.tsx` | `components/settings/` |
| `ProviderSelector.tsx` | `components/settings/` |
| `SettingInput.tsx` | `components/settings/` |
| `GlassButton.tsx` | `components/ui/` |
| `GlassInput.tsx` | `components/ui/` |
| `IconButton.tsx` | `components/ui/` |
| `SaveButton.tsx` | `components/ui/` |
| `ProviderIcons.tsx` | `components/ui/` |
| `ThemeProvider.tsx` | `components/ui/` |

---

## Phase 3: Bug Fixes

### 3.1 Missing Return Statement (Critical)
**File:** `app/_layout.tsx:27-31`

```typescript
// CURRENT (Bug)
if (error) {
    <View>
        <Text>Migration error: {error.message}</Text>
    </View>;
}

// FIXED
if (error) {
    return (
        <View>
            <Text>Migration error: {error.message}</Text>
        </View>
    );
}
```

### 3.2 Unused Variables in Chat Screen
**File:** `app/chat/[id].tsx:45-48`

Currently has eslint-disable comments for `retryLastMessage` and `canRetry`. Options:
- **Option A:** Remove from destructuring if not implementing retry UI
- **Option B:** Implement retry UI button (recommended for better UX)

---

## Phase 4: Code Cleanup

### 4.1 Remove All `console.log` Statements
Files with console.log to clean:
- `hooks/useChat.ts`
- `lib/providers/provider-factory.ts`
- `lib/providers/fallback-chain.ts`
- `stores/useAIStore.ts`
- Various components

### 4.2 Extract Magic Numbers
Create `lib/constants.ts`:
```typescript
// Purpose: Centralized app constants

export const LAYOUT = {
  MESSAGE_LIST_PADDING_TOP: 125,
  // ... other values
} as const;

export const CACHE = {
  PROVIDER_TTL_MS: 5 * 60 * 1000, // 5 minutes
  MAX_CACHED_PROVIDERS: 10,
} as const;
```

---

## Phase 5: Comment Standards

### 5.1 File Header Template
Every file will have a header comment:
```typescript
/**
 * @file ComponentName.tsx
 * @purpose Brief description of what this file does
 * @connects-to List of key dependencies/connections
 */
```

### 5.2 UI Section Comments
Major UI sections will have inline comments:
```typescript
// === Header Section: Navigation and title ===
<View style={styles.header}>
  ...
</View>

// === Main Content: Chat messages display ===
<MessageList ... />

// === Footer Section: Message input ===
<MessageInput ... />
```

### 5.3 Example Commented File
```typescript
/**
 * @file MessageInput.tsx
 * @purpose Text input with glass effect for composing chat messages
 * @connects-to useChat (onSend), ThemeProvider (colors)
 */

import { ... } from 'react-native';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: Props) {
  // === Input State ===
  const [text, setText] = useState('');
  
  // === Send Handler: Validates and sends message ===
  const handleSend = () => { ... };

  return (
    // === Input Container: Glass-styled wrapper ===
    <GlassView style={styles.container}>
      {/* Text Input: Multi-line message composition */}
      <TextInput ... />
      
      {/* Send Button: Triggers message send */}
      <IconButton ... />
    </GlassView>
  );
}
```

---

## Phase 6: App Overview Document

Create `plans/app_overview.md` with:

### 6.1 Architecture Diagram (Text-Based)
```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Chat List  │  │  Chat View   │  │      Settings          │  │
│  │  index.tsx  │  │ chat/[id]    │  │  settings/*.tsx        │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         HOOKS LAYER                             │
│  useDatabase  ←→  useChat  ←→  useChatState  ←→  useHaptic     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         STATE LAYER                             │
│         useAuthStore  ←────→  useProviderStore                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PROVIDER LAYER                            │
│  provider-factory → provider-cache → fallback-chain             │
│         ↓                                                       │
│  apple | openai | openrouter | ollama                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                            │
│              Drizzle ORM → SQLite (expo-sqlite)                 │
│              chat table: id, title, messages, provider...       │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Node Connection Map
Will document every file and its dependencies in a structured format.

---

## Execution Order

### Step 1: Setup (Safe)
- [ ] Create new folder structure (empty folders)
- [ ] Create barrel export files (index.ts)
- [ ] Create `lib/constants.ts`

### Step 2: Types Consolidation
- [ ] Create `types/` folder with all type definitions
- [ ] Update imports across codebase

### Step 3: Move Files
- [ ] Move providers to `providers/`
- [ ] Move components to subfolders
- [ ] Update all import paths

### Step 4: Split Files
- [ ] Split `useAIStore.ts` → `useAuthStore.ts` + `useProviderStore.ts`
- [ ] Split `useChat.ts` → 3 files
- [ ] Extract `ModelRow` from `ModelListManager.tsx`

### Step 5: Bug Fixes
- [ ] Fix missing return in `_layout.tsx`
- [ ] Address unused variables

### Step 6: Cleanup
- [ ] Remove `util/` folder and unused files
- [ ] Remove all `console.log` statements
- [ ] Extract magic numbers to constants

### Step 7: Documentation
- [ ] Add file header comments to all files
- [ ] Add UI section comments
- [ ] Create `app_overview.md`

### Step 8: Verification
- [ ] Run `npm run typecheck`
- [ ] Run `npm run lint`
- [ ] Test app functionality manually

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking imports | Update all imports immediately after each move |
| State management break | Test auth/provider stores independently after split |
| Streaming breaks | Test chat functionality after useChat split |
| Type errors | Run typecheck after each major change |

---

## Estimated Timeline

| Phase | Duration |
|-------|----------|
| Phase 1-3 (Structure + Moves + Bugs) | ~2-3 hours |
| Phase 4 (Cleanup) | ~1 hour |
| Phase 5 (Comments) | ~2-3 hours |
| Phase 6 (Documentation) | ~1 hour |
| Verification | ~30 min |
| **Total** | **~7-8 hours** |

---

## Clarification Decisions (Confirmed)

1. **Retry UI:** IMPLEMENT - Add retry button using `canRetry` and `retryLastMessage`
2. **General Settings:** ADD ACTUAL SETTINGS - Theme toggle, haptic feedback, etc.
3. **Provider Tests:** IMPLEMENT REAL TESTS - Actually call the API to verify connection

---

## Phase 7: New Feature Implementations

### 7.1 Retry UI Implementation

**Location:** `app/chat/[id].tsx` and new `components/chat/RetryBanner.tsx`

**Design:**
- Show retry banner below failed message when `canRetry` is true
- Include "Retry" button that calls `retryLastMessage()`
- Show error context from the failed attempt
- Auto-dismiss on successful retry

**Component Structure:**
```typescript
/**
 * @file RetryBanner.tsx
 * @purpose Displays retry option when AI response fails
 * @connects-to useChat (retryLastMessage, canRetry)
 */

interface RetryBannerProps {
  canRetry: boolean;
  onRetry: () => void;
  errorMessage?: string;
}

export function RetryBanner({ canRetry, onRetry, errorMessage }: RetryBannerProps) {
  if (!canRetry) return null;
  
  return (
    // === Retry Container: Glass-styled error banner ===
    <GlassView style={styles.container}>
      {/* Error Text: Brief failure explanation */}
      <Text style={styles.errorText}>
        {errorMessage || 'Message failed to send'}
      </Text>
      
      {/* Retry Button: Triggers retry attempt */}
      <GlassButton 
        title="Retry" 
        onPress={onRetry}
        icon="arrow.clockwise"
      />
    </GlassView>
  );
}
```

**Integration in chat/[id].tsx:**
```typescript
// Remove eslint-disable comments, use the props:
const { retryLastMessage, canRetry, error } = useChat(...);

// Add after MessageList:
<RetryBanner 
  canRetry={canRetry} 
  onRetry={retryLastMessage}
  errorMessage={error?.message}
/>
```

---

### 7.2 General Settings Implementation

**Location:** `app/settings/general.tsx`

**Settings to Add:**

| Setting | Type | Storage | Default |
|---------|------|---------|---------|
| Theme | Toggle (Light/Dark/System) | SecureStore | Dark |
| Haptic Feedback | Boolean | SecureStore | true |
| Auto-generate Titles | Boolean | SecureStore | true |
| Message Font Size | Slider (12-24) | SecureStore | 16 |
| Clear All Chats | Action Button | N/A | N/A |

**Store Addition** (`stores/useSettingsStore.ts` - NEW):
```typescript
/**
 * @file useSettingsStore.ts
 * @purpose Global app settings persistence
 * @connects-to SecureStore, ThemeProvider
 */

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  hapticEnabled: boolean;
  autoGenerateTitles: boolean;
  messageFontSize: number;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      hapticEnabled: true,
      autoGenerateTitles: true,
      messageFontSize: 16,
      
      setTheme: (theme) => set({ theme }),
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
      setAutoGenerateTitles: (enabled) => set({ autoGenerateTitles: enabled }),
      setMessageFontSize: (size) => set({ messageFontSize: size }),
    }),
    { name: 'settings-storage', storage: createSecureStorage() }
  )
);
```

**UI Layout:**
```typescript
/**
 * @file general.tsx
 * @purpose App-wide settings configuration
 * @connects-to useSettingsStore, ThemeProvider, useDatabase
 */

export default function GeneralSettings() {
  const { theme, setTheme, hapticEnabled, setHapticEnabled, ... } = useSettingsStore();
  const db = useDatabase();
  
  return (
    <SafeAreaView>
      {/* === Theme Section === */}
      <SettingSection title="Appearance">
        <SegmentedControl
          values={['Light', 'Dark', 'System']}
          selectedIndex={...}
          onChange={...}
        />
      </SettingSection>
      
      {/* === Behavior Section === */}
      <SettingSection title="Behavior">
        <SettingRow label="Haptic Feedback" value={hapticEnabled} onToggle={setHapticEnabled} />
        <SettingRow label="Auto-generate Titles" value={autoGenerateTitles} onToggle={...} />
        <SliderSetting label="Font Size" value={messageFontSize} min={12} max={24} />
      </SettingSection>
      
      {/* === Data Section === */}
      <SettingSection title="Data">
        <DangerButton title="Clear All Chats" onPress={handleClearChats} />
      </SettingSection>
    </SafeAreaView>
  );
}
```

**New Components Needed:**
- `components/settings/SettingSection.tsx` - Section wrapper with title
- `components/settings/SettingRow.tsx` - Toggle row item
- `components/settings/SliderSetting.tsx` - Slider with label
- `components/ui/DangerButton.tsx` - Red destructive action button

---

### 7.3 Real Provider Connection Tests

**Current Problem:**
Test functions just create the model instance but never actually call the API.

**Solution:**
Make a minimal API call to verify credentials work.

#### OpenAI (`providers/openai-provider.ts`):
```typescript
/**
 * Tests OpenAI connection by listing available models
 * @returns true if API key is valid and connection works
 */
export async function testOpenAIConnection(apiKey: string): Promise<boolean> {
  try {
    // Actually call the API to verify credentials
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Invalid API key');
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
```

#### OpenRouter (`providers/openrouter-provider.ts`):
```typescript
/**
 * Tests OpenRouter connection by fetching available models
 * @returns true if API key is valid and connection works
 */
export async function testOpenRouterConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

#### Ollama (`providers/ollama-provider.ts`):
```typescript
/**
 * Tests Ollama connection by checking server health
 * @returns true if Ollama server is reachable
 */
export async function testOllamaConnection(baseUrl: string): Promise<boolean> {
  try {
    const normalizedUrl = normalizeOllamaUrl(baseUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Use /api/tags endpoint which lists models (proves server is running)
    const response = await fetch(`${normalizedUrl}/api/tags`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

#### Apple Intelligence (`providers/apple-provider.ts`):
```typescript
/**
 * Tests Apple Intelligence availability
 * @returns true if device supports Apple Intelligence
 */
export async function testAppleIntelligence(): Promise<boolean> {
  try {
    // Check if the native module is available
    const AppleAI = require('@react-native-ai/apple');
    return AppleAI.isAvailable?.() ?? false;
  } catch (error) {
    return false;
  }
}
```

---

## Updated Execution Order

### Step 1: Setup (Safe)
- [ ] Create new folder structure (empty folders)
- [ ] Create barrel export files (index.ts)
- [ ] Create `lib/constants.ts`

### Step 2: Types Consolidation
- [ ] Create `types/` folder with all type definitions
- [ ] Update imports across codebase

### Step 3: Move Files
- [ ] Move providers to `providers/`
- [ ] Move components to subfolders
- [ ] Update all import paths

### Step 4: Split Files
- [ ] Split `useAIStore.ts` → `useAuthStore.ts` + `useProviderStore.ts`
- [ ] Split `useChat.ts` → 3 files
- [ ] Extract `ModelRow` from `ModelListManager.tsx`

### Step 5: Bug Fixes
- [ ] Fix missing return in `_layout.tsx`

### Step 6: New Features
- [ ] Create `RetryBanner.tsx` component
- [ ] Integrate retry UI in `chat/[id].tsx`
- [ ] Create `useSettingsStore.ts`
- [ ] Implement general settings UI with all settings
- [ ] Create new settings components (SettingSection, SettingRow, etc.)
- [ ] Implement real connection tests for all providers

### Step 7: Cleanup
- [ ] Remove `util/` folder and unused files
- [ ] Remove all `console.log` statements
- [ ] Extract magic numbers to constants

### Step 8: Documentation
- [ ] Add file header comments to all files
- [ ] Add UI section comments
- [ ] Create `app_overview.md`

### Step 9: Verification
- [ ] Run `npm run typecheck`
- [ ] Run `npm run lint`
- [ ] Test app functionality manually
- [ ] Test retry UI with network errors
- [ ] Test all provider connection tests
- [ ] Test settings persistence

---

## Updated Estimated Timeline

| Phase | Duration |
|-------|----------|
| Phase 1-3 (Structure + Moves + Bugs) | ~2-3 hours |
| Phase 4 (Cleanup) | ~1 hour |
| Phase 5 (Comments) | ~2-3 hours |
| Phase 6 (Documentation) | ~1 hour |
| **Phase 7 (New Features)** | **~3-4 hours** |
| Verification | ~1 hour |
| **Total** | **~10-12 hours**


When complete
- Test everyting
- Output: <promise>COMPLETE</promise>
