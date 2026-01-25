/**
 * @file useHapticFeedback.ts
 * @purpose React hook providing convenient access to device haptic feedback for enhanced user experience
 * 
 * This hook wraps expo-haptics to provide a simple, unified interface for different types of
 * haptic feedback commonly used in mobile applications. It supports both impact feedback
 * (for physical interactions like button presses) and notification feedback (for system events).
 * 
 * Haptic feedback types:
 * - Impact feedback: light, medium, heavy (physical button interactions)
 * - Notification feedback: success, error, warning (system status updates)
 */

import * as Haptics from "expo-haptics";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Union type defining all supported haptic feedback types
 * - Impact types: For physical interactions (button presses, taps, etc.)
 * - Notification types: For system events and status updates
 */
type HapticType = "light" | "medium" | "heavy" | "success" | "error" | "warning";

/**
 * Return interface for the useHapticFeedback hook
 * Provides specific methods for each haptic type plus a generic trigger method
 */
interface UseHapticFeedbackReturn {
    /** Triggers impact haptic with specified strength (defaults to medium) */
    triggerPress: (strength?: "light" | "medium" | "heavy") => void;
    /** Triggers success notification haptic for completed operations */
    triggerSuccess: () => void;
    /** Triggers error notification haptic for failed operations */
    triggerError: () => void;
    /** Triggers warning notification haptic for caution states */
    triggerWarning: () => void;
    /** Generic trigger method that accepts any haptic type */
    trigger: (type: HapticType) => void;
}

// ============================================================================
// MAIN HOOK IMPLEMENTATION
// ============================================================================

/**
 * React hook that provides haptic feedback functionality
 * 
 * This hook offers a clean API for triggering different types of haptic feedback
 * on supported devices. It abstracts away the expo-haptics implementation details
 * and provides semantic method names that clearly indicate their purpose.
 * 
 * Usage examples:
 * - triggerPress(): Medium impact for button presses
 * - triggerPress('light'): Light impact for subtle interactions
 * - triggerSuccess(): Success notification for completed actions
 * - trigger('error'): Generic trigger for error feedback
 * 
 * @returns {UseHapticFeedbackReturn} Object containing haptic trigger methods
 */
export default function useHapticFeedback(): UseHapticFeedbackReturn {
    // ============================================================================
    // IMPACT FEEDBACK METHODS
    // ============================================================================
    
    /**
     * Triggers impact haptic feedback for physical interactions
     * 
     * Impact feedback simulates physical button presses and is ideal for:
     * - Button taps
     * - Switch toggles
     * - Picker selections
     * - Any tactile UI interaction
     * 
     * @param strength - The intensity of the haptic feedback
     * @default "medium" - Balanced intensity suitable for most interactions
     */
    const triggerPress = (strength: "light" | "medium" | "heavy" = "medium") => {
        // Convert lowercase strength to PascalCase for expo-haptics enum
        const style = Haptics.ImpactFeedbackStyle[strength.charAt(0).toUpperCase() + strength.slice(1) as "Light" | "Medium" | "Heavy"];
        Haptics.impactAsync(style);
    };

    // ============================================================================
    // NOTIFICATION FEEDBACK METHODS
    // ============================================================================

    /**
     * Triggers success notification haptic feedback
     * 
     * Success feedback indicates a completed operation and is ideal for:
     * - Form submissions
     * - File uploads
     * - Successful authentication
     * - Task completion
     */
    const triggerSuccess = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    /**
     * Triggers error notification haptic feedback
     * 
     * Error feedback indicates a failed operation and is ideal for:
     * - Form validation errors
     * - Network request failures
     * - Authentication failures
     * - Invalid operations
     */
    const triggerError = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };

    /**
     * Triggers warning notification haptic feedback
     * 
     * Warning feedback indicates a caution state and is ideal for:
     * - Data loss warnings
     * - Confirmation dialogs
     * - Irreversible actions
     * - Potential issues
     */
    const triggerWarning = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    // ============================================================================
    // GENERIC TRIGGER METHOD
    // ============================================================================

    /**
     * Generic trigger method that accepts any haptic type
     * 
     * This method provides a unified interface for all haptic types,
     * useful when the haptic type is determined dynamically or stored
     * as a variable.
     * 
     * @param type - The haptic feedback type to trigger
     */
    const trigger = (type: HapticType) => {
        switch (type) {
            // Impact types - delegate to triggerPress
            case "light":
            case "medium":
            case "heavy":
                triggerPress(type);
                break;
            // Notification types - delegate to specific methods
            case "success":
                triggerSuccess();
                break;
            case "error":
                triggerError();
                break;
            case "warning":
                triggerWarning();
                break;
        }
    };

    // ============================================================================
    // RETURN API
    // ============================================================================

    return {
        triggerPress,
        triggerSuccess,
        triggerError,
        triggerWarning,
        trigger,
    };
}