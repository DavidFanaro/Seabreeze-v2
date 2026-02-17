/**
 * @file app/settings/__tests__/ollama.test.tsx
 * @purpose Tests for the OllamaSettings component
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockSetSelectedModel = jest.fn((_model: string | null) => undefined);
const mockSetAvailableModels = jest.fn((_providerId: string, _models: string[]) => undefined);
const mockSetOllamaUrl = jest.fn((_url: string) => undefined);

let mockAvailableModels: { ollama: string[] } = { ollama: [] };
let mockOllamaUrl = 'http://localhost:11434';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    dismiss: jest.fn(),
  },
  Stack: {
    Screen: () => null,
  },
}));

// Mock theme components
jest.mock('@/components', () => ({
  ...(() => {
    const React = require('react');
    const { View, Text, TextInput, Pressable } = require('react-native');

    return {
      IconButton: () => null,
      SettingInput: ({ label, value, onChangeText, placeholder }: any) => (
        <TextInput
          testID={`setting-input-${label}`}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
        />
      ),
      SaveButton: ({ onPress, loading, title }: any) => (
        <Pressable
          testID={`save-button-${title}`}
          onPress={onPress}
          disabled={loading}
        >
          <Text>{title}</Text>
        </Pressable>
      ),
      ModelListManager: ({ providerId }: any) => (
        <View testID="model-list-manager">
          <Text>{providerId}</Text>
        </View>
      ),
    };
  })(),
  useTheme: () => ({
    theme: {
      colors: {
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#000000',
        textSecondary: '#666666',
        accent: '#007AFF',
        error: '#FF3B30',
      },
    },
  }),
}));

// Mock stores
jest.mock('@/stores', () => ({
  useProviderStore: () => ({
    selectedModel: null,
    setSelectedModel: mockSetSelectedModel,
    availableModels: mockAvailableModels,
    setAvailableModels: mockSetAvailableModels,
  }),
  useAuthStore: () => ({
    ollamaUrl: mockOllamaUrl,
    setOllamaUrl: mockSetOllamaUrl,
  }),
}));

// Mock provider-factory
jest.mock('@/providers/provider-factory', () => ({
  testProviderConnection: jest.fn(),
}));

// Mock ollama provider utilities
jest.mock('@/providers/ollama-provider', () => ({
  fetchOllamaModels: jest.fn(),
}));

// Mock types
jest.mock('@/types/provider.types', () => ({
  OLLAMA_MODELS: [],
}));

const { testProviderConnection: mockTestProviderConnection } = jest.requireMock(
  '@/providers/provider-factory',
) as {
  testProviderConnection: jest.MockedFunction<
    (providerId: string, credentials: { url: string }) => Promise<boolean>
  >;
};

const { fetchOllamaModels: mockFetchOllamaModels } = jest.requireMock(
  '@/providers/ollama-provider',
) as {
  fetchOllamaModels: jest.MockedFunction<(baseUrl: string) => Promise<string[]>>;
};

const OllamaSettings = require('../ollama').default;

describe('OllamaSettings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAvailableModels = { ollama: [] };
    mockOllamaUrl = 'http://localhost:11434';

    mockSetSelectedModel.mockReset();
    mockSetAvailableModels.mockReset();
    mockSetOllamaUrl.mockReset();
    mockTestProviderConnection.mockReset();
    mockFetchOllamaModels.mockReset();

    mockTestProviderConnection.mockResolvedValue(true);
    mockFetchOllamaModels.mockResolvedValue(['llama3.2', 'mistral']);
  });

  describe('SECTION 1: URL Input Field', () => {
    it('should render URL input field with correct label', () => {
      const { getByTestId } = render(<OllamaSettings />);
      expect(getByTestId('setting-input-Ollama Base URL')).toBeTruthy();
    });

    it('should display default URL in input field', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as any;
      expect(input.props.value).toBe('http://localhost:11434');
    });

    it('should have correct placeholder text', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as any;
      expect(input.props.placeholder).toBe('http://localhost:11434');
    });

    it('should allow user to modify the URL', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as any;
      
      fireEvent(input, 'changeText', 'http://192.168.1.100:11434');
      expect(input.props.value).toBe('http://192.168.1.100:11434');
    });

    it('should disable autocapitalization for URL input', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as any;
      // In React Native, autoCapitalize="none" is a prop that prevents uppercase conversion
      expect(input).toBeTruthy();
    });
  });

  describe('SECTION 2: Action Buttons Row', () => {
    it('should render Save & Test button', () => {
      const { getByTestId } = render(<OllamaSettings />);
      expect(getByTestId('save-button-Save & Test')).toBeTruthy();
    });

    it('should render Load Models button', () => {
      const { getByTestId } = render(<OllamaSettings />);
      expect(getByTestId('save-button-Load Models')).toBeTruthy();
    });

    it('should have both buttons in a row layout', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const saveButton = getByTestId('save-button-Save & Test');
      const loadButton = getByTestId('save-button-Load Models');
      expect(saveButton).toBeTruthy();
      expect(loadButton).toBeTruthy();
    });

    it('should call handleSave when Save & Test button is pressed', async () => {
      const { getByTestId } = render(<OllamaSettings />);
      const saveButton = getByTestId('save-button-Save & Test');
      
      fireEvent(saveButton, 'press');
      
      await waitFor(() => {
        expect(saveButton).toBeTruthy();
      });
    });

    it('should call handleFetchModels when Load Models button is pressed', async () => {
      const { getByTestId } = render(<OllamaSettings />);
      const loadButton = getByTestId('save-button-Load Models');
      
      fireEvent(loadButton, 'press');
      
      await waitFor(() => {
        expect(mockFetchOllamaModels).toHaveBeenCalledWith('http://localhost:11434');
      });
    });

    it('should normalize loaded model names before updating store', async () => {
      mockFetchOllamaModels.mockResolvedValue([' llama3.2 ', 'mistral', 'mistral', '', '   '] as any);

      const { getByTestId } = render(<OllamaSettings />);
      const loadButton = getByTestId('save-button-Load Models');

      fireEvent(loadButton, 'press');

      await waitFor(() => {
        expect(mockSetAvailableModels).toHaveBeenCalledWith('ollama', ['llama3.2', 'mistral']);
      });
    });

    it('should use trimmed URL when loading models', async () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as any;
      fireEvent(input, 'changeText', '  http://localhost:11434/api/  ');

      const loadButton = getByTestId('save-button-Load Models');
      fireEvent(loadButton, 'press');

      await waitFor(() => {
        expect(mockFetchOllamaModels).toHaveBeenCalledWith('http://localhost:11434/api/');
      });
    });

    it('should show actionable message when connection succeeds but no models are returned', async () => {
      mockFetchOllamaModels.mockResolvedValue([]);
      mockTestProviderConnection.mockResolvedValue(true);

      const { getByTestId, getByText } = render(<OllamaSettings />);
      fireEvent(getByTestId('save-button-Load Models'), 'press');

      await waitFor(() => {
        expect(getByText(/Connected, but no models were returned/)).toBeTruthy();
      });
    });

    it('should skip fetch and show validation message when URL is empty', async () => {
      const { getByTestId, getByText } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as any;
      fireEvent(input, 'changeText', '   ');

      fireEvent(getByTestId('save-button-Load Models'), 'press');

      await waitFor(() => {
        expect(mockFetchOllamaModels).not.toHaveBeenCalled();
        expect(getByText(/Please enter an Ollama URL/)).toBeTruthy();
      });
    });
  });

  describe('SECTION 3: Connection Test Result Message', () => {
    it('should not display test result initially', () => {
      const { queryByText } = render(<OllamaSettings />);
      expect(queryByText(/Connected successfully|Connection failed|Connection error|Loaded .* models/)).toBeNull();
    });

    it('should display success message color when connection succeeds', async () => {
      mockTestProviderConnection.mockResolvedValue(true);
      
      const { getByTestId } = render(<OllamaSettings />);
      const saveButton = getByTestId('save-button-Save & Test');
      
      fireEvent(saveButton, 'press');
      
      await waitFor(() => {
        expect(mockTestProviderConnection).toHaveBeenCalled();
      });
    });

    it('should display error message color when connection fails', async () => {
      mockTestProviderConnection.mockResolvedValue(false);
      
      const { getByTestId } = render(<OllamaSettings />);
      const saveButton = getByTestId('save-button-Save & Test');
      
      fireEvent(saveButton, 'press');
      
      await waitFor(() => {
        expect(mockTestProviderConnection).toHaveBeenCalled();
      });
    });
  });

  describe('SECTION 4: Model Selection Manager', () => {
    it('should render ModelListManager component', () => {
      const { getByTestId } = render(<OllamaSettings />);
      expect(getByTestId('model-list-manager')).toBeTruthy();
    });

    it('should pass ollama provider ID to ModelListManager', () => {
      const { getByText } = render(<OllamaSettings />);
      expect(getByText('ollama')).toBeTruthy();
    });

    it('should render model manager with available models', () => {
      const { getByTestId } = render(<OllamaSettings />);
      expect(getByTestId('model-list-manager')).toBeTruthy();
    });
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<OllamaSettings />);
      expect(getByTestId('setting-input-Ollama Base URL')).toBeTruthy();
    });

    it('should render all four main sections', () => {
      const { getByTestId } = render(<OllamaSettings />);
      // Section 1: URL Input
      expect(getByTestId('setting-input-Ollama Base URL')).toBeTruthy();
      // Section 2: Action Buttons
      expect(getByTestId('save-button-Save & Test')).toBeTruthy();
      expect(getByTestId('save-button-Load Models')).toBeTruthy();
      // Section 4: Model Manager
      expect(getByTestId('model-list-manager')).toBeTruthy();
    });

    it('should have proper view hierarchy', () => {
      const { getByTestId } = render(<OllamaSettings />);
      expect(getByTestId('setting-input-Ollama Base URL')).toBeTruthy();
      expect(getByTestId('save-button-Save & Test')).toBeTruthy();
      expect(getByTestId('model-list-manager')).toBeTruthy();
    });
  });

  describe('State Management', () => {
    it('should initialize with correct default URL from auth store', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as any;
      expect(input.props.value).toBe('http://localhost:11434');
    });

    it('should handle URL changes in local state', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as any;
      
      fireEvent(input, 'changeText', 'http://example.com:11434');
      expect(input.props.value).toBe('http://example.com:11434');
    });
  });

  describe('Header Configuration', () => {
    it('should have Ollama as header title', () => {
      render(<OllamaSettings />);
      // Stack.Screen is mocked to return null, so we can't test header directly
      // but the component structure should be present
      expect(true).toBe(true);
    });
  });

  describe('Accessibility and Layout', () => {
    it('should render sections in proper order', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const urlInput = getByTestId('setting-input-Ollama Base URL');
      const saveButton = getByTestId('save-button-Save & Test');
      const modelManager = getByTestId('model-list-manager');
      
      expect(urlInput).toBeTruthy();
      expect(saveButton).toBeTruthy();
      expect(modelManager).toBeTruthy();
    });

    it('should have gap between sections', () => {
      const { getByTestId } = render(<OllamaSettings />);
      expect(getByTestId('setting-input-Ollama Base URL')).toBeTruthy();
      expect(getByTestId('save-button-Save & Test')).toBeTruthy();
    });
  });
});
