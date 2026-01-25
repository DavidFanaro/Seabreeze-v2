import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ActivityIndicator, View, useColorScheme } from "react-native";

import { useSettingsStore } from "@/stores/useSettingsStore";

// ============================================================================
// THEME INTERFACE DEFINITION
// ============================================================================
// Defines the structure of a theme object containing color palette, spacing,
// border radius values, and dark mode flag for consistent styling across the app.

export interface Theme {
    colors: {
        background: string;      // Main app background color
        surface: string;         // Card/modal/panel surface colors
        text: string;            // Primary text color
        textSecondary: string;   // Secondary/muted text color
        accent: string;          // Primary accent/action color
        glass: string;           // Glassmorphism overlay color
        border: string;          // Border/divider colors
        error: string;           // Error state colors
        overlay: string;         // Modal/drawer overlay background
        overlayForeground: string; // Text color for overlay content
    };
    spacing: {
        xs: number;  // 4px - Extra small spacing
        sm: number;  // 8px - Small spacing
        md: number;  // 16px - Medium spacing
        lg: number;  // 24px - Large spacing
        xl: number;  // 32px - Extra large spacing
    };
    borderRadius: {
        xs: number;   // 2px - Extra small border radius
        sm: number;   // 8px - Small border radius
        md: number;   // 12px - Medium border radius
        lg: number;   // 20px - Large border radius
        xl: number;   // 24px - Extra large border radius
        '2xl': number; // 32px - 2x extra large border radius
        '3xl': number; // 48px - 3x extra large border radius
        '4xl': number; // 64px - 4x extra large border radius
        full: number;  // 9999 - Fully rounded (circular) border radius
    };
    isDark: boolean;  // Flag indicating if theme is dark mode
}

// ============================================================================
// LIGHT THEME DEFINITION
// ============================================================================
// iOS-inspired light theme with clean, bright colors suitable for daytime use.
// Uses high contrast backgrounds and iOS system blue as the primary accent.

