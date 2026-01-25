import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { HeroUIThemeProvider, useHeroUITheme } from '../HeroUIThemeProvider';

// Mock the useTheme hook to avoid complex dependencies
jest.mock('../ThemeProvider', () => ({
    useTheme: () => ({
        themeType: 'light',
        theme: {
            colors: { background: '#ffffff', surface: '#ffffff', text: '#000000', textSecondary: '#8e8e93', accent: '#007AFF', glass: 'rgba(255,255,255,0.7)', border: 'rgba(0,0,0,0.12)', error: '#ff3b30', overlay: '#ffffff', overlayForeground: '#000000' },
            spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
            borderRadius: { xs: 2, sm: 8, md: 12, lg: 20, xl: 24, '2xl': 32, '3xl': 48, '4xl': 64, full: 9999 },
            isDark: false,
        },
        themeMode: 'light',
        toggleTheme: jest.fn(),
        setThemeType: jest.fn(),
        setTheme: jest.fn(),
    }),
}));

// Test component to access HeroUI theme context
const TestComponent: React.FC = () => {
    const { heroTheme, setHeroTheme } = useHeroUITheme();
    
    return (
        <>
            <Text testID="hero-theme">{heroTheme}</Text>
            <Text testID="set-hero-theme-available">{typeof setHeroTheme}</Text>
        </>
    );
};

describe('HeroUIThemeProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============================================================================
    // CONTEXT PROVIDER TESTS
    // ============================================================================

    describe('context provider', () => {
        it('should provide heroTheme context value', () => {
            render(
                <HeroUIThemeProvider>
                    <TestComponent />
                </HeroUIThemeProvider>
            );
            
            expect(screen.getByTestId('hero-theme')).toBeTruthy();
            expect(screen.getByTestId('hero-theme')).toHaveTextContent('ocean-light');
        });

        it('should provide setHeroTheme function', () => {
            render(
                <HeroUIThemeProvider>
                    <TestComponent />
                </HeroUIThemeProvider>
            );
            
            expect(screen.getByTestId('set-hero-theme-available')).toHaveTextContent('function');
        });
    });

    // ============================================================================
    // ERROR HANDLING TESTS
    // ============================================================================

    describe('error handling', () => {
        it('should throw error when useHeroUITheme is used outside provider', () => {
            const ComponentWithoutProvider: React.FC = () => {
                useHeroUITheme(); // This should throw
                return <Text>Should not render</Text>;
            };

            expect(() => {
                render(<ComponentWithoutProvider />);
            }).toThrow('useHeroUITheme must be used within a HeroUIThemeProvider');
        });
    });

    // ============================================================================
    // THEME MAPPING TESTS
    // ============================================================================

    describe('theme mappings', () => {
        it('should export correct THEME_MAPPINGS constant', () => {
            // Import the constant directly to test its value
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const HeroUIThemeProviderModule = require('../HeroUIThemeProvider');
            const { THEME_MAPPINGS } = HeroUIThemeProviderModule;
            
            const expectedMappings = {
                light: 'ocean-light',
                dark: 'ocean-dark',
                nord: 'nord-dark',
                catppuccin: 'catppuccin-dark',
                'tokyo-night': 'tokyo-night-dark'
            };

            expect(THEME_MAPPINGS).toEqual(expectedMappings);
        });

        it('should have all required theme mappings', () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const HeroUIThemeProviderModule = require('../HeroUIThemeProvider');
            const { THEME_MAPPINGS } = HeroUIThemeProviderModule;
            
            const requiredThemes = ['light', 'dark', 'nord', 'catppuccin', 'tokyo-night'];
            
            requiredThemes.forEach(theme => {
                expect(THEME_MAPPINGS[theme]).toBeDefined();
                expect(typeof THEME_MAPPINGS[theme]).toBe('string');
            });
        });
    });

    // ============================================================================
    // HOOK TESTS
    // ============================================================================

    describe('useHeroUITheme hook', () => {
        it('should return correct context shape', () => {
            render(
                <HeroUIThemeProvider>
                    <TestComponent />
                </HeroUIThemeProvider>
            );
            
            const heroTheme = screen.getByTestId('hero-theme').props.children;
            const setHeroThemeType = screen.getByTestId('set-hero-theme-available').props.children;
            
            expect(typeof heroTheme).toBe('string');
            expect(setHeroThemeType).toBe('function');
        });
    });

    // ============================================================================
    // COMPONENT EXPORT TESTS
    // ============================================================================

    describe('exports', () => {
        it('should export HeroUIThemeProvider and useHeroUITheme', () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const HeroUIThemeProviderModule = require('../HeroUIThemeProvider');
            
            expect(HeroUIThemeProviderModule.HeroUIThemeProvider).toBeDefined();
            expect(HeroUIThemeProviderModule.useHeroUITheme).toBeDefined();
            expect(typeof HeroUIThemeProviderModule.HeroUIThemeProvider).toBe('function');
            expect(typeof HeroUIThemeProviderModule.useHeroUITheme).toBe('function');
        });
    });
});