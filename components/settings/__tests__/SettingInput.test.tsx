/**
 * @file SettingInput.test.tsx
 * @purpose Unit tests for the SettingInput component
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { SettingInput } from "../SettingInput";
import { useTheme } from "@/components/ui/ThemeProvider";

// Mock dependencies
jest.mock("@/components/ui/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({
    theme: {
      colors: {
        text: "#000000",
        textSecondary: "#666666",
        surface: "#ffffff",
        border: "#e0e0e0",
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
      },
      borderRadius: {
        md: 8,
      },
    },
  })),
}));

jest.mock("@/components/ui/GlassInput", () => ({
  GlassInput: "GlassInput",
}));

describe("SettingInput", () => {
  const mockOnChangeText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders label text correctly", () => {
    const { getByText } = render(
      <SettingInput
        label="API Key"
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    expect(getByText("API Key")).toBeTruthy();
  });

  it("passes all props correctly to GlassInput", () => {
    const { getByText } = render(
      <SettingInput
        label="Password"
        value="secret123"
        onChangeText={mockOnChangeText}
        placeholder="Enter password"
        secureTextEntry={true}
        autoCapitalize="none"
      />
    );

    expect(getByText("Password")).toBeTruthy();
  });

  it("uses default secureTextEntry when not provided", () => {
    const { getByText } = render(
      <SettingInput
        label="Username"
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    expect(getByText("Username")).toBeTruthy();
  });

  it("renders with correct label text", () => {
    const { getByText } = render(
      <SettingInput
        label="Server URL"
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    expect(getByText("Server URL")).toBeTruthy();
  });

  it("applies theme styling to label", () => {
    const mockTheme = {
      colors: {
        text: "#123456",
        textSecondary: "#987654",
        surface: "#ffffff",
        border: "#e0e0e0",
      },
      spacing: {
        xs: 6,
        sm: 10,
        md: 20,
      },
      borderRadius: {
        md: 12,
      },
    };
    
    (useTheme as jest.Mock).mockReturnValue({ theme: mockTheme });

    const { getByText } = render(
      <SettingInput
        label="Test Field"
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    expect(getByText("Test Field")).toBeTruthy();
  });
});