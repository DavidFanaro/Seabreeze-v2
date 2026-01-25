/**
 * @file ModelListManager.test.tsx
 * @purpose Test suite for ModelListManager component functionality
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import { ModelListManager } from '../ModelListManager';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import * as storesModule from '@/stores';

// Mock the entire stores module
jest.mock('@/stores');

// Mock ModelRow component  
jest.mock('../ModelRow', () => ({
    ModelRow: ({ model, isSelected, isCustom, isEditMode, onSelect, onEdit, onDelete, theme, disabled }: any) => {
        const { View, Text, Pressable } = require('react-native');
        return (
            <View 
                testID={`model-row-${model}`}
                onPress={onSelect}
                disabled={disabled || isEditMode}
            >
                <Text testID={`model-name-${model}`}>{model}</Text>
                {isCustom && !isEditMode && <Text testID="custom-badge">Custom</Text>}
                {isEditMode && (
                    <View>
                        {isCustom && <Text testID="edit-button" onPress={onEdit}>Edit</Text>}
                        <Text testID="delete-button" onPress={onDelete}>Delete</Text>
                    </View>
                )}
                {isSelected && !isEditMode && <Text testID="selected-indicator">✓</Text>}
            </View>
        );
    },
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
}));

// Mock expo-symbols
jest.mock('expo-symbols', () => ({
    SymbolView: ({ name, size, tintColor }: any) => 
        `SymbolView-${name}-${size}-${tintColor}`,
}));

// Helper component to wrap with ThemeProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider defaultTheme="light">
        {children}
    </ThemeProvider>
);

const defaultProps = {
    providerId: 'openai' as const,
    predefinedModels: ['gpt-3.5-turbo', 'gpt-4'],
    selectedModel: 'gpt-3.5-turbo',
    onModelSelect: jest.fn(),
    disabled: false,
};

describe('ModelListManager', () => {
    const mockStore = {
        customModels: { openai: ['custom-model-1'] },
        hiddenModels: { openai: ['hidden-model'] },
        addCustomModel: jest.fn(),
        editCustomModel: jest.fn(),
        deleteModel: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (storesModule.useProviderStore as any).mockReturnValue(mockStore);
        defaultProps.onModelSelect.mockClear();
    });

    describe('Header Section', () => {
        it('should render Models title and action buttons', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            expect(screen.getByText('Models')).toBeTruthy();
            expect(screen.getByText('Edit')).toBeTruthy();
            expect(screen.getByText('SymbolView-plus.circle.fill-22-#007AFF')).toBeTruthy();
        });

        it('should show Done button when in edit mode', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            const editButton = screen.getByText('Edit');
            fireEvent.press(editButton);

            expect(screen.getByText('Done')).toBeTruthy();
        });

        it('should hide Edit button when no models exist', () => {
            (storesModule.useProviderStore as any).mockReturnValue({
                ...mockStore,
                customModels: { openai: [] },
            });

            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        predefinedModels={[]}
                    />
                </TestWrapper>
            );

            expect(screen.queryByText('Edit')).toBeFalsy();
        });
    });

    describe('Add Model Section', () => {
        it('should show add model input when plus button is pressed', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            const addButton = screen.getByText('SymbolView-plus.circle.fill-22-#007AFF');
            fireEvent.press(addButton);

            expect(screen.getByPlaceholderText('Enter model name...')).toBeTruthy();
            expect(screen.getByText('SymbolView-xmark.circle.fill-24-#8E8E93')).toBeTruthy();
            expect(screen.getByText('SymbolView-checkmark.circle.fill-24-#8E8E93')).toBeTruthy();
        });

        it('should add model when save button is pressed with valid input', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            const addButton = screen.getByText('SymbolView-plus.circle.fill-22-#007AFF');
            fireEvent.press(addButton);

            const textInput = screen.getByPlaceholderText('Enter model name...');
            fireEvent.changeText(textInput, 'new-custom-model');

            const saveButton = screen.getByText('SymbolView-checkmark.circle.fill-24-#007AFF');
            fireEvent.press(saveButton);

            expect(mockStore.addCustomModel).toHaveBeenCalledWith('openai', 'new-custom-model');
            expect(defaultProps.onModelSelect).toHaveBeenCalledWith('new-custom-model');
        });

        it('should show duplicate alert when adding existing model', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            const addButton = screen.getByText('SymbolView-plus.circle.fill-22-#007AFF');
            fireEvent.press(addButton);

            const textInput = screen.getByPlaceholderText('Enter model name...');
            fireEvent.changeText(textInput, 'gpt-3.5-turbo'); // Existing model

            const saveButton = screen.getByText('SymbolView-checkmark.circle.fill-24-#007AFF');
            fireEvent.press(saveButton);

            expect(Alert.alert).toHaveBeenCalledWith('Duplicate', 'This model already exists.');
            expect(mockStore.addCustomModel).not.toHaveBeenCalled();
        });

        it('should cancel adding when cancel button is pressed', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            const addButton = screen.getByText('SymbolView-plus.circle.fill-22-#007AFF');
            fireEvent.press(addButton);

            const cancelButton = screen.getByText('SymbolView-xmark.circle.fill-24-#8E8E93');
            fireEvent.press(cancelButton);

            expect(screen.queryByPlaceholderText('Enter model name...')).toBeFalsy();
        });
    });

    describe('Edit Model Section', () => {
        it('should show edit input when edit button is pressed in edit mode', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            // Enter edit mode first
            const editButton = screen.getByText('Edit');
            fireEvent.press(editButton);

            // Find and press edit button for custom model
            const editModelButton = screen.getByText('SymbolView-pencil-18-#007AFF');
            fireEvent.press(editModelButton);

            expect(screen.getByDisplayValue('custom-model-1')).toBeTruthy();
            expect(screen.getByText('SymbolView-xmark.circle.fill-24-#8E8E93')).toBeTruthy();
            expect(screen.getByText('SymbolView-checkmark.circle.fill-24-#007AFF')).toBeTruthy();
        });

        it('should save edited model name', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            const editButton = screen.getByText('Edit');
            fireEvent.press(editButton);

            const editModelButton = screen.getByText('SymbolView-pencil-18-#007AFF');
            fireEvent.press(editModelButton);

            const textInput = screen.getByDisplayValue('custom-model-1');
            fireEvent.changeText(textInput, 'edited-model-name');

            const saveButton = screen.getByText('SymbolView-checkmark.circle.fill-24-#007AFF');
            fireEvent.press(saveButton);

            expect(mockStore.editCustomModel).toHaveBeenCalledWith('openai', 'custom-model-1', 'edited-model-name');
        });

        it('should update selected model if edited model was selected', () => {
            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        selectedModel="custom-model-1"
                    />
                </TestWrapper>
            );

            const editButton = screen.getByText('Edit');
            fireEvent.press(editButton);

            const editModelButton = screen.getByText('SymbolView-pencil-18-#007AFF');
            fireEvent.press(editModelButton);

            const textInput = screen.getByDisplayValue('custom-model-1');
            fireEvent.changeText(textInput, 'edited-model-name');

            const saveButton = screen.getByText('SymbolView-checkmark.circle.fill-24-#007AFF');
            fireEvent.press(saveButton);

            expect(defaultProps.onModelSelect).toHaveBeenCalledWith('edited-model-name');
        });
    });

    describe('Search Section', () => {
        it('should show search bar when there are more than 5 models', () => {
            const manyModels = Array.from({ length: 6 }, (_, i) => `model-${i}`);
            
            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        predefinedModels={manyModels}
                    />
                </TestWrapper>
            );

            expect(screen.getByPlaceholderText('Search models...')).toBeTruthy();
            expect(screen.getByText('SymbolView-magnifyingglass-16-#8E8E93')).toBeTruthy();
        });

        it('should filter models based on search query', () => {
            const models = ['gpt-3.5-turbo', 'gpt-4', 'claude-3', 'gemini-pro'];
            
            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        predefinedModels={models}
                    />
                </TestWrapper>
            );

            const searchInput = screen.getByPlaceholderText('Search models...');
            fireEvent.changeText(searchInput, 'gpt');

            expect(screen.getByText('gpt-3.5-turbo')).toBeTruthy();
            expect(screen.getByText('gpt-4')).toBeTruthy();
            expect(screen.queryByText('claude-3')).toBeFalsy();
            expect(screen.queryByText('gemini-pro')).toBeFalsy();
        });

        it('should show clear button when search query is entered', () => {
            const models = Array.from({ length: 6 }, (_, i) => `model-${i}`);
            
            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        predefinedModels={models}
                    />
                </TestWrapper>
            );

            const searchInput = screen.getByPlaceholderText('Search models...');
            fireEvent.changeText(searchInput, 'test');

            expect(screen.getByText('SymbolView-xmark.circle.fill-18-#8E8E93')).toBeTruthy();
        });

        it('should clear search when clear button is pressed', () => {
            const models = Array.from({ length: 6 }, (_, i) => `model-${i}`);
            
            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        predefinedModels={models}
                    />
                </TestWrapper>
            );

            const searchInput = screen.getByPlaceholderText('Search models...');
            fireEvent.changeText(searchInput, 'test');

            const clearButton = screen.getByText('SymbolView-xmark.circle.fill-18-#8E8E93');
            fireEvent.press(clearButton);

            expect(searchInput.props.value).toBe('');
        });
    });

    describe('Model List Section', () => {
        it('should show empty state when no models exist', () => {
            (storesModule.useProviderStore as any).mockReturnValue({
                ...mockStore,
                customModels: { openai: [] },
            });

            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        predefinedModels={[]}
                    />
                </TestWrapper>
            );

            expect(screen.getByText('No models available. Tap + to add one.')).toBeTruthy();
        });

        it('should show no results state when search has no matches', () => {
            const models = ['gpt-3.5-turbo', 'gpt-4'];
            
            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        predefinedModels={models}
                    />
                </TestWrapper>
            );

            const searchInput = screen.getByPlaceholderText('Search models...');
            fireEvent.changeText(searchInput, 'nonexistent');

            expect(screen.getByText('No models match "nonexistent"')).toBeTruthy();
        });

        it('should display all models when not searching', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            expect(screen.getByText('gpt-3.5-turbo')).toBeTruthy();
            expect(screen.getByText('gpt-4')).toBeTruthy();
            expect(screen.getByText('custom-model-1')).toBeTruthy();
        });

        it('should select model when pressed', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            const gpt4Model = screen.getByText('gpt-4');
            fireEvent.press(gpt4Model);

            expect(defaultProps.onModelSelect).toHaveBeenCalledWith('gpt-4');
        });

        it('should show delete button in edit mode for custom models', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            const editButton = screen.getByText('Edit');
            fireEvent.press(editButton);

            expect(screen.getByText('SymbolView-trash-18-#FF3B30')).toBeTruthy();
        });

        it('should delete model when delete button is pressed', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} />
                </TestWrapper>
            );

            const editButton = screen.getByText('Edit');
            fireEvent.press(editButton);

            const deleteButton = screen.getByText('SymbolView-trash-18-#FF3B30');
            fireEvent.press(deleteButton);

            expect(mockStore.deleteModel).toHaveBeenCalledWith('openai', 'custom-model-1');
        });

        it('should exit edit mode when last model is deleted', () => {
            // Create scenario with only one model
            (storesModule.useProviderStore as any).mockReturnValue({
                ...mockStore,
                customModels: { openai: ['only-model'] },
            });

            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        predefinedModels={[]}
                        selectedModel="only-model"
                    />
                </TestWrapper>
            );

            const editButton = screen.getByText('Edit');
            fireEvent.press(editButton);

            const deleteButton = screen.getByText('SymbolView-trash-18-#FF3B30');
            fireEvent.press(deleteButton);

            // Should show Done button changed back to Edit
            expect(screen.getByText('Edit')).toBeTruthy();
        });
    });

    describe('Dynamic Models', () => {
        it('should use dynamic models when provided', () => {
            const dynamicModels = ['llama-2', 'codellama'];
            
            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        dynamicModels={dynamicModels}
                    />
                </TestWrapper>
            );

            expect(screen.getByText('llama-2')).toBeTruthy();
            expect(screen.getByText('codellama')).toBeTruthy();
            expect(screen.queryByText('gpt-3.5-turbo')).toBeFalsy();
        });

        it('should filter out hidden models from dynamic models', () => {
            const dynamicModels = ['llama-2', 'hidden-model', 'codellama'];
            
            render(
                <TestWrapper>
                    <ModelListManager 
                        {...defaultProps} 
                        dynamicModels={dynamicModels}
                    />
                </TestWrapper>
            );

            expect(screen.getByText('llama-2')).toBeTruthy();
            expect(screen.getByText('codellama')).toBeTruthy();
            expect(screen.queryByText('hidden-model')).toBeFalsy();
        });
    });

    describe('Disabled State', () => {
        it('should disable all interactions when disabled prop is true', () => {
            render(
                <TestWrapper>
                    <ModelListManager {...defaultProps} disabled={true} />
                </TestWrapper>
            );

            const editButton = screen.getByText('Edit');
            expect(editButton.props.disabled).toBe(true);

            const addButton = screen.getByText('SymbolView-plus.circle.fill-22-#8E8E93');
            fireEvent.press(addButton);

            // Add input should not appear when disabled
            expect(screen.queryByPlaceholderText('Enter model name...')).toBeFalsy();
        });
    });
});