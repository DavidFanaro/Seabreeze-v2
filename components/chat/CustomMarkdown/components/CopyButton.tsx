/**
 * @file CopyButton.tsx
 * @purpose Themed copy button with iOS haptic feedback
 */

import React, { useState, useCallback } from "react";
import { TouchableOpacity, ViewStyle } from "react-native";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";
import useHapticFeedback from "@/hooks/useHapticFeedback";
import { copyToClipboard } from "../utils";

interface CopyButtonProps {
    content: string;
    size?: number;
    style?: ViewStyle;
    onCopySuccess?: () => void;
    onCopyError?: (error: string) => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
    content,
    size = 18,
    style,
    onCopySuccess,
    onCopyError,
}) => {
    const { theme } = useTheme();
    const { triggerSuccess, triggerError } = useHapticFeedback();
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        const result = await copyToClipboard(content);

        if (result.success) {
            triggerSuccess();
            setCopied(true);
            onCopySuccess?.();

            // Reset after 2 seconds
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } else {
            triggerError();
            onCopyError?.(result.error || "Copy failed");
        }
    }, [content, triggerSuccess, triggerError, onCopySuccess, onCopyError]);

    return (
        <TouchableOpacity
            onPress={handleCopy}
            activeOpacity={0.7}
            style={[
                {
                    padding: 6,
                    borderRadius: theme.borderRadius.sm,
                    backgroundColor: copied ? theme.colors.accent : "transparent",
                },
                style,
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <SymbolView
                name={copied ? "checkmark" : "doc.on.doc"}
                size={size}
                tintColor={copied ? theme.colors.surface : theme.colors.textSecondary}
                style={{ width: size, height: size }}
            />
        </TouchableOpacity>
    );
};
