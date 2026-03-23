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

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: {
      View: React.forwardRef((props: any, ref: any) =>
        React.createElement(View, { ...props, ref }),
      ),
    },
    FadeIn: { duration: () => ({ springify: () => ({}) }) },
    FadeOut: { duration: () => ({}) },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: number) => v,
    Easing: { out: () => ({}), ease: {} },
  };
});

describe("MessageInput", () => {
  const mockOnChangeText = jest.fn();
  const mockOnSend = jest.fn();
  const mockOnTakePhoto = jest.fn();
  const mockOnChooseFromLibrary = jest.fn();
  const mockOnRemoveAttachment = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnLayout = jest.fn();

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
    mockOnTakePhoto.mockClear();
    mockOnChooseFromLibrary.mockClear();
    mockOnRemoveAttachment.mockClear();
    mockOnCancel.mockClear();
    mockOnLayout.mockClear();
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

  it("opens popover on plus button press and calls onTakePhoto", () => {
    const { getByTestId, queryByTestId } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        onTakePhoto={mockOnTakePhoto}
        onChooseFromLibrary={mockOnChooseFromLibrary}
      />,
    );

    // Popover is hidden initially
    expect(queryByTestId("media-menu-popover")).toBeNull();

    // Press "+" to open popover
    fireEvent.press(getByTestId("message-input-add"));
    expect(getByTestId("media-menu-popover")).toBeTruthy();

    // Press "Take Photo"
    fireEvent.press(getByTestId("media-menu-take-photo"));
    expect(mockOnTakePhoto).toHaveBeenCalledTimes(1);
  });

  it("opens popover and calls onChooseFromLibrary", () => {
    const { getByTestId } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        onTakePhoto={mockOnTakePhoto}
        onChooseFromLibrary={mockOnChooseFromLibrary}
      />,
    );

    fireEvent.press(getByTestId("message-input-add"));
    fireEvent.press(getByTestId("media-menu-choose-library"));
    expect(mockOnChooseFromLibrary).toHaveBeenCalledTimes(1);
  });

  it("toggles popover closed on second plus button press", () => {
    const { getByTestId, queryByTestId } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        onTakePhoto={mockOnTakePhoto}
      />,
    );

    // Open
    fireEvent.press(getByTestId("message-input-add"));
    expect(getByTestId("media-menu-popover")).toBeTruthy();

    // Close
    fireEvent.press(getByTestId("message-input-add"));
    expect(queryByTestId("media-menu-popover")).toBeNull();
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
        onTakePhoto={mockOnTakePhoto}
        disabled={true}
      />,
    );

    expect(getByTestId("message-input-text-input").props.editable).toBe(false);
    expect(getByTestId("message-input-add").props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(getByTestId("message-input-send"));
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it("forwards wrapper layout changes", () => {
    const { getByTestId } = render(
      <MessageInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        onLayout={mockOnLayout}
      />,
    );

    fireEvent(getByTestId("message-input-wrapper"), "layout", {
      nativeEvent: {
        layout: { x: 0, y: 0, width: 320, height: 84 },
      },
    });

    expect(mockOnLayout).toHaveBeenCalledTimes(1);
  });
});
