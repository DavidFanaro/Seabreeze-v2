/**
 * @file app/settings/appearance.tsx
 * @purpose Provides UI for managing application appearance settings
 * including theme selection and chat display preferences.
 */

import { router, Stack } from "expo-router";
import {
  Pressable,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Switch,
} from "react-native";
import { Suspense } from "react";
import { SymbolView } from "expo-symbols";
import { IconButton, useTheme } from "@/components";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ThemeMode } from "@/components/ui/ThemeProvider";

/**
 * Converts a hexadecimal color code to RGBA format with custom alpha value.
 * Supports both 3-digit (#ABC) and 6-digit (#AABBCC) hex color formats.
 * Used for theme color calculations when rendering interactive elements.
 *
 * @param hex - Hex color string (e.g., "#FF5733")
 * @param alpha - Alpha/opacity value between 0 and 1
 * @returns RGBA color string (e.g., "rgba(255, 87, 51, 0.14)")
 */
const hexToRgba = (hex: string, alpha: number): string => {
  const sanitized = hex.replace("#", "");
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((value) => value + value)
          .join("")
      : sanitized;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

/**
 * AppearanceSettings Component
 *
 * Displays all appearance-related settings for the application.
 * Users can modify theme selection and chat display options from this screen.
 * Settings are persisted to the theme context and settings store.
 */
export default function AppearanceSettings() {
  // Retrieve current theme configuration and setter from theme context
  const { theme, themeMode, setTheme } = useTheme();

  // Retrieve code line numbers display setting from persistent store
  const showCodeLineNumbers = useSettingsStore(
    (state) => state.showCodeLineNumbers,
  );

  // Retrieve setter for code line numbers setting
  const setShowCodeLineNumbers = useSettingsStore(
    (state) => state.setShowCodeLineNumbers,
  );

  /**
   * Array of available theme options with unique identifiers and display names.
   * Includes light, dark, and various color scheme themes (Nord, Catppuccin, Tokyo Night, etc.)
   * and a "System" option that respects device settings.
   */
  const themeOptions: { id: ThemeMode; name: string }[] = [
    { id: "light", name: "Light" },
    { id: "dark", name: "Dark" },
    { id: "nord", name: "Nord" },
    { id: "catppuccin", name: "Catppuccin" },
    { id: "tokyo-night", name: "Tokyo Night (Night)" },
    { id: "tokyo-night-storm", name: "Tokyo Night (Storm)" },
    { id: "tokyo-night-moon", name: "Tokyo Night (Moon)" },
    { id: "one-dark", name: "One Dark" },
    { id: "gruvbox-dark-hard", name: "Gruvbox (Dark Hard)" },
    { id: "gruvbox-dark-medium", name: "Gruvbox (Dark Medium)" },
    { id: "gruvbox-dark-soft", name: "Gruvbox (Dark Soft)" },
    { id: "darcula", name: "Darcula" },
    { id: "system", name: "System" },
  ];

  /**
   * Handles theme selection changes.
   * Updates the global theme context with the selected theme.
   *
   * @param newTheme - The ThemeMode identifier selected by the user
   */
  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
  };

  return (
    // Root container with full flex height and theme background color
    <View
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
    >
      {/* Header configuration - displays "Appearance" title with close button */}
      <Stack.Screen
        options={{
          headerTitle: "Appearance",
          headerTransparent: true,
          headerTintColor: theme.colors.text,
          // Close button (X icon) to dismiss the settings modal
          headerRight: () => (
            <IconButton
              icon="xmark"
              onPress={() => router.dismiss()}
              size={24}
              style={{ marginLeft: 6 }}
            />
          ),
        }}
      />

      {/* Main safe area wrapper respects device notches and bottom navigation */}
      <SafeAreaView className="flex-1">
        <Suspense fallback={<Text>Loading</Text>}>
          {/* Scrollable container for appearance settings content */}
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow pt-5 px-4"
          >
            {/* ===== THEME SECTION ===== */}
            {/* Section header label for theme selection */}
            <Text
              className="text-[13px] font-bold uppercase tracking-wide mb-2"
              style={{ color: theme.colors.textSecondary }}
            >
              THEME
            </Text>

            {/* Container for theme selection list with rounded corners */}
            <View
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {/* Map through available themes to create selectable options */}
              {themeOptions.map((option, index) => {
                // Determine if this theme is currently selected
                const isSelected = themeMode === option.id;

                // Calculate background colors for selected and pressed states
                const selectedBackground = hexToRgba(theme.colors.accent, 0.14);
                const pressedBackground = isSelected
                  ? hexToRgba(theme.colors.accent, 0.2)
                  : theme.colors.border;

                return (
                  // Pressable theme option item
                  <Pressable
                    key={option.id}
                    onPress={() => handleThemeChange(option.id)}
                    className="flex-row items-center justify-between px-4 py-4"
                    style={({ pressed }) => ({
                      minHeight: 56,
                      // Apply background color based on selected/pressed state
                      backgroundColor: pressed
                        ? pressedBackground
                        : isSelected
                          ? selectedBackground
                          : theme.colors.surface,
                      // Add separator line between items (except after last item)
                      borderBottomWidth:
                        index < themeOptions.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border,
                    })}
                  >
                    {/* Theme name label container */}
                    <View className="flex-row items-center flex-1">
                      <Text
                        className="text-[16px] font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {option.name}
                      </Text>
                    </View>

                    {/* Selection indicator: checkmark for selected theme, empty space otherwise */}
                    {isSelected ? (
                      <SymbolView
                        name="checkmark"
                        size={16}
                        tintColor={theme.colors.accent}
                      />
                    ) : (
                      <View className="w-[16px]" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* ===== CHAT DISPLAY SECTION ===== */}
            {/* Section header label for chat display preferences */}
            <Text
              className="text-[13px] font-bold uppercase tracking-wide mb-2 mt-6"
              style={{ color: theme.colors.textSecondary }}
            >
              CHAT DISPLAY
            </Text>

            {/* Container for chat display settings with rounded corners and padding */}
            <View
              className="rounded-lg overflow-hidden p-4"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {/* Row layout for settings item with label and toggle control */}
              <View className="flex-row items-center justify-between">
                {/* Left side: setting name and description */}
                <View className="flex-1">
                  {/* Primary label for the setting */}
                  <Text
                    className="text-[16px] font-semibold"
                    style={{ color: theme.colors.text }}
                  >
                    Show Code Line Numbers
                  </Text>

                  {/* Secondary description explaining what the setting does */}
                  <Text
                    className="text-[13px] mt-1"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Display line numbers in code blocks
                  </Text>
                </View>

                {/* Right side: toggle switch for enabling/disabling code line numbers */}
                <Switch
                  value={showCodeLineNumbers}
                  onValueChange={setShowCodeLineNumbers}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.accent,
                  }}
                  thumbColor={
                    showCodeLineNumbers
                      ? theme.colors.accent
                      : theme.colors.textSecondary
                  }
                />
              </View>
            </View>

            {/* Bottom spacing to prevent content from being cut off by navigation */}
            <View className="h-4" />
          </ScrollView>
        </Suspense>
      </SafeAreaView>
    </View>
  );
}
