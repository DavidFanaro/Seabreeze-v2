/**
 * @file HeroUIThemeProvider.tsx
 * @purpose Map app theme colors to HeroUI's oklch color space
 */

import React, { useEffect, createContext, useContext, ReactNode } from "react";
import { useTheme } from "./ThemeProvider";

interface HeroUIThemeContextType {
    heroTheme: string;
    setHeroTheme: (theme: string) => void;
}

const HeroUIThemeContext = createContext<HeroUIThemeContextType | undefined>(undefined);

const THEME_MAPPINGS: Record<string, string> = {
    light: "ocean-light",
    dark: "ocean-dark",
    nord: "nord-dark",
    catppuccin: "catppuccin-dark",
    "tokyo-night": "tokyo-night-dark",
};

interface HeroUIThemeProviderProps {
    children: ReactNode;
}

export const HeroUIThemeProvider: React.FC<HeroUIThemeProviderProps> = ({ children }) => {
    const { themeType } = useTheme();
    const [heroTheme, setHeroTheme] = React.useState(THEME_MAPPINGS[themeType] || "ocean-dark");

    useEffect(() => {
        const newHeroTheme = THEME_MAPPINGS[themeType] || "ocean-dark";
        setHeroTheme(newHeroTheme);
    }, [themeType]);

    return (
        <HeroUIThemeContext.Provider value={{ heroTheme, setHeroTheme }}>
            {children}
        </HeroUIThemeContext.Provider>
    );
};

export const useHeroUITheme = (): HeroUIThemeContextType => {
    const context = useContext(HeroUIThemeContext);
    if (!context) {
        throw new Error("useHeroUITheme must be used within a HeroUIThemeProvider");
    }
    return context;
};
