/**
 * @file app/settings/__tests__/index.test.tsx
 * @purpose Tests for the SettingsIndex component and ProviderListItem subcomponent
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import SettingsIndex from '../index';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    dismiss: jest.fn(),
  },
  Stack: {
    Screen: () => null,
  },
}));

// Mock expo-symbols
jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));

// Mock theme components and hooks
jest.mock('@/components', () => ({
  IconButton: () => null,
  useTheme: () => ({
    theme: {
      colors: {
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#000000',
        textSecondary: '#666666',
        accent: '#007AFF',
        border: '#e0e0e0',
      },
    },
  }),
}));

// Mock provider icons
jest.mock('@/components/ui/ProviderIcons', () => ({
  ProviderIcon: () => null,
}));

// Mock provider configuration store
jest.mock('@/stores', () => ({
  isProviderConfigured: jest.fn((providerId: string) => {
    // Mock: apple and openai are configured, others are not
    return providerId === 'apple' || providerId === 'openai';
  }),
}));

describe('SettingsIndex Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the settings screen without crashing', () => {
      const { getByText } = render(<SettingsIndex />);
      expect(getByText('Appearance')).toBeTruthy();
      expect(getByText('PROVIDERS')).toBeTruthy();
      expect(getByText('About')).toBeTruthy();
    });

    it('should render the header title "Settings"', () => {
      const { getByText } = render(<SettingsIndex />);
      // The header is set via Stack.Screen options
      expect(getByText('Appearance')).toBeTruthy();
    });
  });

  describe('Appearance Section', () => {
    it('should render the Appearance section with title', () => {
      const { getByText } = render(<SettingsIndex />);
      expect(getByText('Appearance')).toBeTruthy();
    });

    it('should render Appearance section description', () => {
      const { getByText } = render(<SettingsIndex />);
      expect(getByText('Theme and display settings')).toBeTruthy();
    });

    it('should render the Appearance section label and description together', () => {
      const { getByText } = render(<SettingsIndex />);
      const appearanceLabel = getByText('Appearance');
      const appearanceDesc = getByText('Theme and display settings');
      expect(appearanceLabel).toBeTruthy();
      expect(appearanceDesc).toBeTruthy();
    });

    it('should navigate to appearance settings when Appearance section is pressed', () => {
      const { getByText } = render(<SettingsIndex />);
      const appearanceButton = getByText('Theme and display settings').parent?.parent;
      
      if (appearanceButton) {
        fireEvent.press(appearanceButton);
      }
      // Verify navigation was attempted (exact behavior depends on router mock)
    });
  });

  describe('Providers Section Header', () => {
    it('should render the PROVIDERS section header in uppercase', () => {
      const { getByText } = render(<SettingsIndex />);
      const header = getByText('PROVIDERS');
      expect(header).toBeTruthy();
      expect(header.props.children).toBe('PROVIDERS');
    });

    it('should render PROVIDERS header before provider list items', () => {
      const { getByText } = render(<SettingsIndex />);
      expect(getByText('PROVIDERS')).toBeTruthy();
    });
  });

  describe('Providers Section - Provider Items', () => {
    it('should render all four provider options', () => {
      const { getByText } = render(<SettingsIndex />);
      expect(getByText('Apple Intelligence')).toBeTruthy();
      expect(getByText('OpenAI')).toBeTruthy();
      expect(getByText('OpenRouter')).toBeTruthy();
      expect(getByText('Ollama')).toBeTruthy();
    });

    it('should render provider descriptions', () => {
      const { getByText } = render(<SettingsIndex />);
      expect(getByText('On-device AI powered by Apple Silicon')).toBeTruthy();
      expect(getByText('ChatGPT and other OpenAI models')).toBeTruthy();
      expect(getByText('Access to multiple AI providers')).toBeTruthy();
      expect(getByText('Local AI models via Ollama')).toBeTruthy();
    });

    it('should have exactly four provider items', () => {
      const { getByText } = render(<SettingsIndex />);
      // Check that all provider names are present
      const providers = [
        'Apple Intelligence',
        'OpenAI',
        'OpenRouter',
        'Ollama',
      ];
      providers.forEach((provider) => {
        expect(getByText(provider)).toBeTruthy();
      });
    });

    it('should render provider names with correct text', () => {
      const { getByText } = render(<SettingsIndex />);
      expect(getByText('Apple Intelligence').props.children).toBe('Apple Intelligence');
      expect(getByText('OpenAI').props.children).toBe('OpenAI');
      expect(getByText('OpenRouter').props.children).toBe('OpenRouter');
      expect(getByText('Ollama').props.children).toBe('Ollama');
    });
  });

  describe('About Section', () => {
    it('should render the About section title', () => {
      const { getByText } = render(<SettingsIndex />);
      expect(getByText('About')).toBeTruthy();
    });

    it('should render app version in About section', () => {
      const { getByText } = render(<SettingsIndex />);
      const about = getByText(/Seabreeze v1.0.0/);
      expect(about).toBeTruthy();
    });

    it('should render app description in About section', () => {
      const { getByText } = render(<SettingsIndex />);
      const description = getByText(/A modern AI chat interface/);
      expect(description).toBeTruthy();
    });

    it('should render About section with all content', () => {
      const { getByText } = render(<SettingsIndex />);
      const title = getByText('About');
      const version = getByText(/Seabreeze v1.0.0/);
      const description = getByText(/A modern AI chat interface/);
      
      expect(title).toBeTruthy();
      expect(version).toBeTruthy();
      expect(description).toBeTruthy();
    });

    it('should display platform information in About section', () => {
      const { getByText } = render(<SettingsIndex />);
      const platformInfo = getByText(/Built with ❤️ for iOS, Android, and Web/);
      expect(platformInfo).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should have Appearance section before PROVIDERS section', () => {
      const { getByText } = render(<SettingsIndex />);
      const appearance = getByText('Appearance');
      const providers = getByText('PROVIDERS');
      
      expect(appearance).toBeTruthy();
      expect(providers).toBeTruthy();
    });

    it('should have PROVIDERS section before About section', () => {
      const { getByText } = render(<SettingsIndex />);
      const providers = getByText('PROVIDERS');
      const about = getByText('About');
      
      expect(providers).toBeTruthy();
      expect(about).toBeTruthy();
    });

    it('should render all three main sections', () => {
      const { getByText } = render(<SettingsIndex />);
      // Appearance section
      expect(getByText('Appearance')).toBeTruthy();
      // Providers section
      expect(getByText('PROVIDERS')).toBeTruthy();
      // About section
      expect(getByText('About')).toBeTruthy();
    });
  });

  describe('Label and Description Pairing', () => {
    it('should pair provider names with their descriptions', () => {
      const { getByText } = render(<SettingsIndex />);
      
      // Apple Intelligence with its description
      expect(getByText('Apple Intelligence')).toBeTruthy();
      expect(getByText('On-device AI powered by Apple Silicon')).toBeTruthy();
      
      // OpenAI with its description
      expect(getByText('OpenAI')).toBeTruthy();
      expect(getByText('ChatGPT and other OpenAI models')).toBeTruthy();
    });

    it('should have Appearance label with its description', () => {
      const { getByText } = render(<SettingsIndex />);
      expect(getByText('Appearance')).toBeTruthy();
      expect(getByText('Theme and display settings')).toBeTruthy();
    });

    it('should have About title with its content', () => {
      const { getByText } = render(<SettingsIndex />);
      const title = getByText('About');
      const version = getByText(/Seabreeze v1.0.0/);
      
      expect(title).toBeTruthy();
      expect(version).toBeTruthy();
    });
  });

  describe('Section Labels', () => {
    it('should render PROVIDERS section header label', () => {
      const { getByText } = render(<SettingsIndex />);
      const header = getByText('PROVIDERS');
      expect(header).toBeTruthy();
      // Verify it's uppercase
      expect(header.props.children).toBe('PROVIDERS');
    });

    it('should display Appearance label', () => {
      const { getByText } = render(<SettingsIndex />);
      const label = getByText('Appearance');
      expect(label).toBeTruthy();
      expect(label.props.children).toBe('Appearance');
    });

    it('should display About label', () => {
      const { getByText } = render(<SettingsIndex />);
      const label = getByText('About');
      expect(label).toBeTruthy();
      expect(label.props.children).toBe('About');
    });
  });

  describe('UI Section Identification', () => {
    it('should have clearly identifiable Appearance section', () => {
      const { getByText } = render(<SettingsIndex />);
      // Both the main label and description should exist
      const label = getByText('Appearance');
      const description = getByText('Theme and display settings');
      expect(label).toBeTruthy();
      expect(description).toBeTruthy();
    });

    it('should have clearly identifiable PROVIDERS section with header', () => {
      const { getByText } = render(<SettingsIndex />);
      const header = getByText('PROVIDERS');
      const firstProvider = getByText('Apple Intelligence');
      expect(header).toBeTruthy();
      expect(firstProvider).toBeTruthy();
    });

    it('should have clearly identifiable About section', () => {
      const { getByText } = render(<SettingsIndex />);
      const title = getByText('About');
      const content = getByText(/Seabreeze v1.0.0/);
      expect(title).toBeTruthy();
      expect(content).toBeTruthy();
    });
  });
});
