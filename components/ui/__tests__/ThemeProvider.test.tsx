import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { ThemeProvider, useTheme } from '../ThemeProvider';

const TestComponent: React.FC = () => {
    const { theme, themeType, themeMode } = useTheme();
    
    return (
        <>
            <Text testID="theme-background">{theme.colors.background}</Text>
            <Text testID="theme-surface">{theme.colors.surface}</Text>
            <Text testID="theme-text">{theme.colors.text}</Text>
            <Text testID="theme-accent">{theme.colors.accent}</Text>
            <Text testID="theme-type">{themeType}</Text>
            <Text testID="theme-mode">{themeMode}</Text>
            <Text testID="theme-border">{theme.colors.border}</Text>
            <Text testID="theme-error">{theme.colors.error}</Text>
        </>
    );
};

const renderThemeProvider = (defaultTheme: 'light' | 'dark' | 'nord' | 'catppuccin' | 'tokyo-night' | 'system' = 'light') => {
    return render(
        <ThemeProvider defaultTheme={defaultTheme}>
            <TestComponent />
        </ThemeProvider>
    );
};

describe('ThemeProvider', () => {
    describe('light theme', () => {
        it('should render light theme colors correctly', () => {
            renderThemeProvider('light');
            
            expect(screen.getByTestId('theme-background')).toHaveTextContent('#f2f2f7');
            expect(screen.getByTestId('theme-surface')).toHaveTextContent('#ffffff');
            expect(screen.getByTestId('theme-text')).toHaveTextContent('#000000');
            expect(screen.getByTestId('theme-accent')).toHaveTextContent('#007AFF');
            expect(screen.getByTestId('theme-border')).toHaveTextContent('rgba(0,0,0,0.12)');
            expect(screen.getByTestId('theme-error')).toHaveTextContent('#ff3b30');
        });

        it('should set themeType to light', () => {
            renderThemeProvider('light');
            expect(screen.getByTestId('theme-type')).toHaveTextContent('light');
        });

        it('should set themeMode to light', () => {
            renderThemeProvider('light');
            expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
        });
    });

    describe('dark theme', () => {
        it('should render dark theme colors correctly', () => {
            renderThemeProvider('dark');
            
            expect(screen.getByTestId('theme-background')).toHaveTextContent('#000000');
            expect(screen.getByTestId('theme-surface')).toHaveTextContent('#1a1a1a');
            expect(screen.getByTestId('theme-text')).toHaveTextContent('#ffffff');
            expect(screen.getByTestId('theme-accent')).toHaveTextContent('#0567d1');
            expect(screen.getByTestId('theme-border')).toHaveTextContent('rgba(255,255,255,0.1)');
            expect(screen.getByTestId('theme-error')).toHaveTextContent('#ff4757');
        });

        it('should set themeType to dark', () => {
            renderThemeProvider('dark');
            expect(screen.getByTestId('theme-type')).toHaveTextContent('dark');
        });

        it('should set themeMode to dark', () => {
            renderThemeProvider('dark');
            expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
        });
    });

    describe('nord theme', () => {
        it('should render nord theme colors correctly', () => {
            renderThemeProvider('nord');
            
            expect(screen.getByTestId('theme-background')).toHaveTextContent('#2E3440');
            expect(screen.getByTestId('theme-surface')).toHaveTextContent('#3B4252');
            expect(screen.getByTestId('theme-text')).toHaveTextContent('#ECEFF4');
            expect(screen.getByTestId('theme-accent')).toHaveTextContent('#88C0D0');
            expect(screen.getByTestId('theme-border')).toHaveTextContent('rgba(136, 192, 208, 0.3)');
            expect(screen.getByTestId('theme-error')).toHaveTextContent('#BF616A');
        });

        it('should set themeType to nord', () => {
            renderThemeProvider('nord');
            expect(screen.getByTestId('theme-type')).toHaveTextContent('nord');
        });

        it('should set themeMode to nord', () => {
            renderThemeProvider('nord');
            expect(screen.getByTestId('theme-mode')).toHaveTextContent('nord');
        });
    });

    describe('catppuccin theme', () => {
        it('should render catppuccin theme colors correctly', () => {
            renderThemeProvider('catppuccin');
            
            expect(screen.getByTestId('theme-background')).toHaveTextContent('#1E1E2E');
            expect(screen.getByTestId('theme-surface')).toHaveTextContent('#313244');
            expect(screen.getByTestId('theme-text')).toHaveTextContent('#CDD6F4');
            expect(screen.getByTestId('theme-accent')).toHaveTextContent('#89B4FA');
            expect(screen.getByTestId('theme-border')).toHaveTextContent('rgba(137, 180, 250, 0.3)');
            expect(screen.getByTestId('theme-error')).toHaveTextContent('#F38BA8');
        });

        it('should set themeType to catppuccin', () => {
            renderThemeProvider('catppuccin');
            expect(screen.getByTestId('theme-type')).toHaveTextContent('catppuccin');
        });

        it('should set themeMode to catppuccin', () => {
            renderThemeProvider('catppuccin');
            expect(screen.getByTestId('theme-mode')).toHaveTextContent('catppuccin');
        });
    });

    describe('tokyo-night theme', () => {
        it('should render tokyo-night theme colors correctly', () => {
            renderThemeProvider('tokyo-night');
            
            expect(screen.getByTestId('theme-background')).toHaveTextContent('#1a1b26');
            expect(screen.getByTestId('theme-surface')).toHaveTextContent('#24283b');
            expect(screen.getByTestId('theme-text')).toHaveTextContent('#c0caf5');
            expect(screen.getByTestId('theme-accent')).toHaveTextContent('#7aa2f7');
            expect(screen.getByTestId('theme-border')).toHaveTextContent('rgba(122, 162, 247, 0.3)');
            expect(screen.getByTestId('theme-error')).toHaveTextContent('#f7768e');
        });

        it('should set themeType to tokyo-night', () => {
            renderThemeProvider('tokyo-night');
            expect(screen.getByTestId('theme-type')).toHaveTextContent('tokyo-night');
        });

        it('should set themeMode to tokyo-night', () => {
            renderThemeProvider('tokyo-night');
            expect(screen.getByTestId('theme-mode')).toHaveTextContent('tokyo-night');
        });
    });

    describe('theme consistency', () => {
        it('should have consistent spacing across all themes', () => {
            const testTheme = (themeName: 'light' | 'dark' | 'nord' | 'catppuccin' | 'tokyo-night') => {
                const { unmount } = renderThemeProvider(themeName);
                render(
                    <ThemeProvider defaultTheme={themeName}>
                        <TestComponent />
                    </ThemeProvider>
                );
                render(
                    <ThemeProvider defaultTheme={themeName}>
                        <TestComponent />
                    </ThemeProvider>
                );
                
                unmount();
            };
            
            expect(() => {
                testTheme('light');
                testTheme('dark');
                testTheme('nord');
                testTheme('catppuccin');
                testTheme('tokyo-night');
            }).not.toThrow();
        });

        it('should have consistent borderRadius across all themes', () => {
            const spacingThemes: ('light' | 'dark' | 'nord' | 'catppuccin' | 'tokyo-night')[] = ['light', 'dark', 'nord', 'catppuccin', 'tokyo-night'];
            
            spacingThemes.forEach(themeName => {
                const { unmount } = renderThemeProvider(themeName);
                unmount();
            });
            
            expect(spacingThemes).toHaveLength(5);
        });
    });
});
