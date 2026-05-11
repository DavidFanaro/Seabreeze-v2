/**
 * @file app/settings/appearance.tsx
 * @purpose Provides UI for managing application appearance settings
 * including theme selection preferences.
 */

import { Pressable, View, Text, StyleSheet } from "react-native";

import { SymbolView } from "expo-symbols";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { useTheme } from "@/components/ui/ThemeProvider";
import { THEME_OPTIONS, THEME_PALETTE } from "@/components/ui/theme-config";

export default function AppearanceSettings() {
  const { theme, themeMode, setTheme } = useTheme();

  return (
    <SettingsScreen title="Appearance">
      <Text
        className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: theme.colors.textSecondary }}
      >
        Theme
      </Text>

      <View
        className="mb-6 overflow-hidden rounded-xl"
        style={{ backgroundColor: theme.colors.surface }}
      >
        {THEME_OPTIONS.map((option, index) => {
          const isSelected = themeMode === option.id;
          const palette = THEME_PALETTE[option.id];
          const isLast = index === THEME_OPTIONS.length - 1;

          return (
            <Pressable
              key={option.id}
              onPress={() => setTheme(option.id)}
              className="flex-row items-center"
              style={({ pressed }) => ({
                minHeight: 52,
                backgroundColor: isSelected
                  ? `${theme.colors.accent}18`
                  : pressed
                    ? theme.colors.border
                    : theme.colors.surface,
                borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
                borderWidth: isSelected ? StyleSheet.hairlineWidth : 0,
                borderColor: isSelected ? `${theme.colors.accent}66` : "transparent",
                paddingLeft: 16,
                paddingRight: 16,
              })}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                className="flex-1 text-[16px]"
                style={{
                  color: isSelected ? theme.colors.text : theme.colors.text,
                  fontWeight: isSelected ? "600" : "400",
                }}
              >
                {option.name}
              </Text>

              <View className="mr-3 flex-row items-center gap-1.5">
                {palette.map((color, paletteIndex) => (
                  <View
                    key={paletteIndex}
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

              {isSelected ? (
                <SymbolView name="checkmark" size={15} tintColor={theme.colors.accent} />
              ) : (
                <View style={{ width: 15 }} />
              )}
            </Pressable>
          );
        })}
      </View>

      <View className="h-4" />
    </SettingsScreen>
  );
}
