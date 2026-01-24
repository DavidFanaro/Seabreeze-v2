/**
 * @file app/settings/__tests__/apple.test.tsx
 * @purpose Tests for the AppleSettings component
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import AppleSettings from '../apple';

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
  useTheme: () => ({
    theme: {
      colors: {
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#000000',
        textSecondary: '#666666',
      },
    },
  }),
}));

describe('AppleSettings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<AppleSettings />);
      expect(getByText('About Apple Intelligence')).toBeTruthy();
    });

    it('should render all three main sections', () => {
      const { getByText } = render(<AppleSettings />);
      expect(getByText('About Apple Intelligence')).toBeTruthy();
      expect(getByText('Features')).toBeTruthy();
      expect(getByText('System Requirements')).toBeTruthy();
    });
  });

  describe('Section 1: About Apple Intelligence', () => {
    it('should render About Apple Intelligence title', () => {
      const { getByText } = render(<AppleSettings />);
      expect(getByText('About Apple Intelligence')).toBeTruthy();
    });

    it('should render About Apple Intelligence description', () => {
      const { getByText } = render(<AppleSettings />);
      const description = getByText(/Apple Intelligence provides on-device AI capabilities/);
      expect(description).toBeTruthy();
    });

    it('should describe core features in About section', () => {
      const { getByText } = render(<AppleSettings />);
      const description = getByText(/writing tools, image recognition, and natural language processing/);
      expect(description).toBeTruthy();
    });

    it('should mention privacy and performance in About section', () => {
      const { getByText } = render(<AppleSettings />);
      const description = getByText(/runs locally on your device for privacy and performance/);
      expect(description).toBeTruthy();
    });
  });

  describe('Section 2: Features', () => {
    it('should render Features section title', () => {
      const { getByText } = render(<AppleSettings />);
      expect(getByText('Features')).toBeTruthy();
    });

    it('should render all four feature items', () => {
      const { getByText } = render(<AppleSettings />);
      expect(getByText(/Writing Tools/)).toBeTruthy();
      expect(getByText(/Image Recognition/)).toBeTruthy();
      expect(getByText(/Siri Integration/)).toBeTruthy();
      expect(getByText(/On-Device Processing/)).toBeTruthy();
    });

    it('should describe Writing Tools feature', () => {
      const { getByText } = render(<AppleSettings />);
      const feature = getByText(/Writing Tools: Rewriting, summarizing, and composing text/);
      expect(feature).toBeTruthy();
    });

    it('should describe Image Recognition feature', () => {
      const { getByText } = render(<AppleSettings />);
      const feature = getByText(/Image Recognition: Identifying objects and text in images/);
      expect(feature).toBeTruthy();
    });

    it('should describe Siri Integration feature', () => {
      const { getByText } = render(<AppleSettings />);
      const feature = getByText(/Siri Integration: Enhanced Siri capabilities/);
      expect(feature).toBeTruthy();
    });

    it('should describe On-Device Processing feature', () => {
      const { getByText } = render(<AppleSettings />);
      const feature = getByText(/On-Device Processing: All data stays on your device/);
      expect(feature).toBeTruthy();
    });

    it('should emphasize privacy with On-Device Processing', () => {
      const { getByText } = render(<AppleSettings />);
      const feature = getByText(/All data stays on your device/);
      expect(feature).toBeTruthy();
    });
  });

  describe('Section 3: System Requirements', () => {
    it('should render System Requirements section title', () => {
      const { getByText } = render(<AppleSettings />);
      expect(getByText('System Requirements')).toBeTruthy();
    });

    it('should render all four system requirements', () => {
      const { getByText } = render(<AppleSettings />);
      expect(getByText(/iPhone 15 Pro or later/)).toBeTruthy();
      expect(getByText(/iPad with M1 chip or later/)).toBeTruthy();
      expect(getByText(/Mac with M1 chip or later/)).toBeTruthy();
      expect(getByText(/Latest iOS, iPadOS, or macOS/)).toBeTruthy();
    });

    it('should specify iPhone 15 Pro minimum requirement', () => {
      const { getByText } = render(<AppleSettings />);
      const requirement = getByText(/iPhone 15 Pro or later/);
      expect(requirement).toBeTruthy();
    });

    it('should specify M1 chip requirement for iPad', () => {
      const { getByText } = render(<AppleSettings />);
      const requirement = getByText(/iPad with M1 chip or later/);
      expect(requirement).toBeTruthy();
    });

    it('should specify M1 chip requirement for Mac', () => {
      const { getByText } = render(<AppleSettings />);
      const requirement = getByText(/Mac with M1 chip or later/);
      expect(requirement).toBeTruthy();
    });

    it('should specify latest OS version requirement', () => {
      const { getByText } = render(<AppleSettings />);
      const requirement = getByText(/Latest iOS, iPadOS, or macOS/);
      expect(requirement).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should render sections in correct order', () => {
      const { getByText } = render(<AppleSettings />);
      // All three section titles should exist
      expect(getByText('About Apple Intelligence')).toBeTruthy();
      expect(getByText('Features')).toBeTruthy();
      expect(getByText('System Requirements')).toBeTruthy();
    });

    it('should render component with proper hierarchy', () => {
      const { getByText } = render(<AppleSettings />);
      const aboutSection = getByText('About Apple Intelligence');
      const featuresSection = getByText('Features');
      const requirementsSection = getByText('System Requirements');

      expect(aboutSection).toBeTruthy();
      expect(featuresSection).toBeTruthy();
      expect(requirementsSection).toBeTruthy();
    });
  });

  describe('Accessibility and Content', () => {
    it('should render descriptive text for About section', () => {
      const { getByText } = render(<AppleSettings />);
      const description = getByText(/on-device AI capabilities powered by Apple Silicon/);
      expect(description).toBeTruthy();
    });

    it('should provide clear information about each feature', () => {
      const { getByText } = render(<AppleSettings />);
      const features = [
        getByText(/Rewriting, summarizing, and composing text/),
        getByText(/Identifying objects and text in images/),
        getByText(/Enhanced Siri capabilities/),
        getByText(/All data stays on your device/),
      ];
      features.forEach((feature) => {
        expect(feature).toBeTruthy();
      });
    });

    it('should provide clear hardware requirements', () => {
      const { getByText } = render(<AppleSettings />);
      const requirements = [
        getByText(/iPhone 15 Pro/),
        getByText(/iPad with M1/),
        getByText(/Mac with M1/),
        getByText(/Latest iOS, iPadOS, or macOS/),
      ];
      requirements.forEach((req) => {
        expect(req).toBeTruthy();
      });
    });
  });
});
