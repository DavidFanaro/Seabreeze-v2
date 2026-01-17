# Seabreeze - Unwind Migration Plan

## Overview
Migrate Seabreeze from custom inline styles/StyleSheet to Unwind (Tailwind 4 for React Native).

**Current State:**
- Custom ThemeProvider with JavaScript-based themes (light/dark)
- Inline styles with theme values (theme.colors, theme.spacing, theme.borderRadius)
- StyleSheet.create for static styles
- expo-glass-effect for glassmorphism
- ~70+ TS/TSX files with mixed styling approaches

**Target State:**
- Unwind free version (MIT-licensed)
- Tailwind 4 utility classes
- Built-in light/dark/system themes
- CSS-based theming
- No expo-glass-effect
- Full className-based styling

## User Preferences
- ✅ Full Tailwind classes migration (replace all inline styles/StyleSheet)
- ✅ Use Tailwind defaults (not custom theme values)
- ✅ Remove expo-glass-effect completely
- ✅ Free version only (no Pro)

---

## Phase 1: Installation & Setup

### 1.1 Install Dependencies
```bash
bun add uniwind tailwindcss
bun remove expo-glass-effect
```

### 1.2 Create Global CSS
Create `global.css` in project root:

```css
@import 'tailwindcss';
@import 'uniwind';
```

**Why root directory:** Tailwind scans for classNames starting from global.css location. Root placement ensures all components are discovered.

### 1.3 Import Global CSS in Root Layout
Update `app/_layout.tsx`:

```tsx
import '@/lib/polyfills';
import './global.css'; // <-- Add this import
import { Stack } from 'expo-router';
// ... rest of imports
```

**Important:** Don't import in index.ts entry file - prevents hot reload.

### 1.4 Configure Metro Bundler
Update `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Preserve existing SQL extension
config.resolver.sourceExts.push('sql');

// Wrap entire config with Unwind
module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts'
});
```

**Critical:** `withUniwindConfig` must be outermost wrapper.

### 1.5 Configure Tailwind IntelliSense (VSCode)
Update `.vscode/settings.json`:

```json
{
  "tailwindCSS.classAttributes": [
    "class",
    "className",
    "headerClassName",
    "contentContainerClassName",
    "columnWrapperClassName",
    "endFillColorClassName",
    "imageClassName",
    "tintColorClassName",
    "ios_backgroundColorClassName",
    "thumbColorClassName",
    "trackColorOnClassName",
    "trackColorOffClassName",
    "selectionColorClassName",
    "cursorColorClassName",
    "underlineColorAndroidClassName",
    "placeholderTextColorClassName",
    "selectionHandleColorClassName",
    "colorsClassName",
    "progressBackgroundColorClassName",
    "titleColorClassName",
    "underlayColorClassName",
    "colorClassName",
    "drawerBackgroundColorClassName",
    "statusBarBackgroundColorClassName",
    "backdropColorClassName",
    "backgroundColorClassName",
    "ListFooterComponentClassName",
    "ListHeaderComponentClassName"
  ],
  "tailwindCSS.classFunctions": [
    "useResolveClassNames"
  ]
}
```

### 1.6 TypeScript Configuration
Add to `tsconfig.json` if not already including root:

```json
{
  "include": [
    "uniwind-types.d.ts",
    // ... other includes
  ]
}
```

### 1.7 Generate Types
Start Metro bundler to auto-generate TypeScript types:

```bash
npm run start
```

Wait until `uniwind-types.d.ts` is generated in project root.

---

## Phase 2: Theme Migration Strategy

### 2.1 Theme System Replacement
**Remove:** Custom ThemeProvider (components/ui/ThemeProvider.tsx)
**Use:** Unwind's built-in theme system

Unwind provides:
- `light` theme
- `dark` theme
- `system` theme (follows device preferences)

### 2.2 Tailwind 4 Default Values
Current custom theme values will be replaced with Tailwind 4 defaults:

**Colors:**
- Background: `bg-white dark:bg-gray-950`
- Surface: `bg-gray-50 dark:bg-gray-900`
- Text: `text-gray-900 dark:text-gray-100`
- Text Secondary: `text-gray-500 dark:text-gray-400`
- Accent: `text-blue-500` (or use brand colors)
- Border: `border-gray-200 dark:border-gray-800`

**Spacing:**
- xs: 4px → `space-1`
- sm: 8px → `space-2`
- md: 16px → `space-4`
- lg: 24px → `space-6`
- xl: 32px → `space-8`

