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
    "2xl": number;
    "3xl": number;
    "4xl": number;
    full: number;
  };
  isDark: boolean;
}

export type ThemeMode =
  | "light"
  | "dark"
  | "nord"
  | "catppuccin"
  | "tokyo-night"
  | "tokyo-night-storm"
  | "tokyo-night-moon"
  | "one-dark"
  | "gruvbox-dark-hard"
  | "gruvbox-dark-medium"
  | "gruvbox-dark-soft"
  | "darcula"
  | "system";

export type ResolvedThemeMode = Exclude<ThemeMode, "system">;

const SHARED_SPACING: Theme["spacing"] = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const SHARED_BORDER_RADIUS: Theme["borderRadius"] = {
  xs: 2,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
  full: 9999,
};

const createTheme = (colors: Theme["colors"], isDark: boolean): Theme => ({
  colors,
  spacing: SHARED_SPACING,
  borderRadius: SHARED_BORDER_RADIUS,
  isDark,
});

export const THEMES: Record<ResolvedThemeMode, Theme> = {
  light: createTheme(
    {
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
    false,
  ),
  dark: createTheme(
    {
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
    true,
  ),
  nord: createTheme(
    {
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
    true,
  ),
  catppuccin: createTheme(
    {
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
    true,
  ),
  "tokyo-night": createTheme(
    {
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
    true,
  ),
  "tokyo-night-storm": createTheme(
    {
      background: "#24283b",
      surface: "#414868",
      text: "#c0caf5",
      textSecondary: "#a9b1d6",
      accent: "#7aa2f7",
      glass: "rgba(65, 72, 104, 0.8)",
      border: "rgba(122, 162, 247, 0.3)",
      error: "#f7768e",
      overlay: "rgba(36, 40, 59, 0.95)",
      overlayForeground: "#c0caf5",
    },
    true,
  ),
  "tokyo-night-moon": createTheme(
    {
      background: "#222436",
      surface: "#2f334d",
      text: "#c8d3f5",
      textSecondary: "#a9b8e8",
      accent: "#82aaff",
      glass: "rgba(47, 51, 77, 0.8)",
      border: "rgba(130, 170, 255, 0.3)",
      error: "#ff757f",
      overlay: "rgba(34, 36, 54, 0.95)",
      overlayForeground: "#c8d3f5",
    },
    true,
  ),
  "one-dark": createTheme(
    {
      background: "#282c34",
      surface: "#2c313a",
      text: "#abb2bf",
      textSecondary: "#9aa1ad",
      accent: "#61afef",
      glass: "rgba(44, 49, 58, 0.8)",
      border: "rgba(97, 175, 239, 0.3)",
      error: "#e06c75",
      overlay: "rgba(40, 44, 52, 0.95)",
      overlayForeground: "#abb2bf",
    },
    true,
  ),
  "gruvbox-dark-hard": createTheme(
    {
      background: "#1d2021",
      surface: "#282828",
      text: "#ebdbb2",
      textSecondary: "#d5c4a1",
      accent: "#83a598",
      glass: "rgba(40, 40, 40, 0.8)",
      border: "rgba(131, 165, 152, 0.3)",
      error: "#fb4934",
      overlay: "rgba(29, 32, 33, 0.95)",
      overlayForeground: "#ebdbb2",
    },
    true,
  ),
  "gruvbox-dark-medium": createTheme(
    {
      background: "#282828",
      surface: "#3c3836",
      text: "#ebdbb2",
      textSecondary: "#d5c4a1",
      accent: "#83a598",
      glass: "rgba(60, 56, 54, 0.8)",
      border: "rgba(131, 165, 152, 0.3)",
      error: "#fb4934",
      overlay: "rgba(40, 40, 40, 0.95)",
      overlayForeground: "#ebdbb2",
    },
    true,
  ),
  "gruvbox-dark-soft": createTheme(
    {
      background: "#32302f",
      surface: "#3c3836",
      text: "#ebdbb2",
      textSecondary: "#d5c4a1",
      accent: "#83a598",
      glass: "rgba(60, 56, 54, 0.8)",
      border: "rgba(131, 165, 152, 0.3)",
      error: "#fb4934",
      overlay: "rgba(50, 48, 47, 0.95)",
      overlayForeground: "#ebdbb2",
    },
    true,
  ),
  darcula: createTheme(
    {
      background: "#2b2b2b",
      surface: "#323232",
      text: "#a9b7c6",
      textSecondary: "#808080",
      accent: "#6897bb",
      glass: "rgba(50, 50, 50, 0.8)",
      border: "rgba(104, 151, 187, 0.3)",
      error: "#ff6b68",
      overlay: "rgba(43, 43, 43, 0.95)",
      overlayForeground: "#a9b7c6",
    },
    true,
  ),
};

export const DEFAULT_THEME_MODE: ThemeMode = "dark";

export const THEME_OPTIONS: readonly { id: ThemeMode; name: string }[] = [
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
] as const;

export const THEME_PALETTE: Record<ThemeMode, readonly [string, string, string]> = {
  light: ["#f2f2f7", "#ffffff", "#007AFF"],
  dark: ["#000000", "#1a1a1a", "#0567d1"],
  nord: ["#2E3440", "#3B4252", "#88C0D0"],
  catppuccin: ["#1E1E2E", "#313244", "#89B4FA"],
  "tokyo-night": ["#1a1b26", "#24283b", "#7aa2f7"],
  "tokyo-night-storm": ["#24283b", "#414868", "#7aa2f7"],
  "tokyo-night-moon": ["#222436", "#2f334d", "#82aaff"],
  "one-dark": ["#282c34", "#2c313a", "#61afef"],
  "gruvbox-dark-hard": ["#1d2021", "#282828", "#83a598"],
  "gruvbox-dark-medium": ["#282828", "#3c3836", "#83a598"],
  "gruvbox-dark-soft": ["#32302f", "#3c3836", "#83a598"],
  darcula: ["#2b2b2b", "#323232", "#6897bb"],
  system: ["#000000", "#1a1a1a", "#007AFF"],
};

export const resolveThemeMode = (
  themeMode: ThemeMode,
  systemColorScheme: "light" | "dark" | null | undefined,
): ResolvedThemeMode => {
  if (themeMode === "system") {
    return systemColorScheme === "light" ? "light" : "dark";
  }

  return themeMode;
};

export const getTheme = (themeMode: ResolvedThemeMode): Theme => THEMES[themeMode];
