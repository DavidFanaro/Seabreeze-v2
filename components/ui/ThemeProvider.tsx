import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ActivityIndicator, View, useColorScheme } from "react-native";

import { useSettingsStore } from "@/stores/useSettingsStore";

export interface Theme {
    colors: {
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        accent: string;
        glass: string;
        border: string;
        error: string;
        overlay: string;
        overlayForeground: string;
    };
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
    borderRadius: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        '2xl': number;
        '3xl': number;
        '4xl': number;
        full: number;
    };
    isDark: boolean;
}

const lightTheme: Theme = {
    colors: {
        background: "#f2f2f7",
        surface: "#ffffff",
        text: "#000000",
        textSecondary: "#8e8e93",
        accent: "#007AFF",
        glass: "rgba(255,255,255,0.7)",
        border: "rgba(0,0,0,0.12)",
        error: "#ff3b30",
        overlay: "#ffffff",
        overlayForeground: "#000000",
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        xs: 2,
        sm: 8,
        md: 12,
        lg: 20,
        xl: 24,
        '2xl': 32,
        '3xl': 48,
        '4xl': 64,
        full: 9999,
    },
    isDark: false,
};

const darkTheme: Theme = {
    colors: {
        background: "#000000",
        surface: "#1a1a1a",
        text: "#ffffff",
        textSecondary: "#adb5bd",
        accent: "#0567d1",
        glass: "rgba(0,0,0,0.8)",
        border: "rgba(255,255,255,0.1)",
        error: "#ff4757",
        overlay: "rgba(28,28,30,0.95)",
        overlayForeground: "#ffffff",
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        xs: 2,
        sm: 8,
        md: 12,
        lg: 20,
        xl: 24,
        '2xl': 32,
        '3xl': 48,
        '4xl': 64,
        full: 9999,
    },
    isDark: true,
};

const nordTheme: Theme = {
    colors: {
        background: "#2E3440",
        surface: "#3B4252",
        text: "#ECEFF4",
        textSecondary: "#D8DEE9",
        accent: "#88C0D0",
        glass: "rgba(59, 66, 82, 0.8)",
        border: "rgba(136, 192, 208, 0.3)",
        error: "#BF616A",
        overlay: "rgba(46, 52, 64, 0.95)",
        overlayForeground: "#ECEFF4",
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        xs: 2,
        sm: 8,
        md: 12,
        lg: 20,
        xl: 24,
        '2xl': 32,
        '3xl': 48,
        '4xl': 64,
        full: 9999,
    },
    isDark: true,
};

const catppuccinTheme: Theme = {
    colors: {
        background: "#1E1E2E",
        surface: "#313244",
        text: "#CDD6F4",
        textSecondary: "#BAC2DE",
        accent: "#89B4FA",
        glass: "rgba(49, 50, 68, 0.8)",
        border: "rgba(137, 180, 250, 0.3)",
        error: "#F38BA8",
        overlay: "rgba(30, 30, 46, 0.95)",
        overlayForeground: "#CDD6F4",
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        xs: 2,
        sm: 8,
        md: 12,
        lg: 20,
        xl: 24,
        '2xl': 32,
        '3xl': 48,
        '4xl': 64,
        full: 9999,
    },
    isDark: true,
};

const tokyoNightTheme: Theme = {
    colors: {
        background: "#1a1b26",
        surface: "#24283b",
        text: "#c0caf5",
        textSecondary: "#a9b1d6",
        accent: "#7aa2f7",
        glass: "rgba(36, 40, 59, 0.8)",
        border: "rgba(122, 162, 247, 0.3)",
        error: "#f7768e",
        overlay: "rgba(26, 27, 38, 0.95)",
        overlayForeground: "#c0caf5",
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        xs: 2,
        sm: 8,
        md: 12,
        lg: 20,
        xl: 24,
        '2xl': 32,
        '3xl': 48,
        '4xl': 64,
        full: 9999,
    },
    isDark: true,
};

export type ThemeMode = "light" | "dark" | "nord" | "catppuccin" | "tokyo-night" | "system";
type ThemeType = "light" | "dark" | "nord" | "catppuccin" | "tokyo-night";

interface ThemeContextType {
    theme: Theme;
    themeType: ThemeType;
    themeMode: ThemeMode;
    toggleTheme: () => void;
    setThemeType: (type: ThemeType) => void;
    setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};

export const isDarkTheme = (theme: Theme): boolean => {
    return theme.isDark;
};

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultTheme = "dark",
}) => {
    const systemColorScheme = useColorScheme();
    const storedThemeMode = useSettingsStore((state) => state.theme);
    const setStoredTheme = useSettingsStore((state) => state.setTheme);
    const [hasHydrated, setHasHydrated] = useState(
        useSettingsStore.persist.hasHydrated(),
    );

    useEffect(() => {
        const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
            setHasHydrated(true);
        });

        if (useSettingsStore.persist.hasHydrated()) {
            setHasHydrated(true);
        }

        return unsubscribe;
    }, []);

    const themes: Record<ThemeType, Theme> = {
        light: lightTheme,
        dark: darkTheme,
        nord: nordTheme,
        catppuccin: catppuccinTheme,
        "tokyo-night": tokyoNightTheme,
    };

    const themeMode = storedThemeMode ?? defaultTheme;
    const themeType: ThemeType = themeMode === "system"
        ? (systemColorScheme === "light" ? "light" : "dark")
        : themeMode;

    const theme = themes[themeType];

    const toggleTheme = () => {
        const nextTheme = (() => {
            if (themeMode === "light") return "dark";
            if (themeMode === "dark") return "light";
            return systemColorScheme === "light" ? "dark" : "light";
        })();

        setStoredTheme(nextTheme);
    };

    const setThemeType = (type: ThemeType) => {
        setStoredTheme(type);
    };

    const setTheme = (mode: ThemeMode) => {
        setStoredTheme(mode);
    };

    if (!hasHydrated) {
        const fallbackScheme = systemColorScheme === "light" ? "light" : "dark";
        const fallbackTheme = fallbackScheme === "light" ? lightTheme : darkTheme;

        return (
            <View
                style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: fallbackTheme.colors.background,
                }}
            >
                <ActivityIndicator
                    color={fallbackTheme.colors.accent}
                    size="small"
                />
            </View>
        );
    }

    return (
        <ThemeContext.Provider
            value={{ theme, themeType, themeMode, toggleTheme, setThemeType, setTheme }}
        >
            {children}
        </ThemeContext.Provider>
    );
};