**Border Radius:**
- sm: 8px → `rounded-lg`
- md: 12px → `rounded-xl`
- lg: 20px → `rounded-2xl`
- full: 9999px → `rounded-full`

### 2.3 Theme Switching
Replace custom theme logic with Unwind:

```tsx
import { Uniwind, useUniwind } from 'uniwind';

// Get current theme
const { theme, hasAdaptiveThemes } = useUniwind();

// Switch themes programmatically
Uniwind.setTheme('dark'); // or 'light', 'system'
```

### 2.4 Remove ThemeProvider
Delete: `components/ui/ThemeProvider.tsx`
Update imports throughout codebase:
```tsx
// Before
import { useTheme } from '@/components/ui/ThemeProvider';

// After
import { useUniwind } from 'uniwind';
```

---

## Phase 3: Component Migration

### 3.1 Migration Pattern
For each component, replace:
1. `theme.colors.*` → Tailwind color classes with dark variants
2. `theme.spacing.*` → Tailwind spacing classes
3. `theme.borderRadius.*` → Tailwind rounded classes
4. Inline style objects → className props
5. StyleSheet.create → Remove, use classNames instead
6. GlassView → Regular View with optional backdrop-blur

### 3.2 Component Migration Order

#### Priority 1: Core UI Components (Foundation)
1. `components/ui/IconButton.tsx`
2. `components/ui/GlassButton.tsx` → Rename to Button.tsx, remove glass
3. `components/ui/GlassInput.tsx` → Rename to Input.tsx, remove glass
4. `components/ui/ThemeProvider.tsx` → DELETE

#### Priority 2: Chat Components (Core Feature)
5. `components/chat/MessageBubble.tsx`
6. `components/chat/MessageInput.tsx`
7. `components/chat/MessageList.tsx`
8. `components/chat/ChatListItem.tsx`
9. `components/chat/ThemedMarkdown.tsx`
10. `components/chat/RetryBanner.tsx`
11. `components/chat/ChatContextMenu.tsx`

#### Priority 3: Settings Components
12. `components/settings/ProviderSelector.tsx`
13. `components/settings/ModelSelector.tsx`
14. `components/settings/ModelRow.tsx`
15. `components/settings/ModelListManager.tsx`
16. `components/settings/SettingInput.tsx`
17. `components/ui/ProviderIcons.tsx`

#### Priority 4: Screens (Pages)
18. `app/_layout.tsx` (theme-related)
19. `app/index.tsx`
20. `app/chat/[id].tsx`
21. `app/settings/index.tsx`
22. `app/settings/openai.tsx`
23. `app/settings/openrouter.tsx`
24. `app/settings/ollama.tsx`
25. `app/settings/apple.tsx`
26. `app/settings/general.tsx`

### 3.3 Detailed Migration Examples

#### Example 1: IconButton (components/ui/IconButton.tsx)

**Before:**
```tsx
export const IconButton: React.FC<IconButtonProps> = ({
    icon,
    onPress,
    size = 26,
    color,
    style,
    disabled = false,
}) => {
    const { theme } = useTheme();
    const { triggerPress } = useHapticFeedback();
    const iconColor = color ?? theme.colors.text;

    const handlePress = () => {
        triggerPress("light");
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.7}
            style={[
                {
                    opacity: disabled ? 0.5 : 1,
                },
                style,
            ]}
        >
            <SymbolView
                style={{
                    width: size,
                    height: size,
                }}
                name={icon as any}
                size={size}
                tintColor={iconColor}
            />
        </TouchableOpacity>
    );
};
```

**After:**
```tsx
import { useUniwind } from 'uniwind';

export const IconButton: React.FC<IconButtonProps> = ({
    icon,
    onPress,
    size = 26,
    color,
    className = '',
    disabled = false,
}) => {
    const { theme } = useUniwind();
    const { triggerPress } = useHapticFeedback();
    const iconColor = color ?? (theme === 'dark' ? '#ffffff' : '#000000');

    const handlePress = () => {
        triggerPress("light");
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.7}
            className={`active:opacity-70 ${disabled ? 'opacity-50' : ''} ${className}`}
        >
            <SymbolView
                className={`w-[${size}px] h-[${size}px]`}
                name={icon as any}
                size={size}
                tintColor={iconColor}
            />
        </TouchableOpacity>
    );
};
```

#### Example 2: MessageBubble (components/chat/MessageBubble.tsx)

