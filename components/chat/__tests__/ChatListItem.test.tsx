/**
 * @file ChatListItem.test.tsx
 * @purpose Tests for ChatListItem component covering rendering, interactions, and timestamp formatting
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ChatListItem } from "../ChatListItem";

// Mock expo-router
jest.mock("expo-router", () => ({
    useRouter: jest.fn(),
}));

jest.mock("react-native-gesture-handler", () => {
    const ReactNative = jest.requireActual("react-native");

    return {
        Pressable: ReactNative.Pressable,
        GestureHandlerRootView: ({ children }: any) => children,
    };
});

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    NotificationFeedbackType: { Error: "Error" },
    ImpactFeedbackStyle: { Medium: "Medium" },
}));

// Mock expo-symbols
jest.mock("expo-symbols", () => ({
    SymbolView: () => null,
}));

jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
    const React = jest.requireActual("react");
    const ReactNative = jest.requireActual("react-native");

    const MockSwipeable = React.forwardRef(({ children, ...props }: any, _ref: any) => {
        return <ReactNative.View {...props}>{children}</ReactNative.View>;
    });

    MockSwipeable.displayName = "MockSwipeable";

    return {
        __esModule: true,
        default: MockSwipeable,
    };
});

// Mock useTheme hook
jest.mock("@/components/ui/ThemeProvider", () => ({
    useTheme: jest.fn(() => ({
        theme: {
            colors: {
                text: "#000000",
                textSecondary: "#666666",
                border: "#cccccc",
                glass: "#f5f5f5",
                error: "#ff0000",
                surface: "#ffffff",
            },
        },
    })),
}));

describe("ChatListItem Component", () => {
    const mockOnDelete = jest.fn();
    const mockRouter = { push: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    /**
     * Test: Component renders with title and preview
     */
    it("renders chat title and preview correctly", () => {
        render(
            <ChatListItem
                id={1}
                title="Test Chat"
                preview="Last message"
                timestamp={new Date()}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        expect(screen.getByText("Test Chat")).toBeTruthy();
        expect(screen.getByText("Last message")).toBeTruthy();
    });

    /**
     * Test: Default title when null
     */
    it("displays 'Untitled chat' when title is null", () => {
        render(
            <ChatListItem
                id={1}
                title={null}
                preview="Test preview"
                timestamp={new Date()}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        expect(screen.getByText("Untitled chat")).toBeTruthy();
    });

    /**
     * Test: Default preview when empty
     */
    it("displays 'No messages yet' when preview is null", () => {
        render(
            <ChatListItem
                id={1}
                title="Test Chat"
                preview={null}
                timestamp={new Date()}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        expect(screen.getByText("No messages yet")).toBeTruthy();
    });

    /**
     * Test: Navigation on tap
     */
    it("navigates to chat detail on press", () => {
        render(
            <ChatListItem
                id={42}
                title="Test Chat"
                preview="Test preview"
                timestamp={new Date()}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        const titleElement = screen.getByText("Test Chat");
        fireEvent.press(titleElement);

        expect(mockRouter.push).toHaveBeenCalledWith("/chat/42");
    });

    it("does not navigate while swipe interaction is active", () => {
        render(
            <ChatListItem
                id={42}
                title="Test Chat"
                preview="Test preview"
                timestamp={new Date()}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        const swipeable = screen.getByTestId("chat-list-item-swipeable-42");
        const chatItem = screen.getByTestId("chat-list-item-42");

        fireEvent(swipeable, "onSwipeableOpenStartDrag", "left");
        fireEvent.press(chatItem);

        expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("navigates when delete action is visible", () => {
        render(
            <ChatListItem
                id={42}
                title="Test Chat"
                preview="Test preview"
                timestamp={new Date()}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        const swipeable = screen.getByTestId("chat-list-item-swipeable-42");
        const chatItem = screen.getByTestId("chat-list-item-42");

        fireEvent(swipeable, "onSwipeableOpen", "left");
        fireEvent.press(chatItem);

        expect(mockRouter.push).toHaveBeenCalledWith("/chat/42");
        expect(mockRouter.push).toHaveBeenCalledTimes(1);
    });

    /**
     * Test: Haptic feedback on press
     */
    it("triggers haptic feedback on press", () => {
        const { getByText } = render(
            <ChatListItem
                id={1}
                title="Test Chat"
                preview="Test preview"
                timestamp={new Date()}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        const titleElement = getByText("Test Chat");
        fireEvent(titleElement.parent, "pressIn");

        expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    /**
     * Test: Timestamp formatting for recent times
     */
    it("formats recent timestamps correctly", () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const { getByText } = render(
            <ChatListItem
                id={1}
                title="Test Chat"
                preview="Test preview"
                timestamp={fiveMinutesAgo}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        // Should display relative time format
        expect(getByText(/m ago/)).toBeTruthy();
    });

    /**
     * Test: "Just now" for very recent timestamps
     */
    it("displays 'Just now' for timestamps within one minute", () => {
        const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
        const { getByText } = render(
            <ChatListItem
                id={1}
                title="Test Chat"
                preview="Test preview"
                timestamp={tenSecondsAgo}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        expect(getByText("Just now")).toBeTruthy();
    });

    /**
     * Test: Handles missing timestamp
     */
    it("renders without timestamp when null", () => {
        const { getByText } = render(
            <ChatListItem
                id={1}
                title="Test Chat"
                preview="Test preview"
                timestamp={null}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        expect(getByText("Test Chat")).toBeTruthy();
    });

    /**
     * Test: Renders multiple items
     */
    it("can render multiple chat items", () => {
        const { getByText } = render(
            <>
                <ChatListItem
                    id={1}
                    title="Chat One"
                    preview="Preview one"
                    timestamp={new Date()}
                    onDelete={mockOnDelete}
                    isScreenFocused={true}
                />
                <ChatListItem
                    id={2}
                    title="Chat Two"
                    preview="Preview two"
                    timestamp={new Date()}
                    onDelete={mockOnDelete}
                    isScreenFocused={true}
                />
            </>
        );

        expect(getByText("Chat One")).toBeTruthy();
        expect(getByText("Chat Two")).toBeTruthy();
    });

    /**
     * Test: Empty string preview
     */
    it("displays 'No messages yet' when preview is empty string", () => {
        const { getByText } = render(
            <ChatListItem
                id={1}
                title="Test Chat"
                preview=""
                timestamp={new Date()}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        expect(getByText("No messages yet")).toBeTruthy();
    });

    /**
     * Test: Hours ago formatting
     */
    it("formats timestamp correctly for hours ago", () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const { getByText } = render(
            <ChatListItem
                id={1}
                title="Test Chat"
                preview="Test preview"
                timestamp={twoHoursAgo}
                onDelete={mockOnDelete}
                isScreenFocused={true}
            />
        );

        expect(getByText(/h ago/)).toBeTruthy();
    });
});
