import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { SettingInput } from "@/components/settings/SettingInput";
import {
  type SettingsStatus,
  SettingsStatusBanner,
} from "@/components/settings/SettingsStatusBanner";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { SaveButton } from "@/components/ui/SaveButton";
import { useTheme } from "@/components/ui/ThemeProvider";
import { normalizeSearxngUrl, testSearxngConnection } from "@/lib/searxng-client";
import { useAuthStore } from "@/stores";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function SearchSettings() {
  const { theme } = useTheme();
  const searxngUrl = useAuthStore((state) => state.searxngUrl);
  const setSearxngUrl = useAuthStore((state) => state.setSearxngUrl);
  const webSearchEnabled = useSettingsStore((state) => state.webSearchEnabled);
  const setWebSearchEnabled = useSettingsStore((state) => state.setWebSearchEnabled);

  const [draftUrl, setDraftUrl] = useState(searxngUrl ?? "");
  const [draftEnabled, setDraftEnabled] = useState(webSearchEnabled);
  const [status, setStatus] = useState<SettingsStatus | null>(null);

  useEffect(() => {
    setDraftUrl(searxngUrl ?? "");
  }, [searxngUrl]);

  useEffect(() => {
    setDraftEnabled(webSearchEnabled);
  }, [webSearchEnabled]);

  const hasUrl = draftUrl.trim().length > 0;

  const helperCopy = useMemo(() => {
    if (!draftEnabled) {
      return "Search stays off across the app until you enable it here or from the chat menu.";
    }

    if (!hasUrl) {
      return "Web search is enabled app-wide, but you still need to add your SearXNG URL.";
    }

    return "Seabreeze will let supported models decide when to search the web and cite sources from your instance.";
  }, [draftEnabled, hasUrl]);

  const handleToggleEnabled = () => {
    setDraftEnabled((current) => !current);
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async (): Promise<SettingsStatus> => {
      const trimmedUrl = draftUrl.trim();
      const normalizedUrl = trimmedUrl ? normalizeSearxngUrl(trimmedUrl) : null;

      setSearxngUrl(normalizedUrl);
      setWebSearchEnabled(draftEnabled);

      return {
        success: true,
        message: normalizedUrl
          ? "Web search settings saved."
          : "Web search preference saved. Add a SearXNG URL whenever you're ready.",
      };
    },
    onSuccess: (nextStatus) => {
      setStatus(nextStatus);
    },
    onError: (error) => {
      setStatus({
        success: false,
        message: error instanceof Error ? error.message : "Could not save search settings.",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (): Promise<SettingsStatus> => {
      return testSearxngConnection(draftUrl.trim());
    },
    onSuccess: (nextStatus) => {
      setStatus(nextStatus);
    },
    onError: (error) => {
      setStatus({
        success: false,
        message: error instanceof Error ? error.message : "Could not test search connection.",
      });
    },
  });

  const handleSave = () => {
    setStatus(null);
    saveSettingsMutation.mutate();
  };

  const handleTest = () => {
    setStatus(null);
    testConnectionMutation.mutate();
  };

  return (
    <SettingsScreen
      title="Web Search"
      contentContainerClassName="flex-grow gap-5 pt-5"
      keyboardShouldPersistTaps="handled"
    >
      <View
        className="mx-4 rounded-[28px] px-4 py-4"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
        }}
      >
        <View className="flex-row items-center">
          <View
            className="mr-3 h-[44px] w-[44px] items-center justify-center rounded-2xl"
            style={{ backgroundColor: theme.colors.background }}
          >
            <SymbolView
              name="magnifyingglass.circle.fill"
              size={24}
              tintColor={draftEnabled ? theme.colors.accent : theme.colors.textSecondary}
            />
          </View>
          <View className="flex-1">
            <Text className="text-[16px] font-semibold" style={{ color: theme.colors.text }}>
              App-Wide Web Search
            </Text>
            <Text className="mt-1 text-[13px]" style={{ color: theme.colors.textSecondary }}>
              {helperCopy}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleToggleEnabled}
          className="mt-4 flex-row items-center justify-between rounded-2xl px-4 py-3"
          style={{
            backgroundColor: theme.colors.background,
            borderColor: draftEnabled ? theme.colors.accent : theme.colors.border,
            borderWidth: 1,
          }}
        >
          <View className="flex-1 pr-3">
            <Text className="text-[14px] font-semibold" style={{ color: theme.colors.text }}>
              Web search is {draftEnabled ? "on" : "off"}
            </Text>
            <Text className="mt-1 text-[12px]" style={{ color: theme.colors.textSecondary }}>
              Toggle this anytime from the chat menu.
            </Text>
          </View>
          <View
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: draftEnabled ? theme.colors.accent : theme.colors.surface,
            }}
          >
            <Text
              style={{
                color: draftEnabled ? (theme.isDark ? theme.colors.overlayForeground : theme.colors.surface) : theme.colors.textSecondary,
                fontSize: 12,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              {draftEnabled ? "Enabled" : "Disabled"}
            </Text>
          </View>
        </Pressable>
      </View>

      <SettingInput
        label="SearXNG URL"
        value={draftUrl}
        onChangeText={setDraftUrl}
        placeholder="https://search.example.com"
        autoCapitalize="none"
      />

      <View className="mx-4 rounded-2xl px-4 py-3" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
          Notes
        </Text>
        <Text className="mt-2 text-[13px] leading-[20px]" style={{ color: theme.colors.textSecondary }}>
          Use the base instance URL and make sure JSON search responses are enabled. On web, your instance also needs CORS support.
        </Text>
      </View>

      <View className="min-h-2 flex-1" />

      <SettingsStatusBanner status={status} />

      <View className="flex-row gap-2 px-4">
        <View className="flex-1">
          <SaveButton
            title="Save Settings"
            onPress={handleSave}
            loading={saveSettingsMutation.isPending}
            testID="save-search-settings"
          />
        </View>
        <View className="flex-1">
          <SaveButton
            title="Test Connection"
            onPress={handleTest}
            loading={testConnectionMutation.isPending}
            disabled={!hasUrl}
            testID="test-search-connection"
          />
        </View>
      </View>

      <View className="h-2" />
    </SettingsScreen>
  );
}
