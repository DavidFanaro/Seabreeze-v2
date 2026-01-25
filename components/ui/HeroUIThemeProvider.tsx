/**
 * @file HeroUIThemeProvider.tsx
 * @purpose Map app theme colors to HeroUI's oklch color space
 */

// React imports for state management and context creation
import React, { useEffect, createContext, useContext, ReactNode } from "react";
// Import the main theme provider to sync with app-wide theme
import { useTheme } from "./ThemeProvider";

// ============================================================================
// TYPE DEFINITIONS SECTION
// ============================================================================

/**
 * Interface defining the shape of the HeroUI theme context
 * @interface HeroUIThemeContextType
 * @property {string} heroTheme - Current HeroUI theme name (e.g., "ocean-light")
 * @property {(theme: string) => void} setHeroTheme - Function to update the HeroUI theme
 */
interface HeroUIThemeContextType {
    heroTheme: string;
    setHeroTheme: (theme: string) => void;
}

// ============================================================================
// CONTEXT CREATION SECTION
// ============================================================================

/**
 * React context for managing HeroUI theme state across the application
 * Provides access to the current HeroUI theme and setter function
 * Undefined by default to enforce provider usage via useHeroUITheme hook
 */
const HeroUIThemeContext = createContext<HeroUIThemeContextType | undefined>(undefined);

// ============================================================================
// THEME MAPPING CONFIGURATION SECTION
// ============================================================================

/**
 * Maps the app's built-in theme types to their corresponding HeroUI theme names
 * This configuration serves as the bridge between our app theme system and HeroUI's theming
 * @const {Record<string, string>} THEME_MAPPINGS
 * @example Mapping "light" -> "ocean-light" converts app theme to HeroUI theme
 */
export const THEME_MAPPINGS: Record<string, string> = {
    light: "ocean-light",           // Maps light app theme to ocean HeroUI variant
    dark: "ocean-dark",             // Maps dark app theme to ocean HeroUI variant  
    nord: "nord-dark",              // Maps nord app theme to nord HeroUI variant
    catppuccin: "catppuccin-dark",  // Maps catppuccin app theme to catppuccin HeroUI variant
    "tokyo-night": "tokyo-night-dark", // Maps tokyo-night app theme to tokyo-night HeroUI variant
};

// ============================================================================
// COMPONENT PROPS SECTION
// ============================================================================

/**
 * Props interface for the HeroUIThemeProvider component
 * @interface HeroUIThemeProviderProps
 * @property {ReactNode} children - Child components that will have access to the HeroUI theme context
 */
interface HeroUIThemeProviderProps {
    children: ReactNode;
}

// ============================================================================
// MAIN PROVIDER COMPONENT SECTION
// ============================================================================

/**
 * HeroUIThemeProvider - Main theme synchronization component
 * 
 * This component bridges the gap between the app's theme system and HeroUI's theming
 * It automatically updates the HeroUI theme whenever the app theme changes
 * 
 * @component
 * @param {HeroUIThemeProviderProps} props - Component props containing children
 * @returns {JSX.Element} Context provider wrapping children with theme state
 * 
 * @example
 * ```tsx
 * <HeroUIThemeProvider>
 *   <App />
 * </HeroUIThemeProvider>
 * ```
 */
export const HeroUIThemeProvider: React.FC<HeroUIThemeProviderProps> = ({ children }) => {
    // Get the current app theme type from the main ThemeProvider
    const { themeType } = useTheme();
    
    // Local state to hold the current HeroUI theme name
    // Initialize with mapped theme or fallback to ocean-dark
    const [heroTheme, setHeroTheme] = React.useState(THEME_MAPPINGS[themeType] || "ocean-dark");

    // ============================================================================
    // THEME SYNCHRONIZATION EFFECT
    // ============================================================================

    /**
     * Effect hook that synchronizes HeroUI theme with app theme changes
     * Runs whenever themeType changes to ensure themes stay in sync
     * Uses THEME_MAPPINGS to convert app theme to HeroUI theme name
     */
    useEffect(() => {
        const newHeroTheme = THEME_MAPPINGS[themeType] || "ocean-dark";
        setHeroTheme(newHeroTheme);
    }, [themeType]); // Dependency array ensures effect runs on themeType changes

    // ============================================================================
    // CONTEXT PROVIDER RENDER
    // ============================================================================

    /**
     * Renders the context provider with current theme state
     * Makes heroTheme and setHeroTheme available to all child components
     * 
     * @returns {JSX.Element} Provider component with theme context value
     */
    return (
        <HeroUIThemeContext.Provider value={{ heroTheme, setHeroTheme }}>
            {children}
        </HeroUIThemeContext.Provider>
    );
};

// ============================================================================
// CUSTOM HOOK SECTION
// ============================================================================

/**
 * Custom hook for accessing HeroUI theme context
 * Provides type-safe access to the heroTheme state and setter function
 * Throws an error if used outside of HeroUIThemeProvider to enforce proper usage
 * 
 * @hook useHeroUITheme
 * @returns {HeroUIThemeContextType} Object containing heroTheme and setHeroTheme
 * @throws {Error} If used outside HeroUIThemeProvider
 * 
 * @example
 * ```tsx
 * const { heroTheme, setHeroTheme } = useHeroUITheme();
 * console.log('Current theme:', heroTheme);
 * ```
 */
export const useHeroUITheme = (): HeroUIThemeContextType => {
    // Get the current context value
    const context = useContext(HeroUIThemeContext);
    
    // Error handling to ensure hook is used within provider
    if (!context) {
        throw new Error("useHeroUITheme must be used within a HeroUIThemeProvider");
    }
    
    // Return the context value (heroTheme and setHeroTheme)
    return context;
};
