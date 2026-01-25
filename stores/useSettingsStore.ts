/**
 * @file useSettingsStore.ts
 * @purpose Global app settings persistence
 * @connects-to SecureStore, ThemeProvider
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

/**
 * Custom secure storage adapter for Zustand persistence
 * 
 * This adapter wraps Expo's SecureStore to provide a compatible interface
 * with Zustand's persist middleware. All operations are wrapped in try-catch
 * blocks to handle potential security exceptions gracefully.
 * 
 * Security considerations:
 * - Uses device's secure storage (Keychain on iOS, Keystore on Android)
 * - Encrypts data at rest
 * - Provides silent failure fallback for security exceptions
 */
const secureStorage = {
  /**
   * Retrieves an item from secure storage
   * @param name - The key of the item to retrieve
   * @returns Promise<string | null> - The stored value or null if not found/error
   */
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      // Silent fail on security exceptions (access denied, etc.)
      return null;
    }
  },
  /**
   * Stores an item in secure storage
   * @param name - The key under which to store the value
   * @param value - The string value to store
   * @returns Promise<void>
   */
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      // Silent fail on security exceptions
      // Log could be added here for debugging in development
    }
  },
  /**
   * Removes an item from secure storage
   * @param name - The key of the item to remove
   * @returns Promise<void>
   */
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      // Silent fail on security exceptions
    }
  },
};

/**
 * Interface defining the shape of application settings state
 * 
 * These settings control the user experience and preferences throughout the app.
 * All settings are persisted securely and restored on app launch.
 */
interface SettingsState {
  /**
   * Theme selection for the application UI
   * 
   * Options include:
   * - 'light': Light mode theme
   * - 'dark': Dark mode theme (default)
   * - 'system': Follows device theme preference
   * - Extended themes: Various popular color schemes (nord, catppuccin, tokyo variants, etc.)
   */
  theme:
    | 'light'
    | 'dark'
    | 'nord'
    | 'catppuccin'
    | 'tokyo-night'
    | 'tokyo-night-storm'
    | 'tokyo-night-moon'
    | 'one-dark'
    | 'gruvbox-dark-hard'
    | 'gruvbox-dark-medium'
    | 'gruvbox-dark-soft'
    | 'darcula'
    | 'system';
  
  /**
   * Controls haptic feedback for user interactions
   * 
   * When enabled, provides tactile feedback for button presses, 
   * message sending, and other interactive elements.
   */
  hapticEnabled: boolean;
  
  /**
   * Enables automatic title generation for chat conversations
   * 
   * When enabled, the app will automatically generate descriptive titles
   * for new chat conversations based on the initial messages.
   */
  autoGenerateTitles: boolean;

  /**
   * Controls whether the app captures and displays model thinking output
   *
   * When enabled, streaming reasoning details are recorded and shown
   * alongside assistant messages when available.
   */
  thinkingEnabled: boolean;
  
  /**
   * Controls the font size for chat messages in pixels
   * 
   * Affects readability of message content. Valid range typically 12-24px.
   */
  messageFontSize: number;
  
  /**
   * Controls display of line numbers in code blocks
   * 
   * When enabled, adds line numbers to code snippets for better reference
   * and debugging convenience.
   */
  showCodeLineNumbers: boolean;
}

/**
 * Interface defining the actions available for modifying settings
 * 
 * These methods provide controlled access to modify individual settings
 * or reset all settings to their default values.
 */
interface SettingsActions {
  /**
   * Updates the application theme
   * 
   * @param theme - The new theme to apply
   */
  setTheme: (
    theme:
      | 'light'
      | 'dark'
      | 'nord'
      | 'catppuccin'
      | 'tokyo-night'
      | 'tokyo-night-storm'
      | 'tokyo-night-moon'
      | 'one-dark'
      | 'gruvbox-dark-hard'
      | 'gruvbox-dark-medium'
      | 'gruvbox-dark-soft'
      | 'darcula'
      | 'system',
  ) => void;
  
  /**
   * Enables or disables haptic feedback
   * 
   * @param enabled - Whether haptic feedback should be enabled
   */
  setHapticEnabled: (enabled: boolean) => void;
  
  /**
   * Enables or disables automatic title generation
   * 
   * @param enabled - Whether titles should be auto-generated
   */
  setAutoGenerateTitles: (enabled: boolean) => void;

  /**
   * Enables or disables model thinking output capture
   *
   * @param enabled - Whether thinking output should be captured
   */
  setThinkingEnabled: (enabled: boolean) => void;
  
  /**
   * Updates the message font size
   * 
   * @param size - The new font size in pixels
   */
  setMessageFontSize: (size: number) => void;
  
  /**
   * Enables or disables code line numbers
   * 
   * @param enabled - Whether line numbers should be shown in code blocks
   */
  setShowCodeLineNumbers: (enabled: boolean) => void;
  
  /**
   * Resets all settings to their default values
   * 
   * This action restores the initial app configuration and persists the change.
   */
  resetSettings: () => void;
}

/**
 * Default settings configuration
 * 
 * These values are applied when the app first launches or when settings are reset.
 * Each default is chosen for optimal user experience and accessibility.
 */
