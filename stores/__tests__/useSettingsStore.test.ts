import { act, renderHook } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as SecureStore from "expo-secure-store";

import { useSettingsStore } from "../useSettingsStore";

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
    mockSecureStore.deleteItemAsync.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createStore = () => {
    const hook = renderHook(() => useSettingsStore());

    act(() => {
      hook.result.current.resetSettings();
    });

    return hook;
  };

  it("initializes with the simplified default settings", () => {
    const { result } = createStore();

    expect(result.current.theme).toBe("dark");
    expect(result.current.thinkingEnabled).toBe(true);
    expect(result.current.thinkingLevel).toBe("medium");
  });

  it("updates the selected theme", () => {
    const { result } = createStore();

    act(() => {
      result.current.setTheme("darcula");
    });

    expect(result.current.theme).toBe("darcula");
  });

  it("updates thinking settings", () => {
    const { result } = createStore();

    act(() => {
      result.current.setThinkingEnabled(false);
      result.current.setThinkingLevel("high");
    });

    expect(result.current.thinkingEnabled).toBe(false);
    expect(result.current.thinkingLevel).toBe("high");
  });

  it("resets back to the defaults", () => {
    const { result } = createStore();

    act(() => {
      result.current.setTheme("light");
      result.current.setThinkingEnabled(false);
      result.current.setThinkingLevel("low");
      result.current.resetSettings();
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.thinkingEnabled).toBe(true);
    expect(result.current.thinkingLevel).toBe("medium");
  });
});
