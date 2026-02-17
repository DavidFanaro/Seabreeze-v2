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
  StyleSheet,
} from "react-native";
import { Suspense } from "react";
import { SymbolView } from "expo-symbols";
import { IconButton, useTheme } from "@/components";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ThemeMode } from "@/components/ui/ThemeProvider";

// ── Static palette previews ─────────────────────────────────────────────────
// Three representative colors per theme (background → surface → accent).
// Displayed as small dot swatches beside each theme name.
const THEME_PALETTE: Record<ThemeMode, readonly [string, string, string]> = {
  light:                  ["#f2f2f7", "#ffffff",  "#007AFF"],
  dark:                   ["#000000", "#1a1a1a",  "#0567d1"],
  nord:                   ["#2E3440", "#3B4252",  "#88C0D0"],
  catppuccin:             ["#1E1E2E", "#313244",  "#89B4FA"],
  "tokyo-night":          ["#1a1b26", "#24283b",  "#7aa2f7"],
  "tokyo-night-storm":    ["#24283b", "#414868",  "#7aa2f7"],
  "tokyo-night-moon":     ["#222436", "#2f334d",  "#82aaff"],
  "one-dark":             ["#282c34", "#2c313a",  "#61afef"],
  "gruvbox-dark-hard":    ["#1d2021", "#282828",  "#83a598"],
  "gruvbox-dark-medium":  ["#282828", "#3c3836",  "#83a598"],
  "gruvbox-dark-soft":    ["#32302f", "#3c3836",  "#83a598"],
  darcula:                ["#2b2b2b", "#323232",  "#6897bb"],
  system:                 ["#000000", "#1a1a1a",  "#007AFF"],
};

export default function AppearanceSettings() {
  const { theme, themeMode, setTheme } = useTheme();

  const showCodeLineNumbers = useSettingsStore(
    (state) => state.showCodeLineNumbers,
  );
  const setShowCodeLineNumbers = useSettingsStore(
    (state) => state.setShowCodeLineNumbers,
  );

  const themeOptions: { id: ThemeMode; name: string }[] = [
    { id: "light",                name: "Light" },
    { id: "dark",                 name: "Dark" },
    { id: "nord",                 name: "Nord" },
    { id: "catppuccin",           name: "Catppuccin" },
    { id: "tokyo-night",          name: "Tokyo Night (Night)" },
    { id: "tokyo-night-storm",    name: "Tokyo Night (Storm)" },
    { id: "tokyo-night-moon",     name: "Tokyo Night (Moon)" },
    { id: "one-dark",             name: "One Dark" },
    { id: "gruvbox-dark-hard",    name: "Gruvbox (Dark Hard)" },
    { id: "gruvbox-dark-medium",  name: "Gruvbox (Dark Medium)" },
    { id: "gruvbox-dark-soft",    name: "Gruvbox (Dark Soft)" },
    { id: "darcula",              name: "Darcula" },
    { id: "system",               name: "System" },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerTitle: "Appearance",
          headerTransparent: true,
          headerTintColor: theme.colors.text,
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

      <SafeAreaView className="flex-1">
        <Suspense fallback={<Text>Loading</Text>}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow pt-5 px-4"
          >
            {/* ── THEME ─────────────────────────────────────────── */}
            <Text
              className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-2"
              style={{ color: theme.colors.textSecondary }}
            >
              Theme
            </Text>

            <View
              className="rounded-xl overflow-hidden mb-6"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {themeOptions.map((option, index) => {
                const isSelected = themeMode === option.id;
                const palette = THEME_PALETTE[option.id];
                const isLast = index === themeOptions.length - 1;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setTheme(option.id)}
                    className="flex-row items-center"
                    style={({ pressed }) => ({
                      minHeight: 52,
                      backgroundColor: pressed
                        ? theme.colors.border
                        : theme.colors.surface,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                      // Left accent bar marks the active theme
                      borderLeftWidth: isSelected ? 3 : 0,
                      borderLeftColor: theme.colors.accent,
                      // Compensate so text doesn't shift when border appears
                      paddingLeft: isSelected ? 13 : 16,
                      paddingRight: 16,
                    })}
                  >
                    {/* Theme name */}
                    <Text
                      className="flex-1 text-[16px]"
                      style={{
                        color: isSelected ? theme.colors.accent : theme.colors.text,
                        fontWeight: isSelected ? "600" : "400",
                      }}
                    >
                      {option.name}
                    </Text>

                    {/* 3-dot palette swatch: bg → surface → accent */}
                    <View className="flex-row items-center gap-1.5 mr-3">
                      {palette.map((color, i) => (
                        <View
                          key={i}
                          style={{
                            width: 11,
                            height: 11,
                            borderRadius: 6,
                            backgroundColor: color,
                            borderWidth: 0.5,
                            borderColor: "rgba(128,128,128,0.25)",
                          }}
                        />
                      ))}
                    </View>

                    {/* Checkmark for the active selection */}
                    {isSelected ? (
                      <SymbolView
                        name="checkmark"
                        size={15}
                        tintColor={theme.colors.accent}
                      />
                    ) : (
                      <View style={{ width: 15 }} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* ── CHAT DISPLAY ──────────────────────────────────── */}
            <Text
              className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-2"
              style={{ color: theme.colors.textSecondary }}
            >
              Chat Display
            </Text>

            <View
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <View className="flex-row items-center justify-between px-4 py-3.5">
                <View className="flex-1 mr-3">
                  <Text
                    className="text-[16px] font-semibold"
                    style={{ color: theme.colors.text }}
                  >
                    Show Code Line Numbers
                  </Text>
                  <Text
                    className="text-[13px] mt-0.5"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Display line numbers in code blocks
                  </Text>
                </View>
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

            <View className="h-4" />
          </ScrollView>
        </Suspense>
      </SafeAreaView>
    </View>
  );
}
