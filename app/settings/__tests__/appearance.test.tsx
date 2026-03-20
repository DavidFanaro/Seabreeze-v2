import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import React from "react";

import AppearanceSettings from "../appearance";

jest.mock("expo-symbols", () => ({
  SymbolView: () => null,
}));

jest.mock("@/components/settings/SettingsScreen", () => ({
  SettingsScreen: ({ children }: any) => children,
}));

const mockSetTheme = jest.fn();

jest.mock("@/components/ui/ThemeProvider", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: "#ffffff",
        surface: "#f5f5f5",
        text: "#000000",
        textSecondary: "#666666",
        accent: "#007AFF",
        border: "#e0e0e0",
      },
    },
    themeMode: "light",
    setTheme: mockSetTheme,
  }),
}));

describe("AppearanceSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the theme section and all supported options", () => {
    const { getByText } = render(<AppearanceSettings />);

    expect(getByText("Theme")).toBeTruthy();
    expect(getByText("Light")).toBeTruthy();
    expect(getByText("Dark")).toBeTruthy();
    expect(getByText("Tokyo Night (Night)")).toBeTruthy();
    expect(getByText("System")).toBeTruthy();
  });

  it("does not render the removed chat display section", () => {
    const { queryByText } = render(<AppearanceSettings />);
    expect(queryByText("CHAT DISPLAY")).toBeNull();
    expect(queryByText("Show Code Line Numbers")).toBeNull();
  });
});
