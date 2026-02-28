# Layout and Navigation

This document covers the screen structure, navigation behavior, and layout boundaries in Seabreeze.

## Screen Structure

Seabreeze uses **Expo Router** with a Stack-based navigation model. The app has the following screen hierarchy:

```
Root Layout (app/_layout.tsx)
├── Home / Chat List (app/index.tsx)
│   └── Chat Screen (app/chat/[id].tsx)
└── Settings (app/settings/)
    ├── Settings Index (app/settings/index.tsx)
    ├── Provider Settings
    │   ├── Apple (app/settings/apple.tsx)
    │   ├── OpenAI (app/settings/openai.tsx)
    │   ├── OpenRouter (app/settings/openrouter.tsx)
    │   └── Ollama (app/settings/ollama.tsx)
    └── Appearance (app/settings/appearance.tsx)
```

## Navigation Behavior

### Stack Navigation

The app uses React Navigation's **Stack Navigator** as the root navigation container. All screens are presented as cards with slide-from-right animation.

**Root Layout (`app/_layout.tsx`):**
- Initializes all global providers (Theme, Query, Database, Keyboard, Gesture)
- Runs database migrations before rendering any navigation content
- Provides theme-aware navigation colors via `ThemeContext`

### Screen Configurations

| Screen | Route | Presentation | Options |
|--------|-------|--------------|---------|
| Home | `index` | Default | `freezeOnBlur: true` preserves state when switching apps |
| Chat | `chat/[id]` | Default | Dynamic title based on chat |
| Settings Index | `settings/index` | Card | Modal-like appearance |
| Provider Settings | `settings/{provider}` | Card | Individual provider config |
| Appearance | `settings/appearance` | Card | Theme preferences |

### Key Navigation Patterns

1. **Dynamic Chat Routes**: Chat screen uses `[id].tsx` dynamic route. Special value `"new"` creates a new chat session.

2. **Settings Navigation**: Each provider has its own route under `/settings/{providerId}`.

3. **Back Navigation**: 
   - iOS: Swipe gesture or back button
   - Android: Hardware back button

## Layout Boundaries

### Provider Hierarchy

The root layout establishes the following provider boundaries (outer to inner):

```
GestureHandlerRootView
  └── HeroUINativeProvider
        └── ThemeProvider (dark default)
              └── HeroUIThemeProvider
                    └── Suspense
                          └── SQLiteProvider (database)
                                └── DatabaseGate
                                      └── NavigationContent
                                            └── QueryClientProvider
                                                  └── ThemeContext
                                                        └── KeyboardProvider
                                                              └── Stack Navigator
```

### Database Gate Pattern

`DatabaseGate` in `_layout.tsx` ensures migrations run before any screen renders:

1. Attempts database migrations on mount
2. Shows loading state ("Running migrations...") during migration
3. Shows error state if migrations fail
4. Only renders `NavigationContent` after successful migration

### Theme Integration

The app uses a dual-theme system:

1. **App Theme**: Managed by `ThemeProvider` - defines colors for background, text, accent, etc.
2. **Navigation Theme**: Derived from app theme, passed to React Navigation via `ThemeContext`

Navigation theme colors map to app theme:
- `primary` → `theme.colors.accent`
- `background` → `theme.colors.background`
- `text` → `theme.colors.text`
- `border` → `theme.colors.border`

### Safe Area Handling

- Chat screen uses `useSafeAreaInsets()` for keyboard-related padding
- Settings screens use `SafeAreaView` wrapper
- Header uses `headerTransparent: true` to blend with app background

## Route Parameters

### Chat Route (`/chat/[id]`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Chat database ID, or `"new"` for new chat |

### Settings Routes

Provider routes accept no parameters - configuration is managed via global state stores.

## Layout Components

### Key UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ChatListItem` | `components/chat/` | Individual chat preview in list |
| `MessageList` | `components/chat/` | Scrollable message display |
| `MessageInput` | `components/chat/` | Text input with attachment support |
| `IconButton` | `components/ui/` | Reusable icon button for headers |
| `ThemeProvider` | `components/ui/` | Global theme context |
| `ProviderSelector` | `components/settings/` | Provider selection UI |

### Header Configuration

Headers are configured per-screen using `Stack.Screen options`:

```tsx
<Stack.Screen
  options={{
    title: "Chats",                    // Header title
    headerTransparent: true,           // Blend with app background
    headerTintColor: theme.colors.text,
    headerRight: () => <IconButton />, // Right action button
    headerLeft: () => <IconButton />, // Left action button
  }}
/>
```

## Screen Lifecycle

### Home Screen (`app/index.tsx`)

1. **Mount**: Live query fetches all chats from database
2. **Focus**: Updates `isScreenFocused` state for optimization
3. **Refresh**: Pull-to-refresh triggers explicit re-fetch
4. **Unmount**: No cleanup required (live query auto-unsubscribes)

### Chat Screen (`app/chat/[id].tsx`)

1. **Mount**: 
   - If `id === "new"`: Initialize empty chat state
   - If `id` is numeric: Load existing chat from database (hydration)
2. **Message Send**: Streams AI response, auto-saves after completion
3. **Navigation Away**: State preserved (Stack with `freezeOnBlur: false`)
4. **Chat Switch**: Reset hydrated state, load new chat data

### Settings Screens

1. **Mount**: Load provider configuration from secure storage
2. **Change**: Update store and persist to secure storage
3. **Navigate Away**: Changes auto-persist via store subscriptions

## Error Boundaries

### Chat Hydration Errors

If chat data fails to load, displays `RetrievalRecoveryView` with retry option. The chat remains functional but shows error message.

### Save Errors

Message persistence failures show `SaveErrorBanner` with retry option. Errors are retried automatically with exponential backoff.

## Change Guide

### Adding a New Screen

1. Create route file in `app/` directory (e.g., `app/new-screen.tsx`)
2. Add screen configuration in `app/_layout.tsx`:
   ```tsx
   <Stack.Screen
     name="new-screen"
     options={{ presentation: "card" }}
   />
   ```
3. Configure header options within the screen component

### Modifying Navigation Behavior

- **Screen transitions**: Modify `presentation` in `Stack.Screen` options
- **Header style**: Configure in individual screen components
- **Global navigation theme**: Modify `NavigationContent` in `_layout.tsx`

### Adding Provider Settings

1. Create route file: `app/settings/{provider-id}.tsx`
2. Add screen config in `_layout.tsx`
3. Add navigation entry in `app/settings/index.tsx`

## Related

- [Feature Flows](./feature-flows.md) - User journeys and UI state transitions
- [Architecture Overview](../architecture/overview.md) - System architecture
- [Codebase Map](../architecture/codebase-map.md) - File locations and ownership
