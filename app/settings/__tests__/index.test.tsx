import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import React from "react";

import SettingsIndex from "../index";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    dismiss: jest.fn(),
  },
}));

jest.mock("expo-symbols", () => ({
  SymbolView: () => null,
}));

jest.mock("@/components/settings/SettingsScreen", () => ({
  SettingsScreen: ({ children }: any) => children,
}));

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
  }),
}));

jest.mock("@/components/ui/ProviderIcons", () => ({
  ProviderIcon: () => null,
}));

jest.mock("@/stores", () => ({
  isProviderConfigured: jest.fn((providerId: string) => providerId === "apple" || providerId === "openai"),
  useProviderStore: () => ({
    selectedProvider: "openai",
    selectedModel: "gpt-4o",
  }),
}));

describe("SettingsIndex", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the general, providers, and about sections", () => {
    const { getByText } = render(<SettingsIndex />);

    expect(getByText("General")).toBeTruthy();
    expect(getByText("Providers")).toBeTruthy();
    expect(getByText("About")).toBeTruthy();
  });

  it("renders the provider rows and descriptions", () => {
    const { getByText } = render(<SettingsIndex />);

    expect(getByText("Apple Intelligence")).toBeTruthy();
    expect(getByText("OpenAI")).toBeTruthy();
    expect(getByText("OpenRouter")).toBeTruthy();
    expect(getByText("Ollama")).toBeTruthy();
    expect(getByText("On-device AI powered by Apple Silicon")).toBeTruthy();
    expect(getByText("ChatGPT and other OpenAI models")).toBeTruthy();
  });

  it("shows the selected model for the active provider", () => {
    const { getByText } = render(<SettingsIndex />);
    expect(getByText("gpt-4o")).toBeTruthy();
  });
});
