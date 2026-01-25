/**
 * @file useSettingsStore.test.ts
 * @purpose Test suite for settings store state management and persistence
 */

import { renderHook, act } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as SecureStore from "expo-secure-store";
import { useSettingsStore } from "../useSettingsStore";

// Mock expo-secure-store module
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockSecureStore = jest.mocked(SecureStore);

describe("useSettingsStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to create fresh store instance
  const createStore = () => {
    const hook = renderHook(() => useSettingsStore());
    // Reset to defaults
    act(() => {
      hook.result.current.resetSettings();
    });
    return hook;
  };

  describe("Store Initialization", () => {
    it("should initialize with default state values", () => {
      const { result } = createStore();

      expect(result.current.theme).toBe("dark");
      expect(result.current.hapticEnabled).toBe(true);
      expect(result.current.autoGenerateTitles).toBe(true);
      expect(result.current.messageFontSize).toBe(16);
      expect(result.current.showCodeLineNumbers).toBe(false);
    });

    it("should provide all required actions", () => {
      const { result } = createStore();

      expect(typeof result.current.setTheme).toBe("function");
      expect(typeof result.current.setHapticEnabled).toBe("function");
      expect(typeof result.current.setAutoGenerateTitles).toBe("function");
      expect(typeof result.current.setMessageFontSize).toBe("function");
      expect(typeof result.current.setShowCodeLineNumbers).toBe("function");
      expect(typeof result.current.resetSettings).toBe("function");
    });
  });

  describe("Theme Management", () => {
    it("should change theme to light mode", () => {
      const { result } = createStore();

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
    });

    it("should change theme to system preference", () => {
      const { result } = createStore();

      act(() => {
        result.current.setTheme("system");
      });

      expect(result.current.theme).toBe("system");
    });

    it("should support all available themes", () => {
      const { result } = createStore();
      const themes = [
        "light",
        "dark",
        "nord",
        "catppuccin",
        "tokyo-night",
        "tokyo-night-storm",
        "tokyo-night-moon",
        "one-dark",
        "gruvbox-dark-hard",
        "gruvbox-dark-medium",
        "gruvbox-dark-soft",
        "darcula",
        "system",
      ] as const;

      themes.forEach((theme) => {
        act(() => {
          result.current.setTheme(theme);
        });
        expect(result.current.theme).toBe(theme);
      });
    });

    it("should persist theme changes", async () => {
      const { result } = createStore();

      act(() => {
        result.current.setTheme("nord");
      });

      // Wait for persistence to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        "settings-storage",
        expect.any(String)
      );
    });
  });

  describe("Haptic Feedback Settings", () => {
    it("should enable haptic feedback", () => {
      const { result } = createStore();

      act(() => {
        result.current.setHapticEnabled(true);
      });

      expect(result.current.hapticEnabled).toBe(true);
    });

    it("should disable haptic feedback", () => {
      const { result } = createStore();

      act(() => {
        result.current.setHapticEnabled(false);
      });

      expect(result.current.hapticEnabled).toBe(false);
    });

    it("should toggle haptic feedback multiple times", () => {
      const { result } = createStore();

      act(() => {
        result.current.setHapticEnabled(false);
      });
      expect(result.current.hapticEnabled).toBe(false);

      act(() => {
        result.current.setHapticEnabled(true);
      });
      expect(result.current.hapticEnabled).toBe(true);

      act(() => {
        result.current.setHapticEnabled(false);
      });
      expect(result.current.hapticEnabled).toBe(false);
    });
  });

  describe("Auto Generate Titles Settings", () => {
    it("should enable automatic title generation", () => {
      const { result } = createStore();

      act(() => {
        result.current.setAutoGenerateTitles(true);
      });

      expect(result.current.autoGenerateTitles).toBe(true);
    });

    it("should disable automatic title generation", () => {
      const { result } = createStore();

      act(() => {
        result.current.setAutoGenerateTitles(false);
      });

      expect(result.current.autoGenerateTitles).toBe(false);
    });
  });

  describe("Message Font Size Settings", () => {
    it("should set message font size", () => {
      const { result } = createStore();

      act(() => {
        result.current.setMessageFontSize(20);
      });

      expect(result.current.messageFontSize).toBe(20);
    });

    it("should handle various font sizes", () => {
      const { result } = createStore();
      const fontSizes = [12, 14, 16, 18, 20, 22, 24];

      fontSizes.forEach((size) => {
        act(() => {
          result.current.setMessageFontSize(size);
        });
        expect(result.current.messageFontSize).toBe(size);
      });
    });

    it("should handle font size at boundaries", () => {
      const { result } = createStore();

      act(() => {
        result.current.setMessageFontSize(8); // Very small
      });
      expect(result.current.messageFontSize).toBe(8);

      act(() => {
        result.current.setMessageFontSize(32); // Very large
      });
      expect(result.current.messageFontSize).toBe(32);
    });
  });

  describe("Code Line Numbers Settings", () => {
    it("should enable code line numbers", () => {
      const { result } = createStore();

      act(() => {
        result.current.setShowCodeLineNumbers(true);
      });

      expect(result.current.showCodeLineNumbers).toBe(true);
    });

    it("should disable code line numbers", () => {
      const { result } = createStore();

      act(() => {
        result.current.setShowCodeLineNumbers(false);
      });

      expect(result.current.showCodeLineNumbers).toBe(false);
    });

    it("should toggle code line numbers multiple times", () => {
      const { result } = createStore();

      act(() => {
        result.current.setShowCodeLineNumbers(true);
      });
      expect(result.current.showCodeLineNumbers).toBe(true);

      act(() => {
        result.current.setShowCodeLineNumbers(false);
      });
      expect(result.current.showCodeLineNumbers).toBe(false);

      act(() => {
        result.current.setShowCodeLineNumbers(true);
      });
      expect(result.current.showCodeLineNumbers).toBe(true);
    });
  });

  describe("Reset Settings", () => {
    it("should reset all settings to defaults", () => {
      const { result } = createStore();

      // Make various changes
      act(() => {
        result.current.setTheme("light");
        result.current.setHapticEnabled(false);
        result.current.setAutoGenerateTitles(false);
        result.current.setMessageFontSize(24);
        result.current.setShowCodeLineNumbers(true);
      });

      // Verify changes
      expect(result.current.theme).toBe("light");
      expect(result.current.hapticEnabled).toBe(false);
      expect(result.current.autoGenerateTitles).toBe(false);
      expect(result.current.messageFontSize).toBe(24);
      expect(result.current.showCodeLineNumbers).toBe(true);

      // Reset to defaults
      act(() => {
        result.current.resetSettings();
      });

      // Verify reset
      expect(result.current.theme).toBe("dark");
      expect(result.current.hapticEnabled).toBe(true);
      expect(result.current.autoGenerateTitles).toBe(true);
      expect(result.current.messageFontSize).toBe(16);
      expect(result.current.showCodeLineNumbers).toBe(false);
    });

    it("should persist reset settings", async () => {
      const { result } = createStore();

      // Make a change
      act(() => {
        result.current.setTheme("catppuccin");
      });

      // Reset to defaults
      act(() => {
        result.current.resetSettings();
      });

      // Wait for persistence to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        "settings-storage",
        expect.any(String)
      );
    });
  });

  describe("Combined Settings Changes", () => {
    it("should handle multiple setting changes in sequence", () => {
      const { result } = createStore();

      act(() => {
        result.current.setTheme("tokyo-night");
        result.current.setHapticEnabled(false);
        result.current.setMessageFontSize(18);
      });

      expect(result.current.theme).toBe("tokyo-night");
      expect(result.current.hapticEnabled).toBe(false);
      expect(result.current.messageFontSize).toBe(18);

      act(() => {
        result.current.setAutoGenerateTitles(false);
        result.current.setShowCodeLineNumbers(true);
      });

      expect(result.current.autoGenerateTitles).toBe(false);
      expect(result.current.showCodeLineNumbers).toBe(true);
    });

    it("should maintain state consistency after rapid changes", () => {
      const { result } = createStore();

      // Rapid changes - loop runs 5 times (0 to 4)
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.setTheme(i % 2 === 0 ? "light" : "dark");
          result.current.setHapticEnabled(i % 2 === 0);
          result.current.setMessageFontSize(16 + i);
        });
      }

      // Final iteration (i = 4):
      // - theme: i % 2 === 0 → 4 % 2 === 0 → true → "light"
      // - hapticEnabled: i % 2 === 0 → true
      // - messageFontSize: 16 + 4 → 20
      expect(result.current.theme).toBe("light");
      expect(result.current.hapticEnabled).toBe(true);
      expect(result.current.messageFontSize).toBe(20);
    });
  });

  describe("Persistence", () => {
    it("should persist state changes to secure storage", async () => {
      const { result } = createStore();

      act(() => {
        result.current.setTheme("gruvbox-dark-hard");
      });

      // Wait for persistence to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        "settings-storage",
        expect.any(String)
      );
    });

    it("should handle secure storage errors gracefully for set operations", async () => {
      // Mock secure store to throw an error
      mockSecureStore.setItemAsync.mockRejectedValue(new Error("Storage error"));

      const { result } = createStore();

      // Should not throw an error
      expect(() => {
        act(() => {
          result.current.setTheme("one-dark");
        });
      }).not.toThrow();
    });

    it("should handle secure storage errors gracefully for get operations", async () => {
      // Mock secure store to throw an error during initial load
      mockSecureStore.getItemAsync.mockRejectedValue(new Error("Storage error"));

      // Creating store should not throw
      expect(() => {
        renderHook(() => useSettingsStore());
      }).not.toThrow();
    });

    it("should handle secure storage errors gracefully for delete operations", async () => {
      // Mock secure store to throw an error
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error("Storage error"));

      const { result } = createStore();

      // Reset should not throw even if storage fails
      expect(() => {
        act(() => {
          result.current.resetSettings();
        });
      }).not.toThrow();
    });
  });

  describe("Type Safety", () => {
    it("should accept all valid theme types", () => {
      const { result } = createStore();
      const validThemes = [
        "light",
        "dark",
        "nord",
        "catppuccin",
        "tokyo-night",
        "tokyo-night-storm",
        "tokyo-night-moon",
        "one-dark",
        "gruvbox-dark-hard",
        "gruvbox-dark-medium",
        "gruvbox-dark-soft",
        "darcula",
        "system",
      ] as const;

      validThemes.forEach((theme) => {
        expect(() => {
          act(() => {
            result.current.setTheme(theme);
          });
        }).not.toThrow();
        expect(result.current.theme).toBe(theme);
      });
    });

    it("should maintain boolean type for boolean settings", () => {
      const { result } = createStore();

      // Haptic enabled
      act(() => {
        result.current.setHapticEnabled(true);
      });
      expect(result.current.hapticEnabled).toBe(true);
      expect(typeof result.current.hapticEnabled).toBe("boolean");

      act(() => {
        result.current.setHapticEnabled(false);
      });
      expect(result.current.hapticEnabled).toBe(false);
      expect(typeof result.current.hapticEnabled).toBe("boolean");

      // Auto generate titles
      act(() => {
        result.current.setAutoGenerateTitles(true);
      });
      expect(result.current.autoGenerateTitles).toBe(true);
      expect(typeof result.current.autoGenerateTitles).toBe("boolean");

      // Show code line numbers
      act(() => {
        result.current.setShowCodeLineNumbers(true);
      });
      expect(result.current.showCodeLineNumbers).toBe(true);
      expect(typeof result.current.showCodeLineNumbers).toBe("boolean");
    });

    it("should maintain number type for font size", () => {
      const { result } = createStore();

      const fontSizes = [12, 14, 16, 18, 20, 22, 24];

      fontSizes.forEach((size) => {
        act(() => {
          result.current.setMessageFontSize(size);
        });
        expect(result.current.messageFontSize).toBe(size);
        expect(typeof result.current.messageFontSize).toBe("number");
      });
    });
  });
});