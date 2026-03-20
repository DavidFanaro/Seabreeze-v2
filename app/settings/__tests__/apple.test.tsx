import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import React from "react";

import AppleSettings from "../apple";

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

describe("AppleSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the informational sections", () => {
    const { getByText } = render(<AppleSettings />);

    expect(getByText("About")).toBeTruthy();
    expect(getByText("Features")).toBeTruthy();
    expect(getByText("Requirements")).toBeTruthy();
  });

  it("renders the feature and requirement bullets", () => {
    const { getByText } = render(<AppleSettings />);

    expect(getByText(/Writing Tools/)).toBeTruthy();
    expect(getByText(/On-Device Processing/)).toBeTruthy();
    expect(getByText(/iPhone 15 Pro or later/)).toBeTruthy();
    expect(getByText(/Latest iOS, iPadOS, or macOS/)).toBeTruthy();
  });
});
