import React, { createContext, useContext, useState, ReactNode } from "react";

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

type ThemeType = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    themeType: ThemeType;
    toggleTheme: () => void;
    setThemeType: (type: ThemeType) => void;
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
    defaultTheme?: ThemeType;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultTheme = "dark",
}) => {
    const [themeType, setThemeType] = useState<ThemeType>(defaultTheme);

    const theme = themeType === "light" ? lightTheme : darkTheme;

    const toggleTheme = () => {
        setThemeType((prev) => (prev === "light" ? "dark" : "light"));
    };

    return (
        <ThemeContext.Provider
            value={{ theme, themeType, toggleTheme, setThemeType }}
        >
            {children}
        </ThemeContext.Provider>
    );
};