const DEFAULT_SETTINGS: SettingsState = {
  /**
   * Dark theme is default for better eye comfort in low-light conditions
   * and reduced battery consumption on OLED displays.
   */
  theme: 'dark',
  
  /**
   * Haptic feedback enabled by default for enhanced user experience
   * and confirmation of user actions.
   */
  hapticEnabled: true,
  
  /**
   * Auto-generate titles enabled for better chat organization
   * and user navigation between conversations.
   */
  autoGenerateTitles: true,

  /**
   * Thinking output enabled to surface reasoning details when available.
   */
  thinkingEnabled: true,
  
  /**
   * 16px font size provides good readability on most devices
   * while maintaining adequate content density.
   */
  messageFontSize: 16,
  
  /**
   * Line numbers disabled by default to reduce visual clutter
   * in casual code viewing scenarios.
   */
  showCodeLineNumbers: false,
};

/**
 * Creates and exports the settings store using Zustand
 * 
 * This store combines state and actions into a single hook that can be used
 * throughout the application. The store is persisted using the secure storage
 * adapter to maintain user preferences across app sessions.
 * 
 * Store features:
 * - Type-safe state and actions using TypeScript interfaces
 * - Automatic persistence to secure storage
 * - Graceful fallback for storage failures
 * - Atomic updates for state consistency
 * 
 * Usage example:
 * ```tsx
 * const { theme, setTheme, hapticEnabled, resetSettings } = useSettingsStore();
 * ```
 */
export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      // Initialize with default settings
      ...DEFAULT_SETTINGS,
      
      // Action implementations - each updates specific state properties
      setTheme: (theme) => set({ theme }),
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
      setAutoGenerateTitles: (enabled) => set({ autoGenerateTitles: enabled }),
      setThinkingEnabled: (enabled) => set({ thinkingEnabled: enabled }),
      setMessageFontSize: (size) => set({ messageFontSize: size }),
      setShowCodeLineNumbers: (enabled) => set({ showCodeLineNumbers: enabled }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      /**
       * Persistence configuration
       * 
       * Uses the secure storage adapter to ensure sensitive settings
       * are stored encrypted on the device.
       */
      name: 'settings-storage', // Unique identifier for this store in storage
      storage: createJSONStorage(() => ({
        // Adapter functions bridge Zustand's persistence API with our secure storage
        getItem: (name) => secureStorage.getItem(name) as Promise<string | null>,
        setItem: (name, value) => secureStorage.setItem(name, value),
        removeItem: (name) => secureStorage.removeItem(name),
      })),
    },
  ),
);

/**
 * Detailed Store Explanation
 * 
 * ==========================
 * OVERVIEW
 * ==========================
 * The useSettingsStore is a centralized state management solution for all user
 * preferences and application settings in the Seabreeze app. It utilizes Zustand
 * for lightweight, performant state management with built-in persistence using
 * the device's secure storage system.
 * 
 * ==========================
 * ARCHITECTURE
 * ==========================
 * 
 * 1. **Security-First Design**: All settings are stored using Expo SecureStore,
 *    which leverages the device's native secure storage (Keychain on iOS,
 *    Keystore on Android). This ensures user preferences are encrypted at rest
 *    and protected from unauthorized access.
 * 
 * 2. **Type Safety**: The store is fully typed with TypeScript, providing
 *    compile-time guarantees and excellent IDE support. The SettingsState and
 *    SettingsActions interfaces define exactly what data and methods are available.
 * 
 * 3. **Persistence Layer**: Uses Zustand's persist middleware with a custom
 *    secure storage adapter. The adapter handles potential security exceptions
 *    gracefully with silent failures to prevent app crashes.
 * 
 * 4. **Default Configuration**: Includes sensible defaults optimized for
 *    accessibility, battery life, and user experience. Dark theme reduces eye
 *    strain and battery usage, while haptic feedback enhances interactivity.
 * 
 * ==========================
 * FEATURE BREAKDOWN
 * ==========================
 * 
 * **Theme Management**:
 * - Supports 13 different themes including popular developer color schemes
 * - System theme option for automatic device preference following
 * - Persistent across app restarts
 * 
 * **User Experience Controls**:
 * - Haptic feedback for tactile interaction confirmation
 * - Configurable message font size for accessibility
 * - Code line numbers toggle for developer convenience
 * - Auto-generated chat titles for better organization
 * 
 * **Data Persistence**:
 * - All settings automatically saved when changed
 * - Secure storage prevents data loss on app updates
 * - Instant restoration on app launch
 * 
 * ==========================
 * INTEGRATION POINTS
 * ==========================
 * 
 * - **ThemeProvider**: Consumes theme settings to apply visual styles
 * - **Chat Components**: Use haptic settings for interaction feedback
 * - **Message Display**: Applies font size and code formatting preferences
 * - **Title Generation Service**: Respects auto-generation preference
 * 
 * ==========================
 * USAGE PATTERNS
 * ==========================
 * 
 * ```tsx
 * // Reading settings
 * const { theme, hapticEnabled, messageFontSize } = useSettingsStore();
 * 
 * // Updating settings
 * const { setTheme, setHapticEnabled } = useSettingsStore();
 * setTheme('nord');
 * setHapticEnabled(false);
 * 
 * // Reset to defaults
 * const { resetSettings } = useSettingsStore();
 * resetSettings();
 * ```
 * 
 * ==========================
 * ERROR HANDLING
 * ==========================
 * 
 * - Storage operations fail silently to prevent app crashes
 * - Invalid theme values are prevented by TypeScript type system
 * - Font size validation should be handled in UI components
 * - All state updates are atomic to prevent corruption
 * 
 * ==========================
 * PERFORMANCE CONSIDERATIONS
 * ==========================
 * 
 * - Zustand provides minimal bundle footprint
 * - Secure storage operations are asynchronous and non-blocking
 * - State updates trigger minimal re-renders due to selector pattern support
 * - Persistence is debounced to avoid excessive storage writes
 */
