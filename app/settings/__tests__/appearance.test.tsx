import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render } from "@testing-library/react-native";
import React from "react";
import AppearanceSettings from "../appearance";

jest.mock("expo-router", () => ({
  router: {
    dismiss: jest.fn(),
  },
  Stack: {
    Screen: () => null,
  },
}));

jest.mock("expo-symbols", () => ({
  SymbolView: () => null,
}));

jest.mock("@/components", () => ({
  IconButton: () => null,
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
    setTheme: jest.fn(),
  }),
}));

describe("AppearanceSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Theme section", () => {
    const { getByText } = render(<AppearanceSettings />);
    expect(getByText("Theme")).toBeTruthy();
  });

  it("renders all supported theme options", () => {
    const { getByText } = render(<AppearanceSettings />);

    const labels = [
      "Light",
      "Dark",
      "Nord",
      "Catppuccin",
      "Tokyo Night (Night)",
      "Tokyo Night (Storm)",
      "Tokyo Night (Moon)",
      "One Dark",
      "Gruvbox (Dark Hard)",
      "Gruvbox (Dark Medium)",
      "Gruvbox (Dark Soft)",
      "Darcula",
      "System",
    ];

    labels.forEach((label) => {
      expect(getByText(label)).toBeTruthy();
    });
  });

  it("does not render the removed chat display section", () => {
    const { queryByText } = render(<AppearanceSettings />);
    expect(queryByText("CHAT DISPLAY")).toBeNull();
    expect(queryByText("Show Code Line Numbers")).toBeNull();
  });
});
