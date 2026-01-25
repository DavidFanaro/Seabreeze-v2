/**
 * @file useHapticFeedback.test.ts
 * @purpose Test suite for haptic feedback functionality
 */

import { renderHook } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, jest, it } from "@jest/globals";
import * as Haptics from "expo-haptics";
import useHapticFeedback from "../useHapticFeedback";

type HapticType = "light" | "medium" | "heavy" | "success" | "error" | "warning";

// Mock expo-haptics module
jest.mock("expo-haptics", () => ({
    ImpactFeedbackStyle: {
        Light: "Light",
        Medium: "Medium",
        Heavy: "Heavy",
    },
    NotificationFeedbackType: {
        Success: "Success",
        Error: "Error",
        Warning: "Warning",
    },
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
}));

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

describe("useHapticFeedback", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ============================================================================
    // HOOK INITIALIZATION TESTS
    // ============================================================================

    describe("Hook Initialization", () => {
        it("should return all required methods", () => {
            const { result } = renderHook(() => useHapticFeedback());

            expect(typeof result.current.triggerPress).toBe("function");
            expect(typeof result.current.triggerSuccess).toBe("function");
            expect(typeof result.current.triggerError).toBe("function");
            expect(typeof result.current.triggerWarning).toBe("function");
            expect(typeof result.current.trigger).toBe("function");
        });

        it("should maintain the same API structure across renders", () => {
            const { result, rerender } = renderHook(() => useHapticFeedback());

            const initialKeys = Object.keys(result.current);
            rerender(() => useHapticFeedback());

            const currentKeys = Object.keys(result.current);
            expect(currentKeys).toEqual(initialKeys);
            expect(currentKeys).toContain("triggerPress");
            expect(currentKeys).toContain("triggerSuccess");
            expect(currentKeys).toContain("triggerError");
            expect(currentKeys).toContain("triggerWarning");
            expect(currentKeys).toContain("trigger");
        });
    });

    // ============================================================================
    // IMPACT FEEDBACK TESTS
    // ============================================================================

    describe("triggerPress", () => {
        it("should trigger medium impact by default", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerPress();

            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
            expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
        });

        it("should trigger light impact when specified", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerPress("light");

            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
            expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
        });

        it("should trigger heavy impact when specified", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerPress("heavy");

            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
            expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
        });

        it("should not call notification methods for impact feedback", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerPress("light");

            expect(Haptics.notificationAsync).not.toHaveBeenCalled();
        });

        it("should handle multiple calls to triggerPress", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerPress("light");
            result.current.triggerPress("medium");
            result.current.triggerPress("heavy");

            expect(Haptics.impactAsync).toHaveBeenCalledTimes(3);
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
        });
    });

    // ============================================================================
    // NOTIFICATION FEEDBACK TESTS
    // ============================================================================

    describe("triggerSuccess", () => {
        it("should trigger success notification feedback", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerSuccess();

            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
            expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });

        it("should handle multiple success calls", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerSuccess();
            result.current.triggerSuccess();

            expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
        });
    });

    describe("triggerError", () => {
        it("should trigger error notification feedback", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerError();

            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
            expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });

        it("should handle multiple error calls", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerError();
            result.current.triggerError();

            expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
        });
    });

    describe("triggerWarning", () => {
        it("should trigger warning notification feedback", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerWarning();

            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
            expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });

        it("should handle multiple warning calls", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerWarning();
            result.current.triggerWarning();

            expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
        });
    });

    // ============================================================================
    // GENERIC TRIGGER TESTS
    // ============================================================================

    describe("trigger", () => {
        it("should handle light impact type", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.trigger("light");

            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
            expect(Haptics.notificationAsync).not.toHaveBeenCalled();
        });

        it("should handle medium impact type", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.trigger("medium");

            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
            expect(Haptics.notificationAsync).not.toHaveBeenCalled();
        });

        it("should handle heavy impact type", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.trigger("heavy");

            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
            expect(Haptics.notificationAsync).not.toHaveBeenCalled();
        });

        it("should handle success notification type", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.trigger("success");

            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });

        it("should handle error notification type", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.trigger("error");

            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });

        it("should handle warning notification type", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.trigger("warning");

            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });

        it("should handle all haptic types in sequence", () => {
            const { result } = renderHook(() => useHapticFeedback());
            const hapticTypes: HapticType[] = ["light", "medium", "heavy", "success", "error", "warning"];

            hapticTypes.forEach((type) => {
                result.current.trigger(type);
            });

            expect(Haptics.impactAsync).toHaveBeenCalledTimes(3);
            expect(Haptics.notificationAsync).toHaveBeenCalledTimes(3);

            // Verify impact calls
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);

            // Verify notification calls
            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
        });
    });

    // ============================================================================
    // INTEGRATION TESTS
    // ============================================================================

    describe("Integration Tests", () => {
        it("should work correctly when methods are called in various combinations", () => {
            const { result } = renderHook(() => useHapticFeedback());

            // Mix different types of calls
            result.current.triggerPress("light");
            result.current.triggerSuccess();
            result.current.trigger("error");
            result.current.triggerWarning();
            result.current.trigger("medium");
            result.current.triggerError();

            expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
            expect(Haptics.notificationAsync).toHaveBeenCalledTimes(4);

            // Verify the sequence
            expect(Haptics.impactAsync).toHaveBeenNthCalledWith(1, Haptics.ImpactFeedbackStyle.Light);
            expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(1, Haptics.NotificationFeedbackType.Success);
            expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(2, Haptics.NotificationFeedbackType.Error);
            expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(3, Haptics.NotificationFeedbackType.Warning);
            expect(Haptics.impactAsync).toHaveBeenNthCalledWith(2, Haptics.ImpactFeedbackStyle.Medium);
            expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(4, Haptics.NotificationFeedbackType.Error);
        });

        it("should handle rapid successive calls without errors", () => {
            const { result } = renderHook(() => useHapticFeedback());

            // Rapid succession calls (simulating user interactions)
            for (let i = 0; i < 10; i++) {
                result.current.triggerPress();
            }

            expect(Haptics.impactAsync).toHaveBeenCalledTimes(10);
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
        });

        it("should maintain separation between different hook instances", () => {
            const { result: result1 } = renderHook(() => useHapticFeedback());
            const { result: result2 } = renderHook(() => useHapticFeedback());

            result1.current.triggerPress("light");
            result2.current.triggerSuccess();

            expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
            expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
        });
    });

    // ============================================================================
    // EDGE CASES AND ERROR HANDLING
    // ============================================================================

    describe("Edge Cases", () => {
        it("should handle default parameter correctly for triggerPress", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.triggerPress(); // No parameter

            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
        });

        it("should handle multiple different haptic types in sequence", () => {
            const { result } = renderHook(() => useHapticFeedback());

            result.current.trigger("light");
            result.current.trigger("success");
            result.current.trigger("error");

            expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
            expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
        });
    });
});