**Before:**
```tsx
if (isUser) {
    return (
        <View
            style={[
                {
                    alignItems: "flex-end",
                    paddingHorizontal: theme.spacing.md,
                    marginVertical: theme.spacing.xs,
                },
                style,
            ]}
        >
            <GlassView
                isInteractive
                style={{
                    borderRadius: theme.borderRadius.lg,
                    maxWidth: "85%",
                }}
            >
                <Text
                    selectable
                    style={{
                        color: theme.colors.text,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm + 4,
                        fontSize: 16,
                        lineHeight: 22,
                    }}
                >
                    {content}
                </Text>
            </GlassView>
        </View>
    );
}
```

**After:**
```tsx
if (isUser) {
    return (
        <View
            className={`items-end px-4 my-2 ${className}`}
        >
            <View className="rounded-2xl max-w-[85%]">
                <Text
                    selectable
                    className="text-gray-900 dark:text-gray-100 px-4 py-3 text-base leading-[22px]"
                >
                    {content}
                </Text>
            </View>
        </View>
    );
}
```

#### Example 3: ChatListItem (simplified)

**Before:**
```tsx
<View
    style={{
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        minHeight: 75,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.glass,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    }}
>
```

**After:**
```tsx
<View
    className="
        p-4 rounded-2xl min-h-[75px] justify-center
        border border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800
        shadow-md dark:shadow-lg
    "
>
```

#### Example 4: GlassButton → Button

**Before (GlassButton.tsx):**
```tsx
<GlassView isInteractive style={[{ backgroundColor: getBackgroundColor(), paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.lg, alignItems: 'center', justifyContent: 'center', minHeight: 44 }, style]}>
    <Text style={[{ color: getTextColor(), fontSize: 16, fontWeight: '600' }, textStyle]}>
        {title}
    </Text>
</GlassView>
```

**After (Button.tsx - renamed, no glass):**
```tsx
<View
    className={`
        ${variant === 'primary' ? 'bg-blue-500' : ''}
        ${variant === 'secondary' ? 'bg-transparent' : ''}
        ${variant === 'danger' ? 'bg-red-500' : ''}
        ${disabled ? 'bg-gray-200 dark:bg-gray-800' : ''}
        py-2 px-4 rounded-xl items-center justify-center min-h-[44px]
        ${className}
    `}
>
    <Text
        className={`
            ${disabled ? 'text-gray-500' : ''}
            ${variant === 'secondary' ? 'text-blue-500' : 'text-white'}
            text-base font-semibold
        `}
    >
        {title}
    </Text>
</View>
```

---

## Phase 4: Screen-Level Migration

### 4.1 App Layout (_layout.tsx)

**Before:**
```tsx
<ThemeProvider defaultTheme="dark">
    <ThemeContext value={DarkTheme}>
        {/* app content */}
    </ThemeContext>
</ThemeProvider>
```

**After:**
```tsx
import './global.css';
import { Uniwind } from 'uniwind';

// Set initial theme
Uniwind.setTheme('dark');

<GestureHandlerRootView style={{ flex: 1 }}>
    <Suspense fallback={<Text>Loading</Text>}>
        <SQLiteProvider>
            <KeyboardProvider>
                <Stack>
                    {/* screens */}
                </Stack>
            </KeyboardProvider>
        </SQLiteProvider>
    </Suspense>
</GestureHandlerRootView>
```

### 4.2 Root Theme Application
Wrap root layout with theme classes:

```tsx
<View className="flex-1 bg-white dark:bg-gray-950">
```

---

## Phase 5: Conditional Styling Migration

### 5.1 Pressable States
Replace dynamic style objects with conditional classNames:

**Before:**
```tsx
<Pressable
    style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? theme.colors.surface : theme.colors.background }
    ]}
>
```

