import React from "react";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { CustomMarkdown } from "../CustomMarkdown";

const mockEnrichedMarkdown = jest.fn();

jest.mock("react-native-enriched-markdown", () => ({
  EnrichedMarkdownText: function MockEnrichedMarkdownText(props: any) {
    mockEnrichedMarkdown(props);
    return null;
  },
}));

jest.mock("@/components/ui/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({
    theme: {
      isDark: false,
      colors: {
        text: "#000000",
        textSecondary: "#666666",
        background: "#111111",
        surface: "#ffffff",
        accent: "#007AFF",
        border: "#d0d0d0",
        error: "#dc2626",
      },
      borderRadius: {
        sm: 6,
        md: 10,
      },
    },
  })),
}));

describe("CustomMarkdown", () => {
  beforeEach(() => {
    mockEnrichedMarkdown.mockClear();
  });

  it("renders streaming markdown directly without a code fence fallback", () => {
    const incompleteCodeBlock = "```ts\nconst answer = 42;";

    render(<CustomMarkdown content={incompleteCodeBlock} />);

    const latestCall = mockEnrichedMarkdown.mock.calls.at(-1);
    expect(latestCall).toBeDefined();
    expect(latestCall?.[0].markdown).toBe(incompleteCodeBlock);
  });

  it("uses dynamic width container for user messages", () => {
    render(<CustomMarkdown content="Short user message" isUser={true} />);

    const latestCall = mockEnrichedMarkdown.mock.calls.at(-1);
    expect(latestCall).toBeDefined();

    const props = latestCall?.[0];
    const containerStyle = StyleSheet.flatten(props.containerStyle);

    expect(containerStyle.alignSelf).toBe("flex-start");
    expect(containerStyle.minWidth).toBeUndefined();
  });

  it("keeps full-width markdown container for assistant messages", () => {
    render(<CustomMarkdown content="Assistant content" isUser={false} />);

    const latestCall = mockEnrichedMarkdown.mock.calls.at(-1);
    expect(latestCall).toBeDefined();

    const props = latestCall?.[0];
    const containerStyle = StyleSheet.flatten(props.containerStyle);

    expect(containerStyle.minWidth).toBe("100%");
  });

  it("coerces non-string content before rendering markdown", () => {
    render(<CustomMarkdown content={{ text: "Object content" }} />);

    const latestCall = mockEnrichedMarkdown.mock.calls.at(-1);
    expect(latestCall?.[0].markdown).toBe("Object content");
  });
});
