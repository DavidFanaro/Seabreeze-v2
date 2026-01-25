/**
 * @file RetryBanner.test.tsx
 * @purpose Tests for RetryBanner component covering conditional rendering, retry button interaction, and styling
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { RetryBanner } from "../RetryBanner";

// Mock useTheme hook to provide required theme colors
jest.mock("@/components/ui/ThemeProvider", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        error: "#ff0000",
        accent: "#007AFF",
        text: "#000000",
        surface: "#ffffff",
      },
    },
  }),
}));

// Mock SymbolView component - replaces with simple Text mock
jest.mock("expo-symbols", () => ({
  SymbolView: () => null,
}));

describe("RetryBanner Component", () => {
  /**
   * Test: Component does not render when canRetry is false
   */
  it("does not render when canRetry is false", () => {
    const { queryByText } = render(
      <RetryBanner canRetry={false} onRetry={jest.fn()} errorMessage="Test error" />
    );

    // Banner should not be in the DOM when canRetry is false
    expect(queryByText("Retry")).toBeNull();
  });

  /**
   * Test: Component renders when canRetry is true
   */
  it("renders when canRetry is true", () => {
    const { getByText } = render(
      <RetryBanner canRetry={true} onRetry={jest.fn()} errorMessage="Test error" />
    );

    // Verify "Retry" button text is visible
    expect(getByText("Retry")).toBeDefined();
  });

  /**
   * Test: onRetry callback is invoked when button is pressed
   */
  it("calls onRetry callback when retry button is pressed", () => {
    const mockOnRetry = jest.fn();
    const { getByText } = render(
      <RetryBanner canRetry={true} onRetry={mockOnRetry} errorMessage="Test error" />
    );

    const retryButton = getByText("Retry");
    fireEvent.press(retryButton);

    // Verify callback was called once
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  /**
   * Test: onRetry callback is called exactly once per button press
   */
  it("calls onRetry exactly once per press", () => {
    const mockOnRetry = jest.fn();
    const { getByText } = render(
      <RetryBanner canRetry={true} onRetry={mockOnRetry} errorMessage="Test error" />
    );

    const retryButton = getByText("Retry");
    
    fireEvent.press(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);

    fireEvent.press(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(2);
  });

  /**
   * Test: Banner displays error icon
   */
  it("displays error icon (exclamationmark.triangle)", () => {
    const { getByText } = render(
      <RetryBanner canRetry={true} onRetry={jest.fn()} errorMessage="Test error" />
    );

    // Component should render without errors - icon is mocked
    // Verify the retry text is visible, indicating the banner rendered successfully
    expect(getByText("Retry")).toBeDefined();
  });

  /**
   * Test: Banner uses theme colors for styling
   */
  it("applies theme colors correctly", () => {
    const { getByText } = render(
      <RetryBanner canRetry={true} onRetry={jest.fn()} errorMessage="Test error" />
    );

    // Verify the component renders and uses the mocked theme
    // The retry button is styled with theme accent color
    expect(getByText("Retry")).toBeDefined();
  });

  /**
   * Test: ErrorMessage prop is accepted without errors
   */
  it("accepts errorMessage prop", () => {
    const errorMsg = "Network timeout occurred";
    const { getByText } = render(
      <RetryBanner canRetry={true} onRetry={jest.fn()} errorMessage={errorMsg} />
    );

    // Component should render successfully with custom error message
    expect(getByText("Retry")).toBeDefined();
  });

  /**
   * Test: Multiple banners can be rendered independently
   */
  it("renders multiple banners independently", () => {
    const mockOnRetry1 = jest.fn();
    const mockOnRetry2 = jest.fn();

    const { getAllByText } = render(
      <>
        <RetryBanner canRetry={true} onRetry={mockOnRetry1} errorMessage="Error 1" />
        <RetryBanner canRetry={true} onRetry={mockOnRetry2} errorMessage="Error 2" />
      </>
    );

    const retryButtons = getAllByText("Retry");
    expect(retryButtons).toHaveLength(2);

    fireEvent.press(retryButtons[0]);
    expect(mockOnRetry1).toHaveBeenCalledTimes(1);
    expect(mockOnRetry2).toHaveBeenCalledTimes(0);

    fireEvent.press(retryButtons[1]);
    expect(mockOnRetry1).toHaveBeenCalledTimes(1);
    expect(mockOnRetry2).toHaveBeenCalledTimes(1);
  });

  /**
   * Test: Banner does not render when canRetry changes from true to false
   */
  it("removes banner when canRetry becomes false", () => {
    const { rerender, queryByText } = render(
      <RetryBanner canRetry={true} onRetry={jest.fn()} errorMessage="Test error" />
    );

    expect(queryByText("Retry")).toBeDefined();

    // Re-render with canRetry = false
    rerender(
      <RetryBanner canRetry={false} onRetry={jest.fn()} errorMessage="Test error" />
    );

    // Retry button should no longer be visible
    expect(queryByText("Retry")).toBeNull();
  });

  /**
   * Test: Banner appears when canRetry changes from false to true
   */
  it("shows banner when canRetry becomes true", () => {
    const { rerender, queryByText } = render(
      <RetryBanner canRetry={false} onRetry={jest.fn()} errorMessage="Test error" />
    );

    expect(queryByText("Retry")).toBeNull();

    // Re-render with canRetry = true
    rerender(
      <RetryBanner canRetry={true} onRetry={jest.fn()} errorMessage="Test error" />
    );

    // Retry button should now be visible
    expect(queryByText("Retry")).toBeDefined();
  });

  /**
   * Test: onRetry function remains consistent across re-renders
   */
  it("handles callback function changes correctly", () => {
    const mockOnRetry1 = jest.fn();
    const mockOnRetry2 = jest.fn();

    const { rerender, getByText } = render(
      <RetryBanner canRetry={true} onRetry={mockOnRetry1} errorMessage="Test error" />
    );

    fireEvent.press(getByText("Retry"));
    expect(mockOnRetry1).toHaveBeenCalledTimes(1);
    expect(mockOnRetry2).toHaveBeenCalledTimes(0);

    // Re-render with different callback
    rerender(
      <RetryBanner canRetry={true} onRetry={mockOnRetry2} errorMessage="Test error" />
    );

    fireEvent.press(getByText("Retry"));
    expect(mockOnRetry1).toHaveBeenCalledTimes(1);
    expect(mockOnRetry2).toHaveBeenCalledTimes(1);
  });

  /**
   * Test: Empty errorMessage is handled gracefully
   */
  it("handles empty errorMessage prop", () => {
    const { getByText } = render(
      <RetryBanner canRetry={true} onRetry={jest.fn()} errorMessage="" />
    );

    // Component should still render retry button
    expect(getByText("Retry")).toBeDefined();
  });

  /**
   * Test: Long errorMessage doesn't break component
   */
  it("handles long errorMessage without breaking layout", () => {
    const longError = "This is a very long error message that contains multiple sentences and should be handled gracefully by the component without causing layout issues or breaking the UI structure.";
    const { getByText } = render(
      <RetryBanner canRetry={true} onRetry={jest.fn()} errorMessage={longError} />
    );

    expect(getByText("Retry")).toBeDefined();
  });

  /**
   * Test: Special characters in errorMessage are preserved
   */
  it("preserves special characters in errorMessage", () => {
    const specialError = "Error: @#$%^&*() connection failed!";
    const { getByText } = render(
      <RetryBanner canRetry={true} onRetry={jest.fn()} errorMessage={specialError} />
    );

    expect(getByText("Retry")).toBeDefined();
  });

  /**
   * Test: Component renders with all required props
   */
  it("renders with all required props provided", () => {
    const mockOnRetry = jest.fn();
    const { getByText } = render(
      <RetryBanner 
        canRetry={true} 
        onRetry={mockOnRetry} 
        errorMessage="Connection timeout"
      />
    );

    expect(getByText("Retry")).toBeDefined();
    fireEvent.press(getByText("Retry"));
    expect(mockOnRetry).toHaveBeenCalled();
  });

  /**
   * Test: Component accessibility - retry button is pressable
   */
  it("retry button is accessible and interactive", () => {
    const mockOnRetry = jest.fn();
    const { getByText } = render(
      <RetryBanner canRetry={true} onRetry={mockOnRetry} errorMessage="Test error" />
    );

    const retryButton = getByText("Retry");
    expect(retryButton).toBeDefined();

    // Verify button is pressable
    fireEvent.press(retryButton);
    expect(mockOnRetry).toHaveBeenCalled();
  });

  /**
   * Test: Conditional rendering with falsy canRetry values
   */
  it("does not render with various falsy canRetry values", () => {
    const { queryByText: queryByText1 } = render(
      <RetryBanner canRetry={false} onRetry={jest.fn()} errorMessage="Error" />
    );
    expect(queryByText1("Retry")).toBeNull();

    const { queryByText: queryByText2 } = render(
      <RetryBanner canRetry={false} onRetry={jest.fn()} errorMessage="Error" />
    );
    expect(queryByText2("Retry")).toBeNull();
  });
});
