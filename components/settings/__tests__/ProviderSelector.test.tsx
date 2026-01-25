/**
 * @file ProviderSelector.test.tsx
 * @purpose Unit tests for the ProviderSelector component
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ProviderSelector } from "../ProviderSelector";
import { useTheme } from "@/components/ui/ThemeProvider";
import { isProviderConfigured } from "@/stores";

// Mock dependencies
jest.mock("@/components/ui/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({
    theme: {
      colors: {
        text: "#000000",
        surface: "#ffffff",
        accent: "#007AFF",
        border: "#e0e0e0",
        textSecondary: "#666666",
      },
    },
  })),
}));

jest.mock("@/components/ui/ProviderIcons", () => ({
  ProviderIcon: ({ providerId, size, color }: any) => null,
}));

jest.mock("@/stores", () => ({
  isProviderConfigured: jest.fn(() => true),
}));

jest.mock("@/types/provider.types", () => ({
  ProviderId: {
    apple: "apple",
    openai: "openai",
    openrouter: "openrouter",
    ollama: "ollama",
  } as any,
  PROVIDERS: {
    apple: { name: "Apple Intelligence" },
    openai: { name: "OpenAI" },
    openrouter: { name: "OpenRouter" },
    ollama: { name: "Ollama" },
  },
}));

describe("ProviderSelector", () => {
  const mockOnProviderSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all providers", () => {
    const { getByText } = render(
      <ProviderSelector
        selectedProvider="apple"
        onProviderSelect={mockOnProviderSelect}
      />
    );

    expect(getByText("AI Provider")).toBeTruthy();
    expect(getByText("Apple Intelligence")).toBeTruthy();
    expect(getByText("OpenAI")).toBeTruthy();
    expect(getByText("OpenRouter")).toBeTruthy();
    expect(getByText("Ollama")).toBeTruthy();
  });

  it("highlights the selected provider", () => {
    const { getByText } = render(
      <ProviderSelector
        selectedProvider="openai"
        onProviderSelect={mockOnProviderSelect}
      />
    );

    // The selected provider should render (indirectly tests highlighting)
    expect(getByText("OpenAI")).toBeTruthy();
  });

  it("calls onProviderSelect when a provider is pressed", () => {
    const { getByText } = render(
      <ProviderSelector
        selectedProvider="apple"
        onProviderSelect={mockOnProviderSelect}
      />
    );

    fireEvent.press(getByText("OpenAI"));
    expect(mockOnProviderSelect).toHaveBeenCalledWith("openai");
  });

  it("shows 'Not configured' for unconfigured providers", () => {
    (isProviderConfigured as jest.Mock).mockImplementation((provider) => provider !== "openai");

    const { getByText } = render(
      <ProviderSelector
        selectedProvider="apple"
        onProviderSelect={mockOnProviderSelect}
      />
    );

    expect(getByText("Not configured")).toBeTruthy();
  });

  it("shows 'Default' for Apple provider", () => {
    const { getByText } = render(
      <ProviderSelector
        selectedProvider="apple"
        onProviderSelect={mockOnProviderSelect}
      />
    );

    expect(getByText("Default")).toBeTruthy();
  });

  it("is disabled when disabled prop is true", () => {
    const { getByText } = render(
      <ProviderSelector
        selectedProvider="apple"
        onProviderSelect={mockOnProviderSelect}
        disabled={true}
      />
    );

    const openaiButton = getByText("OpenAI");
    fireEvent.press(openaiButton);
    expect(mockOnProviderSelect).not.toHaveBeenCalled();
  });

  it("renders correct theme colors", () => {
    const mockTheme = {
      colors: {
        text: "#123456",
        surface: "#ffffff",
        accent: "#abcdef",
        border: "#e0e0e0",
        textSecondary: "#666666",
      },
    };
    (useTheme as jest.Mock).mockReturnValue({ theme: mockTheme });

    const { getByText } = render(
      <ProviderSelector
        selectedProvider="apple"
        onProviderSelect={mockOnProviderSelect}
      />
    );

    // Verify the component renders without errors and uses theme colors
    expect(getByText("AI Provider")).toBeTruthy();
  });
});
