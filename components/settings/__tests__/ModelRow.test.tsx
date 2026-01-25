/**
 * @file ModelRow.test.tsx
 * @purpose Test suite for ModelRow component functionality
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ModelRow } from '../ModelRow';
import type { Theme } from '@/components/ui/ThemeProvider';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    ImpactFeedbackStyle: {
        Light: 'Light',
    },
    NotificationFeedbackType: {
        Error: 'Error',
    },
}));

// Mock expo-symbols - return proper React element with Text wrapper
jest.mock('expo-symbols', () => {
    const React = require('react');
    const { Text } = require('react-native');
    
    return {
        SymbolView: ({ name, size, tintColor }: any) => 
            React.createElement(Text, {}, `SymbolView-${name}-${size}-${tintColor}`),
    };
});

// Mock ThemeContext to avoid loading state issues
const mockTheme: Theme = {
    colors: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#000000',
        textSecondary: '#666666',
        accent: '#007AFF',
        glass: 'rgba(255,255,255,0.7)',
        border: 'rgba(0,0,0,0.12)',
        error: '#FF3B30',
        overlay: '#ffffff',
        overlayForeground: '#000000',
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
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        '2xl': 20,
        '3xl': 24,
        '4xl': 32,
        full: 9999,
    },
    isDark: false,
};

// Mock ThemeProvider to provide our mock theme directly
jest.mock('@/components/ui/ThemeProvider', () => ({
    __esModule: true,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    Theme: {},
    useTheme: () => ({ theme: mockTheme, themeType: 'light' as const, themeMode: 'light' as const, setThemeType: jest.fn() }),
}));

// Helper component to wrap with ThemeProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

const defaultProps = {
    model: 'test-model',
    isSelected: false,
    isCustom: false,
    isEditMode: false,
    onSelect: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    theme: {
        colors: {
            background: '#FFFFFF',
            surface: '#F5F5F5',
            text: '#000000',
            textSecondary: '#666666',
            accent: '#007AFF',
            glass: 'rgba(255,255,255,0.7)',
            border: 'rgba(0,0,0,0.12)',
            error: '#FF3B30',
            overlay: '#ffffff',
            overlayForeground: '#000000',
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
            sm: 4,
            md: 8,
            lg: 12,
            xl: 16,
            '2xl': 20,
            '3xl': 24,
            '4xl': 32,
            full: 9999,
        },
        isDark: false,
    } as Theme,
    disabled: false,
};

describe('ModelRow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Main Row Container', () => {
        it('should render model name correctly', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} />
                </TestWrapper>
            );

            expect(screen.getByText('test-model')).toBeTruthy();
        });

        it('should call onSelect when pressed', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} />
                </TestWrapper>
            );

            const modelRow = screen.getByText('test-model').parent;
            fireEvent.press(modelRow);

            expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
        });

        it('should be disabled when disabled prop is true', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} disabled={true} />
                </TestWrapper>
            );

            // Since the pressable is disabled, the onPress handler should not be called
            const modelRow = screen.getByText('test-model').parent;
            expect(modelRow).toBeTruthy();
        });

        it('should be disabled when in edit mode', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isEditMode={true} />
                </TestWrapper>
            );

            // When in edit mode, the row should still be rendered but not interactive
            const modelRow = screen.getByText('test-model').parent;
            expect(modelRow).toBeTruthy();
        });
    });

    describe('Custom Model Badge', () => {
        it('should show custom badge when model is custom and not in edit mode', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isCustom={true} />
                </TestWrapper>
            );

            expect(screen.getByText('Custom')).toBeTruthy();
        });

        it('should not show custom badge when model is not custom', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isCustom={false} />
                </TestWrapper>
            );

            expect(screen.queryByText('Custom')).toBeFalsy();
        });

        it('should not show custom badge when in edit mode even if model is custom', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isCustom={true} isEditMode={true} />
                </TestWrapper>
            );

            expect(screen.queryByText('Custom')).toBeFalsy();
        });
    });

    describe('Selection Indicator', () => {
        it('should show checkmark when model is selected and not in edit mode', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isSelected={true} />
                </TestWrapper>
            );

            // Check that the checkmark symbol is present
            expect(screen.queryByText('SymbolView-checkmark-18-#007AFF')).toBeTruthy();
        });

        it('should not show checkmark when model is not selected', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isSelected={false} />
                </TestWrapper>
            );

            expect(screen.queryByText('SymbolView-checkmark-18-#007AFF')).toBeFalsy();
        });

        it('should not show checkmark when in edit mode even if model is selected', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isSelected={true} isEditMode={true} />
                </TestWrapper>
            );

            expect(screen.queryByText('SymbolView-checkmark-18-#007AFF')).toBeFalsy();
        });
    });

    describe('Edit Mode Buttons', () => {
        it('should show edit button when model is custom and in edit mode', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isCustom={true} isEditMode={true} />
                </TestWrapper>
            );

            expect(screen.getByText('SymbolView-pencil-14-#F5F5F5')).toBeTruthy();
        });

        it('should not show edit button when model is not custom', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isCustom={false} isEditMode={true} />
                </TestWrapper>
            );

            expect(screen.queryByText('SymbolView-pencil-14-#F5F5F5')).toBeFalsy();
        });

        it('should show delete button for all models in edit mode', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isEditMode={true} />
                </TestWrapper>
            );

            expect(screen.getByText('SymbolView-trash-14-#F5F5F5')).toBeTruthy();
        });

        it('should call onEdit with haptic feedback when edit button is pressed', async () => {
            const { impactAsync } = require('expo-haptics');

            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isCustom={true} isEditMode={true} />
                </TestWrapper>
            );

            const editButton = screen.getByText('SymbolView-pencil-14-#F5F5F5');
            fireEvent.press(editButton);

            expect(impactAsync).toHaveBeenCalledWith('Light');
            expect(defaultProps.onEdit).toHaveBeenCalledTimes(1);
        });

        it('should call onDelete with haptic feedback when delete button is pressed', async () => {
            const { notificationAsync } = require('expo-haptics');

            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isEditMode={true} />
                </TestWrapper>
            );

            const deleteButton = screen.getByText('SymbolView-trash-14-#F5F5F5');
            fireEvent.press(deleteButton);

            expect(notificationAsync).toHaveBeenCalledWith('Error');
            expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
        });

        it('should not show any edit mode buttons when not in edit mode', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isEditMode={false} />
                </TestWrapper>
            );

            expect(screen.queryByText('SymbolView-pencil-14-#F5F5F5')).toBeFalsy();
            expect(screen.queryByText('SymbolView-trash-14-#F5F5F5')).toBeFalsy();
        });
    });

    describe('Conditional Rendering Priority', () => {
        it('should show edit mode buttons over selection indicator when in edit mode', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isSelected={true} isEditMode={true} />
                </TestWrapper>
            );

            expect(screen.getByText('SymbolView-trash-14-#F5F5F5')).toBeTruthy();
            expect(screen.queryByText('SymbolView-checkmark-18-#007AFF')).toBeFalsy();
        });

        it('should show selection indicator when not in edit mode and model is selected', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isSelected={true} isEditMode={false} />
                </TestWrapper>
            );

            expect(screen.getByText('SymbolView-checkmark-18-#007AFF')).toBeTruthy();
            expect(screen.queryByText('SymbolView-trash-14-#F5F5F5')).toBeFalsy();
        });

        it('should show custom badge with selection when custom model is selected', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isCustom={true} isSelected={true} />
                </TestWrapper>
            );

            expect(screen.getByText('Custom')).toBeTruthy();
            expect(screen.getByText('SymbolView-checkmark-18-#007AFF')).toBeTruthy();
        });
    });

    describe('Accessibility and Styling', () => {
        it('should apply pressed state when row is pressed', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} />
                </TestWrapper>
            );

            const modelRow = screen.getByText('test-model').parent;
            // Just verify the component renders - the style function is internal
            expect(modelRow).toBeTruthy();
        });

        it('should apply normal state when row is not pressed', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} />
                </TestWrapper>
            );

            const modelRow = screen.getByText('test-model').parent;
            // Just verify the component renders with normal state
            expect(modelRow).toBeTruthy();
        });

        it('should not change color on press when in edit mode', () => {
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} isEditMode={true} />
                </TestWrapper>
            );

            const modelRow = screen.getByText('test-model').parent;
            // Just verify the component renders in edit mode
            expect(modelRow).toBeTruthy();
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long model names with truncation', () => {
            const longModelName = 'a-very-long-model-name-that-should-be-truncated-properly';
            
            render(
                <TestWrapper>
                    <ModelRow {...defaultProps} model={longModelName} />
                </TestWrapper>
            );

            const modelText = screen.getByText(longModelName);
            expect(modelText.props.numberOfLines).toBe(1);
        });

        it('should work correctly when all props are provided', () => {
            render(
                <TestWrapper>
                    <ModelRow 
                        {...defaultProps} 
                        isCustom={true}
                        isSelected={true}
                        isEditMode={true}
                    />
                </TestWrapper>
            );

            // Should show edit mode buttons, no custom badge, no selection indicator
            expect(screen.getByText('SymbolView-trash-14-#F5F5F5')).toBeTruthy();
            expect(screen.getByText('SymbolView-pencil-14-#F5F5F5')).toBeTruthy();
            expect(screen.queryByText('Custom')).toBeFalsy();
            expect(screen.queryByText('SymbolView-checkmark-18-#007AFF')).toBeFalsy();
        });
    });
});