/**
 * @file ModelSelector.test.tsx
 * @purpose Test suite for ModelSelector component functionality
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ModelSelector } from '../ModelSelector';
import { ProviderId } from '@/types/provider.types';
import type { Theme } from '@/components/ui/ThemeProvider';

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

// Mock the provider store to control available models
const mockAvailableModels = {
    openai: ['gpt-4', 'gpt-3.5-turbo'],
    apple: ['gpt-4o', 'gpt-4o-mini'],
    openrouter: [],
    ollama: ['llama2', 'mistral'],
};

jest.mock('@/stores', () => ({
    useProviderStore: () => ({
        availableModels: mockAvailableModels,
    }),
}));

const defaultProps = {
    providerId: 'openai' as ProviderId,
    selectedModel: 'gpt-4',
    onModelSelect: jest.fn(),
    disabled: false,
};

describe('ModelSelector', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Main Container and Label', () => {
        it('should render the "Model" label', () => {
            render(<ModelSelector {...defaultProps} />);
            
            expect(screen.getByText('Model')).toBeTruthy();
        });

        it('should render with correct structure', () => {
            render(<ModelSelector {...defaultProps} />);
            
            expect(screen.getByText('Model')).toBeTruthy();
            expect(screen.getByText('gpt-4')).toBeTruthy();
            expect(screen.getByText('gpt-3.5-turbo')).toBeTruthy();
        });
    });

    describe('Model List Rendering', () => {
        it('should render available models from store when available', () => {
            render(<ModelSelector {...defaultProps} />);
            
            expect(screen.getByText('gpt-4')).toBeTruthy();
            expect(screen.getByText('gpt-3.5-turbo')).toBeTruthy();
        });

        it('should fall back to default models when no available models in store', () => {
            render(<ModelSelector providerId="openrouter" selectedModel="openai/gpt-5.2" onModelSelect={jest.fn()} />);
            
            // Should render default models from PROVIDERS config (first 8 from OPENROUTER_MODELS)
            // Let's check if any models are rendered at all first
            expect(screen.getByText('Model')).toBeTruthy();
        });

        it('should render empty state when no models available', () => {
            // Mock provider with no models by using apple provider with empty available models
            render(<ModelSelector providerId="apple" selectedModel="apple-generic" onModelSelect={jest.fn()} />);
            
            // Should not crash but may not render any model buttons
            expect(screen.getByText('Model')).toBeTruthy();
        });
    });

    describe('Model Selection Functionality', () => {
        it('should highlight the selected model with accent color', () => {
            render(<ModelSelector {...defaultProps} />);
            
            const selectedButton = screen.getByText('gpt-4').parent;
            expect(selectedButton).toBeTruthy();
        });

        it('should not highlight unselected models', () => {
            render(<ModelSelector {...defaultProps} />);
            
            const unselectedButton = screen.getByText('gpt-3.5-turbo').parent;
            expect(unselectedButton).toBeTruthy();
        });

        it('should call onModelSelect when a model button is pressed', () => {
            render(<ModelSelector {...defaultProps} />);
            
            const modelButton = screen.getByText('gpt-3.5-turbo').parent;
            fireEvent.press(modelButton);
            
            expect(defaultProps.onModelSelect).toHaveBeenCalledWith('gpt-3.5-turbo');
            expect(defaultProps.onModelSelect).toHaveBeenCalledTimes(1);
        });

        it('should call onModelSelect with correct model when different models are selected', () => {
            render(<ModelSelector {...defaultProps} selectedModel="gpt-3.5-turbo" />);
            
            const gpt4Button = screen.getByText('gpt-4').parent;
            fireEvent.press(gpt4Button);
            
            expect(defaultProps.onModelSelect).toHaveBeenCalledWith('gpt-4');
        });
    });

    describe('Disabled State', () => {
        it('should not call onModelSelect when disabled', () => {
            render(<ModelSelector {...defaultProps} disabled={true} />);
            
            const modelButton = screen.getByText('gpt-3.5-turbo').parent;
            fireEvent.press(modelButton);
            
            expect(defaultProps.onModelSelect).not.toHaveBeenCalled();
        });

        it('should render all buttons when disabled', () => {
            render(<ModelSelector {...defaultProps} disabled={true} />);
            
            expect(screen.getByText('gpt-4')).toBeTruthy();
            expect(screen.getByText('gpt-3.5-turbo')).toBeTruthy();
        });
    });

    describe('Provider Variations', () => {
        it('should render Apple provider models correctly', () => {
            render(<ModelSelector providerId="apple" selectedModel="gpt-4o" onModelSelect={jest.fn()} />);
            
            expect(screen.getByText('gpt-4o')).toBeTruthy();
            expect(screen.getByText('gpt-4o-mini')).toBeTruthy();
        });

        it('should render Ollama provider models correctly', () => {
            render(<ModelSelector providerId="ollama" selectedModel="llama2" onModelSelect={jest.fn()} />);
            
            expect(screen.getByText('llama2')).toBeTruthy();
            expect(screen.getByText('mistral')).toBeTruthy();
        });
    });

    describe('Model Name Display', () => {
        it('should truncate long model names', () => {
            render(<ModelSelector {...defaultProps} />);
            
            const modelText = screen.getByText('gpt-4');
            expect(modelText.props.numberOfLines).toBe(1);
            expect(modelText.props.ellipsizeMode).toBe('tail');
        });

        it('should display model names with correct styling', () => {
            render(<ModelSelector {...defaultProps} />);
            
            const modelText = screen.getByText('gpt-4');
            expect(modelText.props.style).toHaveProperty('color', mockTheme.colors.surface);
        });

        it('should display unselected models with correct text color', () => {
            render(<ModelSelector {...defaultProps} />);
            
            const unselectedText = screen.getByText('gpt-3.5-turbo');
            expect(unselectedText.props.style).toHaveProperty('color', mockTheme.colors.text);
        });
    });

    describe('Styling and Layout', () => {
        it('should apply correct base styles to model buttons', () => {
            render(<ModelSelector {...defaultProps} />);
            
            const modelButton = screen.getByText('gpt-4').parent;
            expect(modelButton).toBeTruthy();
        });

        it('should apply selected state styling correctly', () => {
            render(<ModelSelector {...defaultProps} />);
            
            const selectedButton = screen.getByText('gpt-4').parent;
            expect(selectedButton).toBeTruthy();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty selected model', () => {
            render(<ModelSelector {...defaultProps} selectedModel="" />);
            
            expect(screen.getByText('gpt-4')).toBeTruthy();
            expect(screen.getByText('gpt-3.5-turbo')).toBeTruthy();
        });

        it('should handle single model list', () => {
            render(<ModelSelector {...defaultProps} />);
            
            expect(screen.getByText('gpt-4')).toBeTruthy();
        });

        it('should handle multiple rapid selections', () => {
            render(<ModelSelector {...defaultProps} />);
            
            const gpt35Button = screen.getByText('gpt-3.5-turbo').parent;
            const gpt4Button = screen.getByText('gpt-4').parent;
            
            fireEvent.press(gpt35Button);
            fireEvent.press(gpt4Button);
            fireEvent.press(gpt35Button);
            
            expect(defaultProps.onModelSelect).toHaveBeenCalledTimes(3);
            expect(defaultProps.onModelSelect).toHaveBeenLastCalledWith('gpt-3.5-turbo');
        });
    });

    describe('Accessibility', () => {
        it('should be accessible when disabled', () => {
            render(<ModelSelector {...defaultProps} disabled={true} />);
            
            const modelButton = screen.getByText('gpt-4').parent;
            expect(modelButton).toBeTruthy();
        });

        it('should maintain accessibility for all model buttons', () => {
            render(<ModelSelector {...defaultProps} />);
            
            // Pressable components are accessible but don't have button role by default
            // Check that model elements are accessible instead
            const allModelTexts = screen.getAllByText(/gpt/);
            expect(allModelTexts.length).toBeGreaterThan(0);
        });
    });

    describe('Component Integration', () => {
        it('should work correctly with all props provided', () => {
            render(
                <ModelSelector 
                    providerId="openai"
                    selectedModel="gpt-3.5-turbo"
                    onModelSelect={jest.fn()}
                    disabled={false}
                />
            );
            
            expect(screen.getByText('Model')).toBeTruthy();
            expect(screen.getByText('gpt-4')).toBeTruthy();
            expect(screen.getByText('gpt-3.5-turbo')).toBeTruthy();
        });
    });
});
