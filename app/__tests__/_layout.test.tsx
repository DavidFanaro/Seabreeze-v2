import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import React from "react";

import RootLayout from "../_layout";

jest.mock("drizzle-orm/expo-sqlite/migrator", () => ({
  useMigrations: jest.fn(),
}));

jest.mock("expo-sqlite", () => ({
  SQLiteProvider: ({ children }: any) => children,
}));

jest.mock("expo-drizzle-studio-plugin", () => ({
  useDrizzleStudio: jest.fn(),
}));

jest.mock("expo-router", () => {
  function Stack({ children }: any) {
    return children;
  }

  function StackScreen() {
    return null;
  }

  Stack.Screen = StackScreen;
  return { Stack };
});

jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

jest.mock("react-native-keyboard-controller", () => ({
  KeyboardProvider: ({ children }: any) => children,
}));

jest.mock("heroui-native", () => ({
  HeroUINativeProvider: ({ children }: any) => children,
}));

jest.mock("@react-navigation/native", () => ({
  DarkTheme: {
    dark: true,
    colors: {
      primary: "#007AFF",
      background: "#000000",
      card: "#1c1c1e",
      text: "#ffffff",
      border: "#333333",
      notification: "#ff3b30",
    },
  },
  DefaultTheme: {
    dark: false,
    colors: {
      primary: "#007AFF",
      background: "#ffffff",
      card: "#f2f2f7",
      text: "#000000",
      border: "#c0c0c0",
      notification: "#ff3b30",
    },
  },
  ThemeContext: ({ children }: any) => children,
}));

jest.mock("@/components/ui/ThemeProvider", () => ({
  ThemeProvider: ({ children }: any) => children,
  useTheme: () => ({
    theme: {
      colors: {
        accent: "#007AFF",
        background: "#000000",
        text: "#ffffff",
        border: "#333333",
      },
    },
    themeType: "dark",
  }),
}));

jest.mock("@/hooks/useDatabase", () => ({
  __esModule: true,
  default: jest.fn(() => ({ $client: {} })),
  dbname: "seabreeze",
}));

jest.mock("@/global.css", () => ({}));
jest.mock("@/lib/polyfills", () => ({}));

const useMigrationsMock = jest.mocked(useMigrations);

describe("RootLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMigrationsMock.mockReturnValue({ error: undefined, success: true });
  });

  it("renders the app shell", () => {
    render(<RootLayout />);
    expect(true).toBe(true);
  });

  it("renders a migration error state", () => {
    useMigrationsMock.mockReturnValueOnce({
      error: new Error("Migration failed"),
      success: false,
    });

    const { getByText } = render(<RootLayout />);
    expect(getByText("Migration error: Migration failed")).toBeTruthy();
  });

  it("renders a loading state while migrations run", () => {
    useMigrationsMock.mockReturnValueOnce({ error: undefined, success: false });

    const { getByText } = render(<RootLayout />);
    expect(getByText("Running migrations...")).toBeTruthy();
  });
});
