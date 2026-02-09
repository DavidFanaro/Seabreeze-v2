import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { useTheme } from "@/components/ui/ThemeProvider";

interface RetrievalRecoveryViewProps {
  visible: boolean;
  errorMessage: string;
  onRetry: () => void;
  retryDisabled?: boolean;
}

export const RetrievalRecoveryView: React.FC<RetrievalRecoveryViewProps> = ({
  visible,
  errorMessage,
  onRetry,
  retryDisabled = false,
}) => {
  const { theme } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View className="mx-4 mt-4 rounded-xl px-4 py-4" style={{
      backgroundColor: theme.colors.error + "12",
      borderColor: theme.colors.error + "35",
      borderWidth: 1,
    }}>
      <View className="flex-row items-center gap-2">
        <SymbolView
          name="exclamationmark.triangle"
          size={18}
          tintColor={theme.colors.error}
        />
        <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
          Could not load this chat
        </Text>
      </View>

      <Text className="mt-2" style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
        {errorMessage}
      </Text>

      <TouchableOpacity
        onPress={onRetry}
        disabled={retryDisabled}
        className="mt-3 self-start rounded-md px-3 py-2"
        style={{
          backgroundColor: retryDisabled ? theme.colors.border : theme.colors.error + "25",
          opacity: retryDisabled ? 0.7 : 1,
        }}
        testID="retrieval-retry-button"
      >
        <Text style={{ color: retryDisabled ? theme.colors.textSecondary : theme.colors.error, fontWeight: "600" }}>
          {retryDisabled ? "Retrying..." : "Retry loading chat"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
