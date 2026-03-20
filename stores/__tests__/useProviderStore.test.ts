import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { useProviderStore } from "../useProviderStore";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe("useProviderStore", () => {
  beforeEach(() => {
    useProviderStore.setState((state) => ({
      ...state,
      selectedProvider: "ollama",
      selectedModel: "gpt-oss:latest",
      availableModels: {
        apple: ["system-default"],
        openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        openrouter: [
          "openai/gpt-4o",
          "openai/gpt-4o-mini",
          "anthropic/claude-sonnet-4-20250514",
        ],
        ollama: ["gpt-oss:latest", "llama3.2", "mistral", "codellama", "qwen2.5"],
      },
      customModels: {
        apple: [],
        openai: [],
        openrouter: [],
        ollama: [],
      },
      hiddenModels: {
        apple: [],
        openai: [],
        openrouter: [],
        ollama: [],
      },
    }));
  });

  it("initializes with the default provider selection", () => {
    const { result } = renderHook(() => useProviderStore());

    expect(result.current.selectedProvider).toBe("ollama");
    expect(result.current.selectedModel).toBe("gpt-oss:latest");
  });

  it("switches providers and picks the first visible model", () => {
    const { result } = renderHook(() => useProviderStore());

    act(() => {
      result.current.setSelectedProvider("openai");
    });

    expect(result.current.selectedProvider).toBe("openai");
    expect(result.current.selectedModel).toBe("gpt-4o");
  });

  it("normalizes Ollama models and keeps the selected model visible", () => {
    const { result } = renderHook(() => useProviderStore());

    act(() => {
      result.current.setAvailableModels("ollama", [" llama3.2 ", "mistral", "mistral", ""] as any);
    });

    expect(result.current.availableModels.ollama).toEqual(["llama3.2", "mistral"]);
    expect(result.current.selectedModel).toBe("llama3.2");
  });

  it("adds and removes custom models", () => {
    const { result } = renderHook(() => useProviderStore());

    act(() => {
      result.current.addCustomModel("openai", "custom-model");
    });

    expect(result.current.customModels.openai).toEqual(["custom-model"]);

    act(() => {
      result.current.deleteModel("openai", "custom-model");
    });

    expect(result.current.customModels.openai).toEqual([]);
  });
});
