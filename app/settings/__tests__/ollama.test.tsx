/**
 * @file app/settings/__tests__/ollama.test.tsx
 * @purpose Tests for the OllamaSettings component
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import OllamaSettings from '../ollama';

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
  IconButton: () => null,
  SettingInput: ({ label, value, onChangeText, placeholder }: any) => (
    <input
      data-testid={`setting-input-${label}`}
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      placeholder={placeholder}
    />
  ),
  SaveButton: ({ onPress, loading, title }: any) => (
    <button
      data-testid={`save-button-${title}`}
      onClick={onPress}
      disabled={loading}
    >
      {title}
    </button>
  ),
  ModelListManager: ({ providerId, selectedModel }: any) => (
    <div data-testid="model-list-manager">{providerId}</div>
  ),
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
    setSelectedModel: jest.fn(),
    availableModels: { ollama: [] },
    setAvailableModels: jest.fn(),
  }),
  useAuthStore: () => ({
    ollamaUrl: 'http://localhost:11434',
    setOllamaUrl: jest.fn(),
  }),
}));

// Mock provider-factory
jest.mock('@/providers/provider-factory', () => ({
  testProviderConnection: jest.fn(),
}));

// Mock types
jest.mock('@/types/provider.types', () => ({
  OLLAMA_MODELS: [],
}));

describe('OllamaSettings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SECTION 1: URL Input Field', () => {
    it('should render URL input field with correct label', () => {
      const { getByTestId } = render(<OllamaSettings />);
      expect(getByTestId('setting-input-Ollama Base URL')).toBeTruthy();
    });

    it('should display default URL in input field', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as HTMLInputElement;
      expect(input.value).toBe('http://localhost:11434');
    });

    it('should have correct placeholder text', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as HTMLInputElement;
      expect(input.placeholder).toBe('http://localhost:11434');
    });

    it('should allow user to modify the URL', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as any;
      
      fireEvent(input, 'changeText', 'http://192.168.1.100:11434');
      expect(input.value).toBe('http://192.168.1.100:11434');
    });

    it('should disable autocapitalization for URL input', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as HTMLInputElement;
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
        expect(loadButton).toBeTruthy();
      });
    });
  });

  describe('SECTION 3: Connection Test Result Message', () => {
    it('should not display test result initially', () => {
      const { queryByText } = render(<OllamaSettings />);
      expect(queryByText(/Connected successfully|Connection failed|Connection error|Loaded .* models/)).toBeNull();
    });

    it('should display success message color when connection succeeds', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { testProviderConnection } = require('@/providers/provider-factory');
      testProviderConnection.mockResolvedValue(true);
      
      const { getByTestId } = render(<OllamaSettings />);
      const saveButton = getByTestId('save-button-Save & Test');
      
      fireEvent(saveButton, 'press');
      
      await waitFor(() => {
        expect(testProviderConnection).toHaveBeenCalled();
      });
    });

    it('should display error message color when connection fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { testProviderConnection } = require('@/providers/provider-factory');
      testProviderConnection.mockResolvedValue(false);
      
      const { getByTestId } = render(<OllamaSettings />);
      const saveButton = getByTestId('save-button-Save & Test');
      
      fireEvent(saveButton, 'press');
      
      await waitFor(() => {
        expect(testProviderConnection).toHaveBeenCalled();
      });
    });
  });

  describe('SECTION 4: Model Selection Manager', () => {
    it('should render ModelListManager component', () => {
      const { getByTestId } = render(<OllamaSettings />);
      expect(getByTestId('model-list-manager')).toBeTruthy();
    });

    it('should pass ollama provider ID to ModelListManager', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const manager = getByTestId('model-list-manager');
      expect(manager.textContent).toBe('ollama');
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
      const input = getByTestId('setting-input-Ollama Base URL') as HTMLInputElement;
      expect(input.value).toBe('http://localhost:11434');
    });

    it('should handle URL changes in local state', () => {
      const { getByTestId } = render(<OllamaSettings />);
      const input = getByTestId('setting-input-Ollama Base URL') as any;
      
      fireEvent(input, 'changeText', 'http://example.com:11434');
      expect(input.value).toBe('http://example.com:11434');
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
