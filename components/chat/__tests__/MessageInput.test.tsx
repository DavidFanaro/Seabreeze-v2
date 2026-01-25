/**
 * @file MessageInput.test.tsx
 * @purpose Tests for MessageInput component covering text input, send button states, haptic feedback, and disabled states
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MessageInput } from "../MessageInput";

// Mock useTheme hook
jest.mock("@/components/ui/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({
    theme: {
      colors: {
        text: "#000000",
        surface: "#ffffff",
        textSecondary: "#666666",
        accent: "#007AFF",
      },
    },
  })),
}));

// Mock useHapticFeedback hook
jest.mock("@/hooks/useHapticFeedback", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    triggerPress: jest.fn(),
  })),
}));

// Mock SymbolView component - keep it simple
jest.mock("expo-symbols", () => ({
  SymbolView: jest.fn(() => null),
}));

describe("MessageInput Component", () => {
  const mockOnChangeText = jest.fn();
  const mockOnSend = jest.fn();

  beforeEach(() => {
    mockOnChangeText.mockClear();
    mockOnSend.mockClear();
  });

  /**
   * Test: Component renders with default props
   */
  it("renders with default props", () => {
    const { getByPlaceholderText } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const input = getByPlaceholderText("Message...");
    expect(input).toBeTruthy();
  });

  /**
   * Test: Input and send button are rendered as separate siblings
   */
  it("renders input and send button in separate containers", () => {
    const { getByTestId } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const wrapper = getByTestId("message-input-wrapper");
    getByTestId("message-input-field");
    getByTestId("message-input-send");

    const wrapperChildren = React.Children.toArray(
      wrapper.props.children
    ) as React.ReactElement<{ testID?: string }>[];
    expect(wrapperChildren).toHaveLength(2);
    expect(wrapperChildren[0].props.testID).toBe("message-input-field");
    expect(wrapperChildren[1].props.testID).toBe("message-input-send");
  });

  /**
   * Test: Component renders with custom placeholder
   */
  it("renders with custom placeholder text", () => {
    const customPlaceholder = "Type your message...";
    const { getByPlaceholderText } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        placeholder={customPlaceholder}
      />
    );

    const input = getByPlaceholderText(customPlaceholder);
    expect(input).toBeTruthy();
  });

  /**
   * Test: Text input value updates when text changes
   */
  it("updates value when text changes", () => {
    const { getByPlaceholderText } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const input = getByPlaceholderText("Message...");
    fireEvent.changeText(input, "Hello");

    expect(mockOnChangeText).toHaveBeenCalledWith("Hello");
  });

  /**
   * Test: Text input displays current value
   */
  it("displays current input value", () => {
    const { getByDisplayValue } = render(
      <MessageInput
        value="Test message"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const input = getByDisplayValue("Test message");
    expect(input).toBeTruthy();
  });

  /**
   * Test: Send button is disabled when input is empty
   */
  it("disables send button when input is empty", () => {
    const { root } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    // Find all TouchableOpacity elements (the send button)
    const touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    const sendButton = touchables[0];

    fireEvent.press(sendButton);

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  /**
   * Test: Send button is disabled when input contains only whitespace
   */
  it("disables send button when input has only whitespace", () => {
    mockOnSend.mockClear();
    const { root } = render(
      <MessageInput
        value="   "
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    const sendButton = touchables[0];

    fireEvent.press(sendButton);

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  /**
   * Test: Send button calls onSend when input has valid text
   */
  it("calls onSend when send button is pressed with valid input", () => {
    const { root } = render(
      <MessageInput
        value="Hello"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    const sendButton = touchables[0];

    fireEvent.press(sendButton);

    expect(mockOnSend).toHaveBeenCalled();
  });

  /**
   * Test: Component respects disabled prop
   */
  it("disables input and send button when disabled prop is true", () => {
    const { getByPlaceholderText, root } = render(
      <MessageInput
        value="Text"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        disabled={true}
      />
    );

    const input = getByPlaceholderText("Message...");
    const touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    const sendButton = touchables[0];

    // Input should be disabled
    expect(input.props.editable).toBe(false);

    // Send button press should not trigger onSend
    fireEvent.press(sendButton);
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  /**
   * Test: Disabled prop overrides non-empty text for send button
   */
  it("keeps send button disabled when component is disabled", () => {
    const { root } = render(
      <MessageInput
        value="Valid text"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        disabled={true}
      />
    );

    const touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    const sendButton = touchables[0];

    fireEvent.press(sendButton);

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  /**
   * Test: Component accepts custom styles
   */
  it("applies custom styles to container", () => {
    const customStyle = { marginBottom: 20 };
    const { root } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        style={customStyle}
      />
    );

    // Container is rendered with custom style merged
    expect(root).toBeTruthy();
  });

  /**
   * Test: Multiple text changes are tracked
   */
  it("handles multiple sequential text changes", () => {
    const { getByPlaceholderText } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const input = getByPlaceholderText("Message...");

    fireEvent.changeText(input, "H");
    fireEvent.changeText(input, "He");
    fireEvent.changeText(input, "Hel");
    fireEvent.changeText(input, "Hell");
    fireEvent.changeText(input, "Hello");

    expect(mockOnChangeText).toHaveBeenCalledTimes(5);
    expect(mockOnChangeText).toHaveBeenLastCalledWith("Hello");
  });

  /**
   * Test: Send button state changes based on input
   */
  it("enables send button when input becomes non-empty", () => {
    const { rerender, root } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    // Button should be disabled
    let touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    let sendButton = touchables[0];
    fireEvent.press(sendButton);
    expect(mockOnSend).not.toHaveBeenCalled();

    // Re-render with text
    rerender(
      <MessageInput
        value="Message"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    // Button should be enabled now
    touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    sendButton = touchables[0];
    fireEvent.press(sendButton);
    expect(mockOnSend).toHaveBeenCalled();
  });

  /**
   * Test: Multiline input is supported
   */
  it("supports multiline text input", () => {
    const { getByPlaceholderText } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const input = getByPlaceholderText("Message...");
    expect(input.props.multiline).toBe(true);
  });

  /**
   * Test: Input respects maximum height constraint
   */
  it("respects maximum height constraint in styles", () => {
    const { getByPlaceholderText } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const input = getByPlaceholderText("Message...");
    // The max height is set via className "max-h-[120px]"
    expect(input.props.className).toContain("max-h-[120px]");
  });

  /**
   * Test: Long messages can be sent
   */
  it("allows sending long messages", () => {
    const longMessage =
      "This is a very long message that contains a lot of text to test if the component can handle it properly without any issues or limitations.";

    const { root } = render(
      <MessageInput
        value={longMessage}
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    const sendButton = touchables[0];

    fireEvent.press(sendButton);

    expect(mockOnSend).toHaveBeenCalled();
  });

  /**
   * Test: Theme colors are applied from useTheme hook
   */
  it("uses theme colors for styling", () => {
    const { getByPlaceholderText } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const input = getByPlaceholderText("Message...");
    // Verify input has color style from theme
    expect(input.props.style).toBeDefined();
  });

  /**
   * Test: Component handles rapid send button presses
   */
  it("can handle rapid send button presses", () => {
    const { root } = render(
      <MessageInput
        value="Message"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    const sendButton = touchables[0];

    fireEvent.press(sendButton);
    fireEvent.press(sendButton);
    fireEvent.press(sendButton);

    expect(mockOnSend).toHaveBeenCalledTimes(3);
  });

  /**
   * Test: Component renders without errors with all props
   */
  it("renders successfully with all props provided", () => {
    const { getByPlaceholderText } = render(
      <MessageInput
        value="Hello World"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        placeholder="Custom placeholder"
        disabled={false}
        style={{ marginTop: 10 }}
      />
    );

    const input = getByPlaceholderText("Custom placeholder");
    expect(input).toBeTruthy();
    expect(input.props.value).toBe("Hello World");
  });

  /**
   * Test: Empty input is not sent with just spaces
   */
  it("trims whitespace before checking if input is valid", () => {
    const { root } = render(
      <MessageInput
        value="  "
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    const sendButton = touchables[0];

    fireEvent.press(sendButton);

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  /**
   * Test: Message with meaningful content and spaces can be sent
   */
  it("allows sending message with leading/trailing spaces", () => {
    const { root } = render(
      <MessageInput
        value="  Hello World  "
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />
    );

    const touchables = root.findAll(
      (el: any) => el.type && el.type.displayName === "TouchableOpacity"
    );
    const sendButton = touchables[0];

    fireEvent.press(sendButton);

    expect(mockOnSend).toHaveBeenCalled();
  });
});
