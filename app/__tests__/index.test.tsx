import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import React from "react";

import Home, { getPreview } from "../index";

jest.mock("expo-router", () => ({
  Stack: {
    Screen: () => null,
  },
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("@/components/ui/ThemeProvider", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        accent: "#007AFF",
        background: "#000000",
        text: "#ffffff",
        textSecondary: "#999999",
        glass: "#1c1c1e",
      },
    },
  }),
}));

jest.mock("@/components/ui/IconButton", () => ({
  IconButton: () => null,
}));

jest.mock("@/components/chat/ChatListItem", () => ({
  ChatListItem: ({ title, preview }: any) => {
    const mockReact = jest.requireActual<typeof import("react")>("react");
    return mockReact.createElement(mockReact.Fragment, null, title, preview);
  },
}));

jest.mock("@/hooks/useDatabase", () => ({
  __esModule: true,
  default: () => ({
    select: () => ({
      from: () => ({
        orderBy: () => ({}),
      }),
    }),
    delete: jest.fn(),
  }),
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn(),
  desc: jest.fn((column) => column),
}));

jest.mock("drizzle-orm/expo-sqlite", () => ({
  useLiveQuery: () => ({
    data: [],
    error: null,
  }),
}));

jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: {
    View: ({ children }: any) => children,
  },
  Animated: {
    View: ({ children }: any) => children,
  },
  FadeIn: {
    duration: () => ({}),
  },
}));

jest.mock("expo-symbols", () => ({
  SymbolView: () => null,
}));

describe("getPreview", () => {
  it("returns null for invalid values", () => {
    expect(getPreview(undefined)).toBeNull();
    expect(getPreview(null)).toBeNull();
    expect(getPreview([])).toBeNull();
    expect(getPreview("not an array" as unknown)).toBeNull();
  });

  it("returns the last message preview", () => {
    const messages = [
      { role: "user", content: "First message" },
      { role: "assistant", content: "Second message" },
      { role: "user", content: "Last message" },
    ];

    expect(getPreview(messages)).toBe("Last message");
  });

  it("truncates long previews to 80 characters", () => {
    const longText = "This is a very long message that exceeds the eighty character limit for the preview text";
    const messages = [{ role: "user", content: longText }];

    expect(getPreview(messages)).toBe(
      "This is a very long message that exceeds the eighty character limit for the prev...",
    );
  });
});

describe("Home", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<Home />);
    expect(true).toBe(true);
  });

  it("shows the empty-state copy when there are no chats", () => {
    const { getByText } = render(<Home />);

    expect(getByText("No Chats Yet")).toBeTruthy();
    expect(getByText("Start a new conversation by tapping + button above")).toBeTruthy();
  });
});
