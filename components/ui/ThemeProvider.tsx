import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";

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
    };
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
    borderRadius: {
        sm: number;
        md: number;
        lg: number;
        full: number;
    };
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
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 20,
        full: 9999,
    },
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
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 20,
        full: 9999,
    },
};

export type ThemeMode = "light" | "dark" | "system";
type ThemeType = "light" | "dark";

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

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultTheme = "dark",
}) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState<ThemeMode>(defaultTheme);

    // Determine actual theme type based on mode
    const themeType: ThemeType = themeMode === "system" 
        ? (systemColorScheme === "light" ? "light" : "dark")
        : themeMode;

    const theme = themeType === "light" ? lightTheme : darkTheme;

    const toggleTheme = () => {
        setThemeMode((prev) => {
            if (prev === "light") return "dark";
            if (prev === "dark") return "light";
            // If system, toggle to opposite of current system theme
            return systemColorScheme === "light" ? "dark" : "light";
        });
    };

    const setThemeType = (type: ThemeType) => {
        setThemeMode(type);
    };

    const setTheme = (mode: ThemeMode) => {
        setThemeMode(mode);
    };

    return (
        <ThemeContext.Provider
            value={{ theme, themeType, themeMode, toggleTheme, setThemeType, setTheme }}
        >
            {children}
        </ThemeContext.Provider>
    );
};