const lightTheme: Theme = {
    colors: {
        background: "#f2f2f7",           // iOS light gray background
        surface: "#ffffff",               // Pure white for cards/surfaces
        text: "#000000",                  // Pure black for maximum contrast
        textSecondary: "#8e8e93",         // iOS secondary text gray
        accent: "#007AFF",                // iOS system blue
        glass: "rgba(255,255,255,0.7)",   // Semi-transparent white overlay
        border: "rgba(0,0,0,0.12)",       // Subtle dark borders
        error: "#ff3b30",                 // iOS system red
        overlay: "#ffffff",                // White modal overlay
        overlayForeground: "#000000",     // Black text on overlays
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: false,
};

// ============================================================================
// DARK THEME DEFINITION
// ============================================================================
// Dark theme with pure black background and reduced eye strain for night use.
// Uses deep grays for surfaces and a slightly muted blue accent color.

const darkTheme: Theme = {
    colors: {
        background: "#000000",           // Pure black for OLED efficiency
        surface: "#1a1a1a",             // Dark gray for cards/surfaces
        text: "#ffffff",                // Pure white text
        textSecondary: "#adb5bd",        // Muted gray for secondary text
        accent: "#0567d1",               // Muted blue accent for dark mode
        glass: "rgba(0,0,0,0.8)",       // Dark glass overlay
        border: "rgba(255,255,255,0.1)", // Subtle white borders
        error: "#ff4757",                // Bright red for errors
        overlay: "rgba(28,28,30,0.95)", // iOS-style dark overlay
        overlayForeground: "#ffffff",   // White text on overlays
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// NORD THEME DEFINITION
// ============================================================================
// Nord theme inspired by the popular Nord color palette.
// Features cool, arctic colors with frosty blue accents for a calm, professional look.

const nordTheme: Theme = {
    colors: {
        background: "#2E3440",           // Nord dark blue-gray
        surface: "#3B4252",             // Nord Polar Night
        text: "#ECEFF4",                // Nord Snow Storm white
        textSecondary: "#D8DEE9",        // Nord lighter gray
        accent: "#88C0D0",               // Nord Aurora blue
        glass: "rgba(59, 66, 82, 0.8)", // Nord dark glass
        border: "rgba(136, 192, 208, 0.3)", // Nord Aurora borders
        error: "#BF616A",                // Nord Aurora red
        overlay: "rgba(46, 52, 64, 0.95)", // Nord overlay
        overlayForeground: "#ECEFF4",   // Nord overlay text
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// CATPPUCCIN THEME DEFINITION
// ============================================================================
// Catppuccin theme featuring warm pastel colors from the popular Catppuccin palette.
// Uses soothing mauve and lavender tones with pink accents for a comfortable dark theme.

const catppuccinTheme: Theme = {
    colors: {
        background: "#1E1E2E",           // Catppuccin base
        surface: "#313244",             // Catppuccin mantle
        text: "#CDD6F4",                // Catppuccin text
        textSecondary: "#BAC2DE",        // Catppuccin subtext1
        accent: "#89B4FA",               // Catppuccin blue
        glass: "rgba(49, 50, 68, 0.8)", // Catppuccin glass
        border: "rgba(137, 180, 250, 0.3)", // Catppuccin borders
        error: "#F38BA8",                // Catppuccin red
        overlay: "rgba(30, 30, 46, 0.95)", // Catppuccin overlay
        overlayForeground: "#CDD6F4",   // Catppuccin overlay text
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// TOKYO NIGHT THEME DEFINITION
// ============================================================================
// Tokyo Night theme based on the popular VS Code theme.
// Features deep blues and purples inspired by Tokyo nights with bright cyan accents.

const tokyoNightTheme: Theme = {
    colors: {
        background: "#1a1b26",           // Tokyo Night background
        surface: "#24283b",             // Tokyo Night surface
        text: "#c0caf5",                // Tokyo Night foreground
        textSecondary: "#a9b1d6",        // Tokyo Night comment
        accent: "#7aa2f7",               // Tokyo Night blue
        glass: "rgba(36, 40, 59, 0.8)", // Tokyo Night glass
        border: "rgba(122, 162, 247, 0.3)", // Tokyo Night borders
        error: "#f7768e",                // Tokyo Night red
        overlay: "rgba(26, 27, 38, 0.95)", // Tokyo Night overlay
        overlayForeground: "#c0caf5",   // Tokyo Night overlay text
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// TOKYO NIGHT STORM THEME DEFINITION
// ============================================================================
// Tokyo Night Storm variant with lighter, more muted colors.
// Uses stormy grays and blues for a softer, less intense variant of Tokyo Night.

const tokyoNightStormTheme: Theme = {
    colors: {
        background: "#24283b",           // Tokyo Night Storm background
        surface: "#414868",             // Tokyo Night Storm surface
        text: "#c0caf5",                // Tokyo Night Storm foreground
        textSecondary: "#a9b1d6",        // Tokyo Night Storm comment
        accent: "#7aa2f7",               // Tokyo Night Storm blue
        glass: "rgba(65, 72, 104, 0.8)", // Tokyo Night Storm glass
        border: "rgba(122, 162, 247, 0.3)", // Tokyo Night Storm borders
        error: "#f7768e",                // Tokyo Night Storm red
        overlay: "rgba(36, 40, 59, 0.95)", // Tokyo Night Storm overlay
        overlayForeground: "#c0caf5",   // Tokyo Night Storm overlay text
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// TOKYO NIGHT MOON THEME DEFINITION
// ============================================================================
// Tokyo Night Moon variant with deep purple and blue tones.
// Inspired by moonlit nights with a cooler, more mystical color palette.

const tokyoNightMoonTheme: Theme = {
    colors: {
        background: "#222436",           // Tokyo Night Moon background
        surface: "#2f334d",             // Tokyo Night Moon surface
        text: "#c8d3f5",                // Tokyo Night Moon foreground
        textSecondary: "#a9b8e8",        // Tokyo Night Moon comment
        accent: "#82aaff",               // Tokyo Night Moon blue
        glass: "rgba(47, 51, 77, 0.8)", // Tokyo Night Moon glass
        border: "rgba(130, 170, 255, 0.3)", // Tokyo Night Moon borders
        error: "#ff757f",                // Tokyo Night Moon red
        overlay: "rgba(34, 36, 54, 0.95)", // Tokyo Night Moon overlay
        overlayForeground: "#c8d3f5",   // Tokyo Night Moon overlay text
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// ONE DARK THEME DEFINITION
// ============================================================================
// One Dark theme inspired by the popular Atom editor theme.
// Features a balanced dark palette with blue accents and good contrast ratios.

const oneDarkTheme: Theme = {
    colors: {
        background: "#282c34",           // One Dark background
        surface: "#2c313a",             // One Dark surface
        text: "#abb2bf",                // One Dark foreground
        textSecondary: "#9aa1ad",        // One Dark comment
        accent: "#61afef",               // One Dark blue
        glass: "rgba(44, 49, 58, 0.8)", // One Dark glass
        border: "rgba(97, 175, 239, 0.3)", // One Dark borders
        error: "#e06c75",                // One Dark red
        overlay: "rgba(40, 44, 52, 0.95)", // One Dark overlay
        overlayForeground: "#abb2bf",   // One Dark overlay text
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// GRUVBOX DARK HARD THEME DEFINITION
// ============================================================================
// Gruvbox Dark Hard variant with the darkest background contrast.
// Uses the classic Gruvbox palette with warm, retro colors inspired by retro terminals.

const gruvboxDarkHardTheme: Theme = {
    colors: {
        background: "#1d2021",           // Gruvbox dark0_hard
        surface: "#282828",             // Gruvbox dark0
        text: "#ebdbb2",                // Gruvbox light0
        textSecondary: "#d5c4a1",        // Gruvbox light1
        accent: "#83a598",               // Gruvbox bright_aqua
        glass: "rgba(40, 40, 40, 0.8)", // Gruvbox glass
        border: "rgba(131, 165, 152, 0.3)", // Gruvbox borders
        error: "#fb4934",                // Gruvbox bright_red
        overlay: "rgba(29, 32, 33, 0.95)", // Gruvbox overlay
        overlayForeground: "#ebdbb2",   // Gruvbox overlay text
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// GRUVBOX DARK MEDIUM THEME DEFINITION
// ============================================================================
// Gruvbox Dark Medium variant with medium contrast.
// The classic Gruvbox theme with balanced contrast for comfortable viewing.

const gruvboxDarkMediumTheme: Theme = {
    colors: {
        background: "#282828",           // Gruvbox dark0
        surface: "#3c3836",             // Gruvbox dark1
        text: "#ebdbb2",                // Gruvbox light0
        textSecondary: "#d5c4a1",        // Gruvbox light1
        accent: "#83a598",               // Gruvbox bright_aqua
        glass: "rgba(60, 56, 54, 0.8)", // Gruvbox glass
        border: "rgba(131, 165, 152, 0.3)", // Gruvbox borders
        error: "#fb4934",                // Gruvbox bright_red
        overlay: "rgba(40, 40, 40, 0.95)", // Gruvbox overlay
        overlayForeground: "#ebdbb2",   // Gruvbox overlay text
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// GRUVBOX DARK SOFT THEME DEFINITION
// ============================================================================
// Gruvbox Dark Soft variant with the softest background contrast.
// Easier on the eyes with a lighter background while maintaining the Gruvbox aesthetic.

const gruvboxDarkSoftTheme: Theme = {
    colors: {
        background: "#32302f",           // Gruvbox dark0_soft
        surface: "#3c3836",             // Gruvbox dark1
        text: "#ebdbb2",                // Gruvbox light0
        textSecondary: "#d5c4a1",        // Gruvbox light1
        accent: "#83a598",               // Gruvbox bright_aqua
        glass: "rgba(60, 56, 54, 0.8)", // Gruvbox glass
        border: "rgba(131, 165, 152, 0.3)", // Gruvbox borders
        error: "#fb4934",                // Gruvbox bright_red
        overlay: "rgba(50, 48, 47, 0.95)", // Gruvbox overlay
        overlayForeground: "#ebdbb2",   // Gruvbox overlay text
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// DARcula THEME DEFINITION
// ============================================================================
// Darcula theme inspired by JetBrains IDE's dark theme.
// Professional dark theme with balanced contrast and blue accents favored by developers.

const darculaTheme: Theme = {
    colors: {
        background: "#2b2b2b",           // Darcula background
        surface: "#323232",             // Darcula surface
        text: "#a9b7c6",                // Darcula foreground
        textSecondary: "#808080",        // Darcula comment
        accent: "#6897bb",               // Darcula blue
        glass: "rgba(50, 50, 50, 0.8)", // Darcula glass
        border: "rgba(104, 151, 187, 0.3)", // Darcula borders
        error: "#ff6b68",                // Darcula red
        overlay: "rgba(43, 43, 43, 0.95)", // Darcula overlay
        overlayForeground: "#a9b7c6",   // Darcula overlay text
    },
    spacing: {
        xs: 4,    // 4px - Micro spacing
        sm: 8,    // 8px - Small element spacing
        md: 16,   // 16px - Standard spacing
        lg: 24,   // 24px - Section spacing
        xl: 32,   // 32px - Large section spacing
    },
    borderRadius: {
        xs: 2,     // 2px - Minimal rounding
        sm: 8,     // 8px - Small buttons/inputs
        md: 12,    // 12px - Medium components
        lg: 20,    // 20px - Large components
        xl: 24,    // 24px - Extra large components
        '2xl': 32, // 32px - Cards/panels
        '3xl': 48, // 48px - Large rounded containers
        '4xl': 64, // 64px - Hero elements
        full: 9999, // Circular elements
    },
    isDark: true,
};

// ============================================================================
// THEME TYPE DEFINITIONS
// ============================================================================

// ThemeMode type used for user settings and API, includes 'system' option
export type ThemeMode =
    | "light"                    // Light theme
    | "dark"                     // Dark theme
    | "nord"                     // Nord theme
    | "catppuccin"               // Catppuccin theme
    | "tokyo-night"              // Tokyo Night theme
    | "tokyo-night-storm"        // Tokyo Night Storm variant
    | "tokyo-night-moon"         // Tokyo Night Moon variant
    | "one-dark"                 // One Dark theme
    | "gruvbox-dark-hard"        // Gruvbox Dark Hard variant
    | "gruvbox-dark-medium"      // Gruvbox Dark Medium variant
    | "gruvbox-dark-soft"        // Gruvbox Dark Soft variant
    | "darcula"                  // Darcula theme
    | "system";                   // System theme (follows device settings)

// ThemeType type used internally, excludes 'system' since it's resolved to actual theme
type ThemeType =
    | "light"                    // Light theme
    | "dark"                     // Dark theme
    | "nord"                     // Nord theme
    | "catppuccin"               // Catppuccin theme
    | "tokyo-night"              // Tokyo Night theme
    | "tokyo-night-storm"        // Tokyo Night Storm variant
    | "tokyo-night-moon"         // Tokyo Night Moon variant
    | "one-dark"                 // One Dark theme
    | "gruvbox-dark-hard"        // Gruvbox Dark Hard variant
    | "gruvbox-dark-medium"      // Gruvbox Dark Medium variant
    | "gruvbox-dark-soft"        // Gruvbox Dark Soft variant
    | "darcula";                  // Darcula theme

// ============================================================================
// THEME CONTEXT DEFINITION
// ============================================================================

// ThemeContextType interface defining the shape of the theme context value
interface ThemeContextType {
    theme: Theme;                     // Current theme object
    themeType: ThemeType;            // Current theme type (resolved)
    themeMode: ThemeMode;            // User's selected theme mode
    toggleTheme: () => void;         // Toggle between light/dark themes
    setThemeType: (type: ThemeType) => void; // Set specific theme type
    setTheme: (mode: ThemeMode) => void;      // Set theme mode
}

// Create React context for theme management with undefined default
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================================================
// THEME HOOK DEFINITIONS
// ============================================================================

// Custom hook to access theme context, throws error if used outside provider
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};

// Utility function to check if a theme is dark mode
export const isDarkTheme = (theme: Theme): boolean => {
    return theme.isDark;
};

// ============================================================================
// THEME PROVIDER COMPONENT
// ============================================================================

// Props interface for the ThemeProvider component
interface ThemeProviderProps {
    children: ReactNode;          // Child components to wrap
    defaultTheme?: ThemeMode;     // Optional default theme mode
}

// Main ThemeProvider component that manages theme state and provides theme context
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultTheme = "dark",
}) => {
    // Get system color scheme from React Native
    const systemColorScheme = useColorScheme();
    
    // Get stored theme mode from Zustand store
    const storedThemeMode = useSettingsStore((state) => state.theme);
    
    // Get theme setter function from Zustand store
    const setStoredTheme = useSettingsStore(
        (state) => state.setTheme,
    ) as (theme: ThemeMode) => void;
    
    // Track hydration state of the persistent store
    const [hasHydrated, setHasHydrated] = useState(
        useSettingsStore.persist.hasHydrated(),
    );

    // ============================================================================
    // HYDRATION EFFECT HOOK
    // ============================================================================
    // Ensures theme state is properly hydrated from persistent storage before rendering
    useEffect(() => {
        const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
            setHasHydrated(true);
        });

        if (useSettingsStore.persist.hasHydrated()) {
            setHasHydrated(true);
        }

        return unsubscribe;
    }, []);

    // ============================================================================
    // THEME MAPPING
    // ============================================================================
    // Maps theme types to their corresponding theme objects for easy lookup
    const themes: Record<ThemeType, Theme> = {
        light: lightTheme,
        dark: darkTheme,
        nord: nordTheme,
        catppuccin: catppuccinTheme,
        "tokyo-night": tokyoNightTheme,
        "tokyo-night-storm": tokyoNightStormTheme,
        "tokyo-night-moon": tokyoNightMoonTheme,
        "one-dark": oneDarkTheme,
        "gruvbox-dark-hard": gruvboxDarkHardTheme,
        "gruvbox-dark-medium": gruvboxDarkMediumTheme,
        "gruvbox-dark-soft": gruvboxDarkSoftTheme,
        darcula: darculaTheme,
    };

    // ============================================================================
    // THEME RESOLUTION LOGIC
    // ============================================================================
    // Resolves the current theme mode and type considering stored settings and defaults
    const themeMode = storedThemeMode ?? defaultTheme;
    const themeType: ThemeType = themeMode === "system"
        ? (systemColorScheme === "light" ? "light" : "dark")
        : themeMode;

    // Get the resolved theme object
    const theme = themes[themeType];

    // ============================================================================
    // THEME CONTROL FUNCTIONS
    // ============================================================================

    // Toggle between light and dark themes (cycles between the two)
    const toggleTheme = () => {
        const nextTheme = (() => {
            if (themeMode === "light") return "dark";
            if (themeMode === "dark") return "light";
            return systemColorScheme === "light" ? "dark" : "light";
        })();

        setStoredTheme(nextTheme);
    };

    // Set theme to a specific type
    const setThemeType = (type: ThemeType) => {
        setStoredTheme(type);
    };

    // Set theme mode (includes system option)
    const setTheme = (mode: ThemeMode) => {
        setStoredTheme(mode);
    };

        // ============================================================================
    // HYDRATION LOADING STATE
    // ============================================================================
    // Shows loading screen while theme settings are being hydrated from storage
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

    // ============================================================================
    // THEME CONTEXT PROVIDER
    // ============================================================================
    // Provides theme context to all child components with resolved theme values
    return (
        <ThemeContext.Provider
            value={{ theme, themeType, themeMode, toggleTheme, setThemeType, setTheme }}
        >
            {children}
        </ThemeContext.Provider>
    );
};
