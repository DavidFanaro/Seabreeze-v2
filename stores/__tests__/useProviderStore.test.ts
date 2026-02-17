/**
 * @file useProviderStore.test.ts
 * @purpose Test suite for provider store state management
 */

import { renderHook, act } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as SecureStore from "expo-secure-store";
import { useProviderStore, getDefaultModelForProvider } from "../useProviderStore";
import type { ProviderId } from "@/types/provider.types";

// Mock expo-secure-store module
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockSecureStore = jest.mocked(SecureStore);

describe("useProviderStore", () => {
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
    const hook = renderHook(() => useProviderStore());
    // Reset to defaults
    act(() => {
      hook.result.current.resetToDefaults();
    });
    return hook;
  };

  describe("Store Initialization", () => {
    it("should initialize with default state values", () => {
      const { result } = createStore();

      expect(result.current.selectedProvider).toBe("apple");
      expect(result.current.selectedModel).toBe("system-default");
    });

    it("should provide all required actions", () => {
      const { result } = createStore();

      expect(typeof result.current.setSelectedProvider).toBe("function");
      expect(typeof result.current.setSelectedModel).toBe("function");
      expect(typeof result.current.setAvailableModels).toBe("function");
      expect(typeof result.current.addCustomModel).toBe("function");
      expect(typeof result.current.editCustomModel).toBe("function");
      expect(typeof result.current.deleteCustomModel).toBe("function");
      expect(typeof result.current.deleteModel).toBe("function");
      expect(typeof result.current.setHiddenModels).toBe("function");
      expect(typeof result.current.resetToDefaults).toBe("function");
    });
  });

  describe("Provider Selection", () => {
    it("should change selected provider and update model", () => {
      const { result } = createStore();

      act(() => {
        result.current.setSelectedProvider("openai");
      });

      expect(result.current.selectedProvider).toBe("openai");
      expect(result.current.selectedModel).toBe("gpt-4o");
    });

    it("should handle switching to all providers correctly", () => {
      const { result } = createStore();
      const providers: ProviderId[] = ["apple", "openai", "openrouter", "ollama"];

      providers.forEach((provider) => {
        act(() => {
          result.current.setSelectedProvider(provider);
        });
        expect(result.current.selectedProvider).toBe(provider);
        expect(result.current.selectedModel).toBeTruthy();
      });
    });
  });

  describe("Model Selection", () => {
    it("should update selected model", () => {
      const { result } = createStore();

      act(() => {
        result.current.setSelectedModel("gpt-4o-mini");
      });

      expect(result.current.selectedModel).toBe("gpt-4o-mini");
    });
  });

  describe("Available Models Management", () => {
    it("should normalize and dedupe Ollama available models", () => {
      const { result } = createStore();

      act(() => {
        result.current.setAvailableModels("ollama", [" llama3.2 ", "", "mistral", "mistral"]);
      });

      expect(result.current.availableModels.ollama).toEqual(["llama3.2", "mistral"]);
    });

    it("should remove custom Ollama models that overlap with fetched models", () => {
      const { result } = createStore();

      act(() => {
        result.current.addCustomModel("ollama", "mistral");
      });
      act(() => {
        result.current.addCustomModel("ollama", "my-local-model");
      });

      act(() => {
        result.current.setAvailableModels("ollama", ["llama3.2", "mistral"]);
      });

      expect(result.current.customModels.ollama).toEqual(["my-local-model"]);
    });

    it("should keep selected model when overlapping custom model becomes fetched", () => {
      const { result } = createStore();

      act(() => {
        result.current.setSelectedProvider("ollama");
      });
      act(() => {
        result.current.addCustomModel("ollama", "custom-model");
      });
      act(() => {
        result.current.setSelectedModel("custom-model");
      });

      act(() => {
        result.current.setAvailableModels("ollama", ["custom-model", "llama3.2"]);
      });

      expect(result.current.customModels.ollama).toEqual([]);
      expect(result.current.selectedModel).toBe("custom-model");
    });

    it("should fallback selected model when current Ollama selection is unavailable", () => {
      const { result } = createStore();

      act(() => {
        result.current.setSelectedProvider("ollama");
      });
      act(() => {
        result.current.setSelectedModel("stale-model");
      });

      act(() => {
        result.current.setAvailableModels("ollama", ["mistral"]);
      });

      expect(result.current.selectedModel).toBe("mistral");
    });

    it("should normalize non-Ollama available models without mutating custom models", () => {
      const { result } = createStore();

      act(() => {
        result.current.addCustomModel("openai", "custom-openai");
      });

      act(() => {
        result.current.setAvailableModels("openai", [" gpt-4o ", "gpt-4o"]);
      });

      expect(result.current.availableModels.openai).toEqual(["gpt-4o"]);
      expect(result.current.customModels.openai).toEqual(["custom-openai"]);
    });
  });

  describe("Custom Models Management", () => {
    it("should add custom model to provider", () => {
      const { result } = createStore();

      act(() => {
        result.current.addCustomModel("openai", "custom-gpt-model");
      });

      expect(result.current.customModels.openai).toContain("custom-gpt-model");
      expect(result.current.customModels.openai).toHaveLength(1);
    });

    it("should prevent duplicate custom models", () => {
      const { result } = createStore();

      act(() => {
        result.current.addCustomModel("openai", "duplicate-model");
      });
      act(() => {
        result.current.addCustomModel("openai", "duplicate-model");
      });

      expect(result.current.customModels.openai).toEqual(["duplicate-model"]);
    });

    it("should edit custom model name", () => {
      const { result } = createStore();

      act(() => {
        result.current.addCustomModel("openai", "old-name");
      });
      
      act(() => {
        result.current.editCustomModel("openai", "old-name", "new-name");
      });

      expect(result.current.customModels.openai).not.toContain("old-name");
      expect(result.current.customModels.openai).toContain("new-name");
    });

    it("should update selected model when editing selected custom model", () => {
      const { result } = createStore();

      act(() => {
        result.current.addCustomModel("openai", "old-model");
      });
      
      act(() => {
        result.current.setSelectedModel("old-model");
      });
      
      act(() => {
        result.current.editCustomModel("openai", "old-model", "new-model");
      });

      expect(result.current.selectedModel).toBe("new-model");
    });

    it("should handle editing non-existent custom model gracefully", () => {
      const { result } = createStore();

      act(() => {
        result.current.editCustomModel("openai", "non-existent", "new-name");
      });

      expect(result.current.customModels.openai).toEqual([]);
    });

    it("should delete custom model", () => {
      const { result } = createStore();

      act(() => {
        result.current.addCustomModel("openai", "model-to-delete");
      });
      
      act(() => {
        result.current.addCustomModel("openai", "model-to-keep");
      });

      act(() => {
        result.current.deleteCustomModel("openai", "model-to-delete");
      });

      expect(result.current.customModels.openai).not.toContain("model-to-delete");
      expect(result.current.customModels.openai).toContain("model-to-keep");
    });

    it("should update selection when deleting selected custom model", () => {
      const { result } = createStore();

      act(() => {
        result.current.addCustomModel("openai", "custom-model");
      });
      
      act(() => {
        result.current.setSelectedModel("custom-model");
      });

      act(() => {
        result.current.deleteCustomModel("openai", "custom-model");
      });

      expect(result.current.selectedModel).toBe("gpt-4o"); // Falls back to default
    });
  });

  describe("Universal Model Deletion", () => {
    it("should hide default models instead of deleting them", () => {
      const { result } = createStore();

      act(() => {
        result.current.deleteModel("openai", "gpt-4o");
      });

      expect(result.current.hiddenModels.openai).toContain("gpt-4o");
      expect(result.current.customModels.openai).toEqual([]);
    });

    it("should delete custom models completely", () => {
      const { result } = createStore();

      act(() => {
        result.current.addCustomModel("openai", "custom-model");
      });
      
      act(() => {
        result.current.deleteModel("openai", "custom-model");
      });

      expect(result.current.customModels.openai).not.toContain("custom-model");
      expect(result.current.hiddenModels.openai).not.toContain("custom-model");
    });

    it("should update selection when deleting selected default model", () => {
      const { result } = createStore();

      act(() => {
        result.current.setSelectedProvider("openai");
      });
      
      act(() => {
        result.current.setSelectedModel("gpt-4o");
      });
      
      act(() => {
        result.current.deleteModel("openai", "gpt-4o");
      });

      expect(result.current.selectedModel).toBe("gpt-4o-mini");
    });

    it("should update selection when deleting selected custom model", () => {
      const { result } = createStore();

      act(() => {
        result.current.addCustomModel("openai", "custom-model");
      });
      
      act(() => {
        result.current.setSelectedModel("custom-model");
      });
      
      act(() => {
        result.current.deleteModel("openai", "custom-model");
      });

      expect(result.current.selectedModel).toBe("gpt-4o");
    });
  });

  describe("Hidden Models Management", () => {
    it("should set hidden models for all providers", () => {
      const { result } = createStore();
      const hiddenModels = {
        apple: [],
        openai: ["gpt-4o"],
        openrouter: ["openai/gpt-4o"],
        ollama: ["llama3.2"],
      };

      act(() => {
        result.current.setHiddenModels(hiddenModels);
      });

      expect(result.current.hiddenModels).toEqual(hiddenModels);
    });
  });

  describe("Reset to Defaults", () => {
    it("should reset all state to initial values", () => {
      const { result } = createStore();

      // Make various changes
      act(() => {
        result.current.setSelectedProvider("openai");
      });
      
      act(() => {
        result.current.setSelectedModel("gpt-4o-mini");
      });
      
      act(() => {
        result.current.addCustomModel("openai", "custom-1");
      });
      
      act(() => {
        result.current.deleteModel("openai", "gpt-4o");
      });

      // Reset to defaults
      act(() => {
        result.current.resetToDefaults();
      });

      expect(result.current.selectedProvider).toBe("apple");
      expect(result.current.selectedModel).toBe("system-default");
      expect(result.current.customModels).toEqual({
        apple: [],
        openai: [],
        openrouter: [],
        ollama: [],
      });
      expect(result.current.hiddenModels).toEqual({
        apple: [],
        openai: [],
        openrouter: [],
        ollama: [],
      });
    });
  });

  describe("Utility Functions", () => {
    it("should get default model for each provider", () => {
      expect(getDefaultModelForProvider("apple")).toBe("system-default");
      expect(getDefaultModelForProvider("openai")).toBe("gpt-4o");
      expect(getDefaultModelForProvider("openrouter")).toBe("openai/gpt-4o");
      expect(getDefaultModelForProvider("ollama")).toBe("llama3.2");
    });
  });

  describe("Persistence", () => {
    it("should persist state changes to secure storage", async () => {
      const { result } = createStore();

      act(() => {
        result.current.setSelectedProvider("openai");
      });

      // Wait for persistence to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        "ai-provider-storage",
        expect.any(String)
      );
    });

    it("should handle secure storage errors gracefully", async () => {
      // Mock secure store to throw an error
      mockSecureStore.setItemAsync.mockRejectedValue(new Error("Storage error"));

      const { result } = createStore();

      // Should not throw an error
      expect(() => {
        act(() => {
          result.current.setSelectedProvider("openai");
        });
      }).not.toThrow();
    });
  });
});
