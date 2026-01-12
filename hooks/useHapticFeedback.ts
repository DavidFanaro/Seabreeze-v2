import * as Haptics from "expo-haptics";

type HapticType = "light" | "medium" | "heavy" | "success" | "error" | "warning";

interface UseHapticFeedbackReturn {
    triggerPress: (strength?: "light" | "medium" | "heavy") => void;
    triggerSuccess: () => void;
    triggerError: () => void;
    triggerWarning: () => void;
    trigger: (type: HapticType) => void;
}

export default function useHapticFeedback(): UseHapticFeedbackReturn {
    const triggerPress = (strength: "light" | "medium" | "heavy" = "medium") => {
        const style = Haptics.ImpactFeedbackStyle[strength.charAt(0).toUpperCase() + strength.slice(1) as "Light" | "Medium" | "Heavy"];
        Haptics.impactAsync(style);
    };

    const triggerSuccess = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const triggerError = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };

    const triggerWarning = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    const trigger = (type: HapticType) => {
        switch (type) {
            case "light":
            case "medium":
            case "heavy":
                triggerPress(type);
                break;
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

    return {
        triggerPress,
        triggerSuccess,
        triggerError,
        triggerWarning,
        trigger,
    };
}