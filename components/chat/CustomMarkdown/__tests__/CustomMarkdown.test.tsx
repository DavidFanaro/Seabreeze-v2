import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Animated, StyleSheet } from "react-native";
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
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    mockEnrichedMarkdown.mockClear();
    timingSpy = jest.spyOn(Animated, "timing").mockImplementation(() => ({
      start: (callback?: (result: { finished: boolean }) => void) => {
        callback?.({ finished: true });
      },
    }) as any);
  });

  afterEach(() => {
    timingSpy.mockRestore();
  });

  it("renders streaming markdown directly without a code fence fallback", () => {
    const incompleteCodeBlock = "```ts\nconst answer = 42;";

    render(<CustomMarkdown content={incompleteCodeBlock} isStreaming={true} />);

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

  it("animates append-only streaming updates", () => {
    const { getByTestId, rerender } = render(<CustomMarkdown content="Hello" isStreaming={true} />);

    fireEvent(getByTestId("custom-markdown-container"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 20 } },
    });

    timingSpy.mockClear();

    act(() => {
      rerender(<CustomMarkdown content="Hello world" isStreaming={true} />);
    });

    expect(timingSpy).not.toHaveBeenCalled();

    fireEvent(getByTestId("custom-markdown-container"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 40 } },
    });

    expect(timingSpy).toHaveBeenCalledTimes(1);
  });

  it("does not animate append-only updates when height does not grow", () => {
    const { getByTestId, rerender } = render(<CustomMarkdown content="Hello" isStreaming={true} />);

    fireEvent(getByTestId("custom-markdown-container"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 20 } },
    });

    timingSpy.mockClear();

    act(() => {
      rerender(<CustomMarkdown content="Hello there" isStreaming={true} />);
    });

    fireEvent(getByTestId("custom-markdown-container"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 20 } },
    });

    expect(timingSpy).not.toHaveBeenCalled();
  });

  it("does not animate non-append streaming updates", () => {
    const { rerender } = render(<CustomMarkdown content="Hello" isStreaming={true} />);

    timingSpy.mockClear();

    act(() => {
      rerender(<CustomMarkdown content="Updated hello" isStreaming={true} />);
    });

    expect(timingSpy).not.toHaveBeenCalled();
  });
});
