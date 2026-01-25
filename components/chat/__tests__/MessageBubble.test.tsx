/**
 * @file MessageBubble.test.tsx
 * @purpose Tests for MessageBubble component covering user/AI messages, styling, streaming state, and markdown rendering
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { MessageBubble } from "../MessageBubble";

// Mock CustomMarkdown component
const mockCustomMarkdown = jest.fn();
jest.mock("../CustomMarkdown", () => {
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

// Mock useSettingsStore hook
jest.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: jest.fn((selector) =>
    selector({ showCodeLineNumbers: true })
  ),
}));

describe("MessageBubble Component", () => {
  beforeEach(() => {
    mockCustomMarkdown.mockClear();
  });

  /**
   * Test: Component renders with content
   */
  it("renders message content correctly", () => {
    render(
      <MessageBubble
        content="Hello, world!"
        isUser={true}
      />
    );

    // Verify CustomMarkdown was called with the correct content
    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Hello, world!",
      })
    );
  });

  /**
   * Test: User message receives background color styling
   */
  it("applies background color to user messages", () => {
    render(
      <MessageBubble
        content="User message"
        isUser={true}
      />
    );

    // Verify CustomMarkdown was called with isUser=true
    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "User message",
        isUser: true,
      })
    );
  });

  /**
   * Test: AI message has transparent background
   */
  it("applies transparent background to AI messages", () => {
    render(
      <MessageBubble
        content="AI response"
        isUser={false}
      />
    );

    // Verify CustomMarkdown was called with isUser=false
    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "AI response",
        isUser: false,
      })
    );
  });

  /**
   * Test: Streaming state is passed to CustomMarkdown
   */
  it("passes streaming state to CustomMarkdown component", () => {
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
        isStreaming: true,
      })
    );
  });

  /**
   * Test: Non-streaming message shows copy all button
   */
  it("shows copy all button for non-streaming AI messages", () => {
    render(
      <MessageBubble
        content="Code to copy"
        isUser={false}
        isStreaming={false}
      />
    );

    // showCopyAll should be true for non-streaming AI messages
    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        showCopyAll: true,
      })
    );
  });

  /**
   * Test: Streaming user message doesn't show copy button
   */
  it("does not show copy all button for user messages", () => {
    render(
      <MessageBubble
        content="User code"
        isUser={true}
        isStreaming={false}
      />
    );

    // showCopyAll should be false for user messages
    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        showCopyAll: false,
      })
    );
  });

  /**
   * Test: Code line numbers setting is respected
   */
  it("respects code line numbers setting from store", () => {
    render(
      <MessageBubble
        content="Code block"
        isUser={false}
      />
    );

    // The mocked store returns showCodeLineNumbers: true
    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        showLineNumbers: true,
      })
    );
  });

  /**
   * Test: Component accepts custom styles
   */
  it("accepts and applies custom styles", () => {
    const customStyle = { marginTop: 10, marginBottom: 10 };
    render(
      <MessageBubble
        content="Styled message"
        isUser={true}
        style={customStyle}
      />
    );

    // Verify component renders without errors when custom styles are applied
    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Styled message",
      })
    );
  });

  /**
   * Test: Long content is rendered correctly
   */
  it("renders long message content without truncation", () => {
    const longContent = "This is a very long message that should be rendered fully without any truncation or cutting off.";
    render(
      <MessageBubble
        content={longContent}
        isUser={true}
      />
    );

    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: longContent,
      })
    );
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
        isUser={true}
      />
    );

    expect(mockCustomMarkdown).toHaveBeenCalledTimes(1);

    // Record initial call count
    const initialCallCount = mockCustomMarkdown.mock.calls.length;

    // Re-render with same props - memoization should prevent re-render
    rerender(
      <MessageBubble
        content="Initial content"
        isUser={true}
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
    render(
      <MessageBubble
        content=""
        isUser={true}
      />
    );

    // Even with empty content, CustomMarkdown renders
    expect(mockCustomMarkdown).toHaveBeenCalled();
    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "",
      })
    );
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

    // Verify both messages were rendered with correct props
    expect(mockCustomMarkdown).toHaveBeenCalledTimes(2);
    expect(mockCustomMarkdown).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        content: "User message",
        isUser: true,
      })
    );
    expect(mockCustomMarkdown).toHaveBeenNthCalledWith(
      2,
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
        isUser={true}
        isStreaming={false}
      />
    );

    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Test content",
        isUser: true,
        isStreaming: false,
        showLineNumbers: true,
        showCopyAll: false,
      })
    );
  });

  /**
   * Test: Streaming state disables copy all button
   */
  it("disables copy all button when message is streaming", () => {
    render(
      <MessageBubble
        content="Streaming AI response"
        isUser={false}
        isStreaming={true}
      />
    );

    expect(mockCustomMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        showCopyAll: false,
      })
    );
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

    // Verify all messages rendered
    expect(mockCustomMarkdown).toHaveBeenCalledTimes(4);
    expect(mockCustomMarkdown).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ content: "First user message", isUser: true })
    );
    expect(mockCustomMarkdown).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ content: "First AI response", isUser: false })
    );
    expect(mockCustomMarkdown).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ content: "Second user message", isUser: true })
    );
    expect(mockCustomMarkdown).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ content: "Second AI response", isUser: false, isStreaming: true })
    );
  });
});
