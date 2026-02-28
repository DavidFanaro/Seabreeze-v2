import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { MessageInput } from "../MessageInput";
import type { ChatAttachment } from "@/types/chat.types";

jest.mock("@/components/ui/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({
    theme: {
      colors: {
        text: "#000000",
        surface: "#ffffff",
        textSecondary: "#666666",
        accent: "#007AFF",
        border: "#cccccc",
      },
    },
  })),
}));

jest.mock("@/hooks/useHapticFeedback", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    triggerPress: jest.fn(),
  })),
}));

jest.mock("expo-symbols", () => ({
  SymbolView: jest.fn(() => null),
}));

describe("MessageInput", () => {
  const mockOnChangeText = jest.fn();
  const mockOnSend = jest.fn();
  const mockOnAddAttachment = jest.fn();
  const mockOnRemoveAttachment = jest.fn();
  const mockOnCancel = jest.fn();

  const attachments: ChatAttachment[] = [
    {
      id: "attachment-1",
      uri: "file:///image.jpg",
      kind: "image",
      mediaType: "image/jpeg",
      fileName: "image.jpg",
    },
  ];

  beforeEach(() => {
    mockOnChangeText.mockClear();
    mockOnSend.mockClear();
    mockOnAddAttachment.mockClear();
    mockOnRemoveAttachment.mockClear();
    mockOnCancel.mockClear();
  });

  it("renders input, add button, and send button", () => {
    const { getByTestId, getByPlaceholderText } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />,
    );

    expect(getByPlaceholderText("Message...")).toBeTruthy();
    expect(getByTestId("message-input-add")).toBeTruthy();
    expect(getByTestId("message-input-field")).toBeTruthy();
    expect(getByTestId("message-input-send")).toBeTruthy();
  });

  it("does not send when input and attachments are empty", () => {
    const { getByTestId } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />,
    );

    fireEvent.press(getByTestId("message-input-send"));
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it("sends payload object when pressing send with text", () => {
    const { getByTestId } = render(
      <MessageInput
        value="Hello"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />,
    );

    fireEvent.press(getByTestId("message-input-send"));

    expect(mockOnSend).toHaveBeenCalledWith({
      text: "Hello",
      attachments: [],
    });
  });

  it("allows sending when only attachments are present", () => {
    const { getByTestId } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        attachments={attachments}
      />,
    );

    fireEvent.press(getByTestId("message-input-send"));

    expect(mockOnSend).toHaveBeenCalledWith({
      text: "",
      attachments,
    });
  });

  it("sends submitted text string when no attachments are present", () => {
    const { getByTestId } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
      />,
    );

    fireEvent(getByTestId("message-input-text-input"), "submitEditing", {
      nativeEvent: { text: "Submitted" },
    });

    expect(mockOnSend).toHaveBeenCalledWith("Submitted");
  });

  it("calls onAddAttachment from plus button", () => {
    const { getByTestId } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        onAddAttachment={mockOnAddAttachment}
      />,
    );

    fireEvent.press(getByTestId("message-input-add"));
    expect(mockOnAddAttachment).toHaveBeenCalledTimes(1);
  });

  it("renders attachment chips and removes an attachment", () => {
    const { getByTestId, getByText } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        attachments={attachments}
        onRemoveAttachment={mockOnRemoveAttachment}
      />,
    );

    expect(getByTestId("message-input-attachments")).toBeTruthy();
    expect(getByText("image.jpg")).toBeTruthy();

    fireEvent.press(getByTestId("message-input-remove-attachment-attachment-1"));
    expect(mockOnRemoveAttachment).toHaveBeenCalledWith("attachment-1");
  });

  it("renders stop button while streaming and calls cancel", () => {
    const { getByTestId, queryByTestId } = render(
      <MessageInput
        value="hello"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        isStreaming={true}
        onCancel={mockOnCancel}
      />,
    );

    expect(getByTestId("message-input-stop")).toBeTruthy();
    expect(queryByTestId("message-input-send")).toBeNull();

    fireEvent.press(getByTestId("message-input-stop"));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("disables controls when disabled is true", () => {
    const { getByTestId } = render(
      <MessageInput
        value="Text"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        onAddAttachment={mockOnAddAttachment}
        disabled={true}
      />,
    );

    expect(getByTestId("message-input-text-input").props.editable).toBe(false);
    expect(getByTestId("message-input-add").props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(getByTestId("message-input-send"));
    expect(mockOnSend).not.toHaveBeenCalled();
  });
});
