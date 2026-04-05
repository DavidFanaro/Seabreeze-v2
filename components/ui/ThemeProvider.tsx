import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, View, useColorScheme } from "react-native";

import { useSettingsStore } from "@/stores/useSettingsStore";
import {
  DEFAULT_THEME_MODE,
  getTheme,
  resolveThemeMode,
  type ResolvedThemeMode,
  type Theme,
  type ThemeMode,
} from "@/components/ui/theme-config";

export type ThemeType = ResolvedThemeMode;
export type { Theme, ThemeMode } from "@/components/ui/theme-config";

interface ThemeContextValue {
  theme: Theme;
  themeType: ThemeType;
  themeMode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
}

function ThemeLoadingState({ theme }: { theme: Theme }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.background,
      }}
    >
      <ActivityIndicator color={theme.colors.accent} size="small" />
    </View>
  );
}

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME_MODE,
}: ThemeProviderProps) {
  const rawSystemColorScheme = useColorScheme();
  const systemColorScheme = rawSystemColorScheme === "unspecified" ? null : rawSystemColorScheme;
  const storedThemeMode = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const [hasHydrated, setHasHydrated] = useState(useSettingsStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    if (useSettingsStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }

    return unsubscribe;
  }, []);

  const themeMode = storedThemeMode ?? defaultTheme;
  const themeType = useMemo(
    () => resolveThemeMode(themeMode, systemColorScheme),
    [systemColorScheme, themeMode],
  );
  const theme = useMemo(() => getTheme(themeType), [themeType]);

  if (!hasHydrated) {
    const fallbackThemeType = resolveThemeMode(defaultTheme, systemColorScheme);
    return <ThemeLoadingState theme={getTheme(fallbackThemeType)} />;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, themeType, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
