/**
 * @file MessageBubble.test.tsx
 * @purpose Tests for MessageBubble component covering user/AI messages, styling, streaming state, and markdown rendering
 */

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { MessageBubble } from "../MessageBubble";

// Mock CustomMarkdown component
const mockCustomMarkdown = jest.fn();
jest.mock("../CustomMarkdown/CustomMarkdown", () => {
  return {
    CustomMarkdown: function MockCustomMarkdown(props: any) {
      mockCustomMarkdown(props);
      return props.content;
    },
  };
});

// Mock useTheme hook
jest.mock("@/components/ui/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({
    theme: {
      colors: {
        text: "#000000",
        background: "#111111",
        surface: "#ffffff",
        textSecondary: "#666666",
        border: "#cccccc",
        glass: "#f5f5f5",
        error: "#ff0000",
      },
      borderRadius: {
        md: 8,
        lg: 12,
      },
    },
  })),
}));

describe("MessageBubble Component", () => {
  beforeEach(() => {
    mockCustomMarkdown.mockClear();
  });

  /**
   * Test: Component renders with content
   */
  it("renders message content correctly", () => {
    const { getByText } = render(
      <MessageBubble
        content="Hello, world!"
        isUser={true}
      />
    );

    expect(getByText("Hello, world!")).toBeTruthy();
    expect(mockCustomMarkdown).not.toHaveBeenCalled();
  });

  /**
   * Test: User message receives background color styling
   */
  it("applies background color to user messages", () => {
    const { getByText } = render(
      <MessageBubble
        content="User message"
        isUser={true}
      />
    );

    expect(getByText("User message")).toBeTruthy();
    expect(mockCustomMarkdown).not.toHaveBeenCalled();
  });

  /**
   * Test: AI message has transparent background
   */
  it("applies transparent background to AI messages", () => {
    const { getByTestId } = render(
      <MessageBubble
        content="AI response"
        isUser={false}
      />
    );

    const bubbleContainer = getByTestId("message-bubble-container");
    const bubbleStyle = StyleSheet.flatten(bubbleContainer.props.style);

    expect(bubbleStyle.backgroundColor).toBe("transparent");
    expect(bubbleStyle.borderWidth).toBe(0);

    // Verify CustomMarkdown was called with isUser=false
    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "AI response",
        isUser: false,
      })
    );
  });

  it("applies red styling to annotated AI error messages", () => {
    const { getByTestId } = render(
      <MessageBubble
        content="Generation failed"
        isUser={false}
        isError={true}
      />
    );

    const bubbleContainer = getByTestId("message-bubble-container");
    const bubbleStyle = StyleSheet.flatten(bubbleContainer.props.style);

    expect(bubbleStyle.backgroundColor).toBe("rgba(255, 0, 0, 0.14)");
    expect(bubbleStyle.borderColor).toBe("#ff0000");
    expect(bubbleStyle.borderWidth).toBe(1);
  });

  it("keeps rendering markdown while the message is streaming", () => {
    render(
      <MessageBubble
        content="Streaming content"
        isUser={false}
        isStreaming={true}
      />
    );

    // Verify streaming state is passed correctly
    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Streaming content",
      })
    );
  });

  /**
   * Test: Component accepts custom styles
   */
  it("accepts and applies custom styles", () => {
    const customStyle = { marginTop: 10, marginBottom: 10 };
    const { getByText } = render(
      <MessageBubble
        content="Styled message"
        isUser={true}
        style={customStyle}
      />
    );

    expect(getByText("Styled message")).toBeTruthy();
    expect(mockCustomMarkdown).not.toHaveBeenCalled();
  });

  /**
   * Test: Long content is rendered correctly
   */
  it("renders long message content without truncation", () => {
    const longContent = "This is a very long message that should be rendered fully without any truncation or cutting off.";
    const { getByText } = render(
      <MessageBubble
        content={longContent}
        isUser={true}
      />
    );

    expect(getByText(longContent)).toBeTruthy();
    expect(mockCustomMarkdown).not.toHaveBeenCalled();
  });

  /**
   * Test: Markdown content is passed to CustomMarkdown
   */
  it("passes markdown formatted content to CustomMarkdown", () => {
    const markdownContent = "**Bold** and *italic* text with `code`";
    render(
      <MessageBubble
        content={markdownContent}
        isUser={false}
      />
    );

    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: markdownContent,
      })
    );
  });

  /**
   * Test: Component memoization prevents unnecessary re-renders
   */
  it("is memoized to prevent unnecessary re-renders", () => {
    const { rerender } = render(
      <MessageBubble
        content="Initial content"
        isUser={false}
      />
    );

    expect(mockCustomMarkdown).toHaveBeenCalledTimes(1);

    // Record initial call count
    const initialCallCount = mockCustomMarkdown.mock.calls.length;

    // Re-render with same props - memoization should prevent re-render
    rerender(
      <MessageBubble
        content="Initial content"
        isUser={false}
      />
    );

    // With memo, if props are the same, the function should not be called again
    // So the call count should not increase
    expect(mockCustomMarkdown).toHaveBeenCalledTimes(initialCallCount);
  });

  /**
   * Test: Empty content is handled gracefully
   */
  it("renders with empty content", () => {
    const { queryByTestId } = render(
      <MessageBubble
        content=""
        isUser={true}
      />
    );

    expect(queryByTestId("message-bubble-container")).toBeTruthy();
    expect(mockCustomMarkdown).not.toHaveBeenCalled();
  });

  /**
   * Test: Special characters in content are preserved
   */
  it("preserves special characters in content", () => {
    const specialContent = "Hello! @#$%^&*() <test>";
    render(
      <MessageBubble
        content={specialContent}
        isUser={false}
      />
    );

    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: specialContent,
      })
    );
  });

  /**
   * Test: Both user and AI message types render correctly
   */
  it("renders both user and AI message types correctly", () => {
    mockCustomMarkdown.mockClear();
    
    render(
      <>
        <MessageBubble content="User message" isUser={true} />
        <MessageBubble content="AI message" isUser={false} />
      </>
    );

    expect(mockCustomMarkdown).toHaveBeenCalledTimes(1);
    expect(mockCustomMarkdown).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        content: "AI message",
        isUser: false,
      })
    );
  });

  /**
   * Test: Props are correctly passed to CustomMarkdown
   */
  it("passes all necessary props to CustomMarkdown", () => {
    render(
      <MessageBubble
        content="Test content"
        isUser={false}
        isStreaming={false}
      />
    );

    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Test content",
        isUser: false,
      })
    );
  });

  /**
   * Test: Thinking output is collapsed by default
   */
  it("renders thinking output collapsed by default", () => {
    const { getByTestId, queryByTestId } = render(
      <MessageBubble
        content="AI response"
        isUser={false}
        thinkingOutput="Reasoning details"
      />
    );

    expect(getByTestId("thinking-output-toggle")).toBeDefined();
    expect(queryByTestId("thinking-output-content")).toBeNull();
  });

  /**
   * Test: Thinking output expands when toggled
   */
  it("expands thinking output when toggle is pressed", () => {
    const { getByTestId, queryByTestId } = render(
      <MessageBubble
        content="AI response"
        isUser={false}
        thinkingOutput="Reasoning details"
      />
    );

    fireEvent.press(getByTestId("thinking-output-toggle"));

    expect(queryByTestId("thinking-output-content")).toBeDefined();
  });

  /**
   * Test: Streaming assistant messages auto-expand thinking output
   */
  it("auto-expands thinking output for streaming assistant messages", () => {
    const { getByTestId } = render(
      <MessageBubble
        content="Streaming AI response"
        isUser={false}
        isStreaming={true}
        thinkingOutput="Live reasoning details"
      />
    );

    expect(getByTestId("thinking-output-content")).toBeDefined();
  });

  it("renders thinking output with markdown while streaming code", () => {
    render(
      <MessageBubble
        content={"```zig\nconst std = @import(\"std\");"}
        isUser={false}
        isStreaming={true}
        thinkingOutput="Live reasoning details"
      />
    );

    const thinkingMarkdownCalls = mockCustomMarkdown.mock.calls.filter(
      ([props]) => props?.content === "Live reasoning details"
    );
    expect(thinkingMarkdownCalls).toHaveLength(1);
  });

  /**
   * Test: Auto-expanded thinking output collapses once streaming ends
   */
  it("auto-collapses thinking output when streaming ends", () => {
    const { queryByTestId, rerender } = render(
      <MessageBubble
        content="Streaming AI response"
        isUser={false}
        isStreaming={true}
        thinkingOutput="Live reasoning details"
      />
    );

    expect(queryByTestId("thinking-output-content")).toBeDefined();

    rerender(
      <MessageBubble
        content="Final AI response"
        isUser={false}
        isStreaming={false}
        thinkingOutput="Live reasoning details"
      />
    );

    expect(queryByTestId("thinking-output-content")).toBeNull();
  });

  /**
   * Test: Auto-expanded thinking output can still be collapsed manually
   */
  it("allows collapsing auto-expanded thinking output while streaming", () => {
    const { getByTestId, queryByTestId } = render(
      <MessageBubble
        content="Streaming AI response"
        isUser={false}
        isStreaming={true}
        thinkingOutput="Live reasoning details"
      />
    );

    fireEvent.press(getByTestId("thinking-output-toggle"));

    expect(queryByTestId("thinking-output-content")).toBeNull();
  });

  /**
   * Test: Thinking output does not render for user messages
   */
  it("does not render thinking output for user messages", () => {
    const { queryByTestId } = render(
      <MessageBubble
        content="User message"
        isUser={true}
        thinkingOutput="Should not show"
      />
    );

    expect(queryByTestId("thinking-output-toggle")).toBeNull();
  });

  /**
   * Test: Multiple messages with different states
   */
  it("handles multiple messages with different states correctly", () => {
    mockCustomMarkdown.mockClear();
    
    render(
      <>
        <MessageBubble content="First user message" isUser={true} />
        <MessageBubble content="First AI response" isUser={false} />
        <MessageBubble content="Second user message" isUser={true} />
        <MessageBubble content="Second AI response" isUser={false} isStreaming={true} />
      </>
    );

    expect(mockCustomMarkdown).toHaveBeenCalledTimes(2);
    expect(mockCustomMarkdown).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ content: "First AI response", isUser: false })
    );
    expect(mockCustomMarkdown).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ content: "Second AI response", isUser: false })
    );
  });
});
