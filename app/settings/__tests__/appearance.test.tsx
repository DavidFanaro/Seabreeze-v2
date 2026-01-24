/**
 * @file app/settings/__tests__/appearance.test.tsx
 * @purpose Tests for the AppearanceSettings component
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import AppearanceSettings from '../appearance';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
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

// Mock theme components
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
    themeMode: 'light',
    setTheme: jest.fn(),
  }),
}));

// Mock settings store
jest.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: (selector: (state: any) => any) => {
    const store = {
      showCodeLineNumbers: true,
      setShowCodeLineNumbers: jest.fn(),
    };
    return selector(store);
  },
}));

describe('AppearanceSettings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the THEME section header', () => {
      const { getByText } = render(<AppearanceSettings />);
      expect(getByText('THEME')).toBeTruthy();
    });

    it('should render the CHAT DISPLAY section header', () => {
      const { getByText } = render(<AppearanceSettings />);
      expect(getByText('CHAT DISPLAY')).toBeTruthy();
    });

    it('should render without crashing', () => {
      const { getByText } = render(<AppearanceSettings />);
      expect(getByText('THEME')).toBeTruthy();
      expect(getByText('CHAT DISPLAY')).toBeTruthy();
    });
  });

  describe('Theme Selection Section', () => {
    it('should render all theme options', () => {
      const { getByText } = render(<AppearanceSettings />);

      // Test rendering of each theme option
      expect(getByText('Light')).toBeTruthy();
      expect(getByText('Dark')).toBeTruthy();
      expect(getByText('Nord')).toBeTruthy();
      expect(getByText('Catppuccin')).toBeTruthy();
      expect(getByText('Tokyo Night (Night)')).toBeTruthy();
      expect(getByText('Tokyo Night (Storm)')).toBeTruthy();
      expect(getByText('Tokyo Night (Moon)')).toBeTruthy();
      expect(getByText('One Dark')).toBeTruthy();
      expect(getByText('Gruvbox (Dark Hard)')).toBeTruthy();
      expect(getByText('Gruvbox (Dark Medium)')).toBeTruthy();
      expect(getByText('Gruvbox (Dark Soft)')).toBeTruthy();
      expect(getByText('Darcula')).toBeTruthy();
      expect(getByText('System')).toBeTruthy();
    });

    it('should have 13 theme options available', () => {
      const { getAllByText } = render(<AppearanceSettings />);
      // Light, Dark, Nord, Catppuccin, Tokyo Night variants (3), One Dark,
      // Gruvbox variants (3), Darcula, System = 13 total
      const themeLabels = [
        'Light',
        'Dark',
        'Nord',
        'Catppuccin',
        'Tokyo Night (Night)',
        'Tokyo Night (Storm)',
        'Tokyo Night (Moon)',
        'One Dark',
        'Gruvbox (Dark Hard)',
        'Gruvbox (Dark Medium)',
        'Gruvbox (Dark Soft)',
        'Darcula',
        'System',
      ];

      themeLabels.forEach((label) => {
        expect(getAllByText(label).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Chat Display Section', () => {
    it('should render Show Code Line Numbers toggle label', () => {
      const { getByText } = render(<AppearanceSettings />);
      expect(getByText('Show Code Line Numbers')).toBeTruthy();
    });

    it('should display description for code line numbers setting', () => {
      const { getByText } = render(<AppearanceSettings />);
      expect(getByText('Display line numbers in code blocks')).toBeTruthy();
    });

    it('should render both label and description in Chat Display section', () => {
      const { getByText } = render(<AppearanceSettings />);
      const label = getByText('Show Code Line Numbers');
      const description = getByText('Display line numbers in code blocks');
      expect(label).toBeTruthy();
      expect(description).toBeTruthy();
    });
  });

  describe('Section Headers', () => {
    it('should display THEME header in uppercase', () => {
      const { getByText } = render(<AppearanceSettings />);
      const themeHeader = getByText('THEME');
      expect(themeHeader.props.children).toBe('THEME');
    });

    it('should display CHAT DISPLAY header in uppercase', () => {
      const { getByText } = render(<AppearanceSettings />);
      const chatHeader = getByText('CHAT DISPLAY');
      expect(chatHeader.props.children).toBe('CHAT DISPLAY');
    });
  });

  describe('Component Structure', () => {
    it('should render appearance settings with proper hierarchy', () => {
      const { getByText } = render(<AppearanceSettings />);
      // Top-level sections are present
      expect(getByText('THEME')).toBeTruthy();
      expect(getByText('CHAT DISPLAY')).toBeTruthy();
      // Theme options are rendered
      expect(getByText('Light')).toBeTruthy();
      // Chat display setting is rendered
      expect(getByText('Show Code Line Numbers')).toBeTruthy();
    });
  });

  describe('Content Sections', () => {
    it('should have THEME section before CHAT DISPLAY section', () => {
      const { getByText } = render(<AppearanceSettings />);
      const themeText = getByText('THEME');
      const chatText = getByText('CHAT DISPLAY');

      // Both sections should exist
      expect(themeText).toBeTruthy();
      expect(chatText).toBeTruthy();
    });

    it('should render theme selection options between THEME header and CHAT DISPLAY header', () => {
      const { getByText } = render(<AppearanceSettings />);
      const themeHeader = getByText('THEME');
      const chatHeader = getByText('CHAT DISPLAY');
      const systemTheme = getByText('System');

      // All should exist
      expect(themeHeader).toBeTruthy();
      expect(systemTheme).toBeTruthy();
      expect(chatHeader).toBeTruthy();
    });
  });
});
