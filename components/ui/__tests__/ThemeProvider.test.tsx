import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { ThemeProvider, useTheme } from "../ThemeProvider";

function TestComponent() {
  const { theme, themeType, themeMode } = useTheme();

  return (
    <>
      <Text testID="theme-background">{theme.colors.background}</Text>
      <Text testID="theme-type">{themeType}</Text>
      <Text testID="theme-mode">{themeMode}</Text>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("dark");
    useSettingsStore.setState((state) => ({
      ...state,
      theme: "dark",
      thinkingEnabled: true,
      thinkingLevel: "medium",
      __meta: {
        ...state.__meta,
        hasHydrated: true,
      },
    }));
  });

  it("uses the persisted theme from the settings store", () => {
    useSettingsStore.getState().setTheme("light");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-background")).toHaveTextContent("#f2f2f7");
    expect(screen.getByTestId("theme-type")).toHaveTextContent("light");
    expect(screen.getByTestId("theme-mode")).toHaveTextContent("light");
  });

  it("resolves the system theme using the current device color scheme", () => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("light");
    useSettingsStore.getState().setTheme("system");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-background")).toHaveTextContent("#f2f2f7");
    expect(screen.getByTestId("theme-type")).toHaveTextContent("light");
    expect(screen.getByTestId("theme-mode")).toHaveTextContent("system");
  });
});
