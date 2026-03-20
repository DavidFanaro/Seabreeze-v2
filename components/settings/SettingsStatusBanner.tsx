import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { useTheme } from "@/components/ui/ThemeProvider";

export interface SettingsStatus {
  success: boolean;
  message: string;
}

interface SettingsStatusBannerProps {
  status: SettingsStatus | null;
}

export function SettingsStatusBanner({ status }: SettingsStatusBannerProps) {
  const { theme } = useTheme();

  if (!status) {
    return null;
  }

  const statusColor = status.success ? theme.colors.accent : theme.colors.error;

  return (
    <View
      className="mx-4 flex-row items-center rounded-xl p-3"
      style={{ backgroundColor: theme.colors.surface }}
    >
      <SymbolView
        name={status.success ? "checkmark.circle" : "xmark.circle"}
        size={20}
        tintColor={statusColor}
      />
      <Text className="ml-2 flex-1 text-[14px]" style={{ color: statusColor }}>
        {status.message}
      </Text>
    </View>
  );
}