**After:**
```tsx
<Pressable
    className={({ pressed }) => `
        ${pressed ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-950'}
    `}
>
```

### 5.2 Theme-Aware Values
For values that need to vary by theme, use dark variants:

**Before:**
```tsx
backgroundColor: themeType === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.7)'
```

**After:**
```tsx
className="bg-white/70 dark:bg-black/80"
```

### 5.3 Dynamic Spacing
For dynamic spacing calculations, use arbitrary values:

**Before:**
```tsx
paddingVertical: theme.spacing.sm + 4
```

**After:**
```tsx
className="py-[12px]" // 8px + 4px = 12px
```

---

## Phase 6: Third-Party Integration

### 6.1 Remove expo-glass-effect
No migration needed - replacing with regular Views.

### 6.2 react-native-gesture-handler
Works seamlessly with Unwind - no changes needed.

### 6.3 react-native-reanimated
For animations, keep using `style` prop for animated values:

**Before:**
```tsx
<Animated.View
    style={{
        transform: [{ scale: scaleValue }],
        opacity: fadeValue,
    }}
>
```

**After:** (no change - animations still use style prop)
```tsx
<Animated.View
    className="transform"
    style={{
        transform: [{ scale: scaleValue }],
        opacity: fadeValue,
    }}
>
```

---

## Phase 7: Testing & Validation

### 7.1 Visual Regression Testing
Test in both light and dark themes:
```tsx
// Temporarily toggle theme for testing
Uniwind.setTheme('light');
Uniwind.setTheme('dark');
Uniwind.setTheme('system');
```

### 7.2 Platform Testing
Test on:
- iOS
- Android
- Web

### 7.3 Component Testing Checklist
For each migrated component:
- [ ] Renders without errors
- [ ] Light theme works
- [ ] Dark theme works
- [ ] Platform-specific styles (if any)
- [ ] Press states work
- [ ] Disabled states work
- [ ] Animations still work
- [ ] Accessibility labels preserved

---

## Phase 8: Post-Migration Cleanup

### 8.1 Remove Unused Code
Delete files:
- `components/ui/ThemeProvider.tsx`
- `components/ui/GlassButton.tsx` (replaced by Button.tsx)
- `components/ui/GlassInput.tsx` (replaced by Input.tsx)
- `components/ui/index.ts` (update exports)

Remove from package.json:
- `expo-glass-effect`

### 8.2 Update Type Definitions
Remove theme-related types from:
- `types/index.ts`
- Any files referencing custom Theme interface

### 8.3 Update Documentation
Update AGENTS.md to reflect Unwind usage.

### 8.4 Verify Dependencies
```bash
npm run lint
npm run typecheck
```

---

## Implementation Timeline

### Week 1: Setup & Foundation
- Day 1-2: Installation and configuration (Phase 1)
- Day 3-4: Core UI components (Priority 1)
- Day 5: Testing core components

### Week 2: Chat Components
- Day 1-3: Chat components migration (Priority 2)
- Day 4: Settings components (Priority 3)
- Day 5: Testing chat flow

### Week 3: Screens & Finalization
- Day 1-2: Screen migration (Priority 4)
- Day 3: End-to-end testing
- Day 4: Platform testing (iOS, Android, Web)
- Day 5: Cleanup and final validation

---

## Risk Assessment & Mitigation

### Risk 1: Visual Inconsistency
**Mitigation:** Start with isolated components, test thoroughly before screen-level changes. Keep screenshots of before/after for comparison.

### Risk 2: Theme State Loss
**Mitigation:** Unwind provides built-in theme persistence. Test theme switching thoroughly across app sessions.

### Risk 3: Build Errors
**Mitigation:** Ensure Metro bundler is running to generate types. Clear cache if issues persist: `npm start -- --clear-cache`

### Risk 4: Performance Regression
**Mitigation:** Unwind free version is on par with Unistyles 3.0, faster than current inline styles. Profile if needed.

### Risk 5: Missing ClassNames
**Mitigation:** Tailwind IntelliSense configuration helps. Test thoroughly, check console for warnings.

---

## Rollback Plan

If migration encounters critical issues:

1. Revert `metro.config.js` to original
2. Restore `ThemeProvider.tsx` from git
3. Restore component files from git
4. Remove Unwind dependencies: `bun remove uniwind tailwindcss`
5. Reinstall expo-glass-effect: `bun add expo-glass-effect`

---

## Success Criteria

- [ ] All components use className props
- [ ] No inline styles or StyleSheet.create remaining (except for animations)
- [ ] ThemeProvider removed
- [ ] expo-glass-effect removed
- [ ] All TypeScript errors resolved
- [ ] App works in light, dark, and system themes
- [ ] App works on iOS, Android, and Web
- [ ] All features functional (chat, settings, etc.)
- [ ] No performance regressions
- [ ] Linting passes
- [ ] Type checking passes

---

## Resources

- [Unwind Documentation](https://docs.uniwind.dev/)
- [Unwind GitHub](https://github.com/uni-stack/uniwind)
- [Tailwind 4 Docs](https://tailwindcss.com/docs/installation)
- [Migration from Nativewind](https://docs.uniwind.dev/migration-from-nativewind)

---

## Notes

- Unwind free version is MIT-licensed and production-ready
- Can upgrade to Pro later if performance needs arise (no code changes needed)
- Tailwind 4 uses 16px as default rem (different from Tailwind 3's 4px)
- Unwind automatically handles React Native's flexbox defaults
- Platform variants: `ios:`, `android:`, `web:` for platform-specific styles
- Safe area classes: `pt-safe`, `pb-safe`, etc. (if needed)
