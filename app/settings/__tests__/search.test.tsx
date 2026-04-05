import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, waitFor } from "@testing-library/react-native";
import React from "react";

import SearchSettings from "../search";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const mockSetSearxngUrl = jest.fn();
const mockSetWebSearchEnabled = jest.fn();
const mockTestSearxngConnection = jest.fn();

let mockSearxngUrl: string | null = "https://search.example.com";
let mockWebSearchEnabled = false;

jest.mock("expo-symbols", () => ({
  SymbolView: () => null,
}));

jest.mock("@/components/ui/ThemeProvider", () => ({
  useTheme: () => ({
    theme: {
      isDark: true,
      colors: {
        background: "#000000",
        surface: "#111111",
        border: "#222222",
        text: "#ffffff",
        textSecondary: "#cccccc",
        accent: "#4f9cf7",
        overlayForeground: "#ffffff",
        error: "#ff6b6b",
      },
    },
  }),
}));

jest.mock("@/components/settings/SettingsScreen", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    SettingsScreen: ({ children }: any) => React.createElement(View, null, children),
  };
});

jest.mock("@/components/settings/SettingInput", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { TextInput } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    SettingInput: ({ value, onChangeText }: any) => React.createElement(TextInput, {
      testID: "search-input",
      value,
      onChangeText,
    }),
  };
});

jest.mock("@/components/ui/SaveButton", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    SaveButton: ({ title, onPress, disabled }: any) => React.createElement(
      Pressable,
      { testID: `button-${title}`, onPress, disabled },
      React.createElement(Text, null, title),
    ),
  };
});

jest.mock("@/components/settings/SettingsStatusBanner", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    SettingsStatusBanner: ({ status }: any) => status ? React.createElement(Text, null, status.message) : null,
  };
});

jest.mock("@/lib/searxng-client", () => ({
  normalizeSearxngUrl: (value: string) => value.replace(/\/$/, ""),
  testSearxngConnection: (...args: any[]) => mockTestSearxngConnection(...args),
}));

jest.mock("@/stores", () => ({
  useAuthStore: (selector: any) => selector({
    searxngUrl: mockSearxngUrl,
    setSearxngUrl: mockSetSearxngUrl,
  }),
}));

jest.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: (selector: any) => selector({
    webSearchEnabled: mockWebSearchEnabled,
    setWebSearchEnabled: mockSetWebSearchEnabled,
  }),
}));

describe("SearchSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearxngUrl = "https://search.example.com";
    mockWebSearchEnabled = false;
    (mockTestSearxngConnection as any).mockResolvedValue({
      success: true,
      message: "Connection looks good.",
    });
  });

  it("saves the normalized URL and web search preference", async () => {
    const { getByTestId, getByText } = renderWithQueryClient(<SearchSettings />);

    fireEvent.changeText(getByTestId("search-input"), "https://search.example.com/");
    fireEvent.press(getByTestId("button-Save Settings"));

    await waitFor(() => {
      expect(mockSetSearxngUrl).toHaveBeenCalledWith("https://search.example.com");
      expect(mockSetWebSearchEnabled).toHaveBeenCalledWith(false);
      expect(getByText("Web search settings saved.")).toBeTruthy();
    });
  });

  it("tests the current SearXNG connection", async () => {
    const { getByTestId, getByText } = renderWithQueryClient(<SearchSettings />);

    fireEvent.changeText(getByTestId("search-input"), "https://custom.example.com");
    fireEvent.press(getByTestId("button-Test Connection"));

    await waitFor(() => {
      expect(mockTestSearxngConnection).toHaveBeenCalledWith("https://custom.example.com");
      expect(getByText("Connection looks good.")).toBeTruthy();
    });
  });
});
