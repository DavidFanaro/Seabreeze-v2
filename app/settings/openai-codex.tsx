import { useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";

import { ModelListManager } from "@/components/settings/ModelListManager";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { type SettingsStatus, SettingsStatusBanner } from "@/components/settings/SettingsStatusBanner";
import { SaveButton } from "@/components/ui/SaveButton";
import { useTheme } from "@/components/ui/ThemeProvider";
import { invalidateProvider, testProviderConnection } from "@/providers/provider-factory";
import {
  getStoredOpenAICodexCredentials,
  refreshOpenAICodexCredentials,
  saveOpenAICodexCredentials,
  signInOpenAICodexWithBrowser,
  signInOpenAICodexWithDeviceCode,
} from "@/providers/openai-codex-auth";
import { useProviderStore } from "@/stores";
import { OPENAI_CODEX_MODELS } from "@/types/provider.types";

export default function OpenAICodexSettings() {
  const { theme } = useTheme();
  const { selectedModel, setSelectedModel } = useProviderStore();
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [credentials, setCredentials] = useState(getStoredOpenAICodexCredentials());

  const handleCredentialsChanged = () => {
    setCredentials(getStoredOpenAICodexCredentials());
    invalidateProvider("openai-codex");
  };

  const signInMutation = useMutation({
    mutationFn: async () => {
      try {
        return await signInOpenAICodexWithBrowser();
      } catch {
        return signInOpenAICodexWithDeviceCode(async ({ verificationUrl, userCode }) => {
          setDeviceCode(userCode);
          Alert.alert(
            "OpenAI Codex Sign In",
            `Enter code ${userCode} in the browser window to finish signing in.`,
            [{ text: "Open Browser", onPress: () => Linking.openURL(verificationUrl) }],
          );
          await Linking.openURL(verificationUrl);
        });
      }
    },
    onSuccess: async () => {
      setDeviceCode(null);
      handleCredentialsChanged();
      const success = await testProviderConnection("openai-codex", {});
      setStatus({
        success,
        message: success ? "Signed in to OpenAI Codex." : "Signed in, but session validation failed.",
      });
    },
    onError: (error) => {
      setDeviceCode(null);
      setStatus({
        success: false,
        message: error instanceof Error ? error.message : "Could not sign in to OpenAI Codex.",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const currentCredentials = getStoredOpenAICodexCredentials();
      if (!currentCredentials) throw new Error("Sign in before refreshing the Codex session.");
      return refreshOpenAICodexCredentials(currentCredentials);
    },
    onSuccess: () => {
      handleCredentialsChanged();
      setStatus({ success: true, message: "OpenAI Codex session refreshed." });
    },
    onError: (error) => {
      setStatus({
        success: false,
        message: error instanceof Error ? error.message : "Could not refresh OpenAI Codex session.",
      });
    },
  });

  const handleSignOut = () => {
    saveOpenAICodexCredentials(null);
    handleCredentialsChanged();
    setDeviceCode(null);
    setStatus({ success: true, message: "Signed out of OpenAI Codex." });
  };

  return (
    <SettingsScreen title="OpenAI Codex" contentContainerClassName="flex-grow gap-5 pt-5">
      <View className="mx-4 gap-3 rounded-3xl p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-[17px] font-semibold" style={{ color: theme.colors.text }}>
          ChatGPT OAuth Session
        </Text>
        <Text className="text-[14px] leading-5" style={{ color: theme.colors.textSecondary }}>
          Sign in with OpenAI to use Codex models through the Responses API. Browser OAuth opens first;
          device-code sign-in appears automatically if the callback cannot complete.
        </Text>
        <View className="gap-2 rounded-2xl p-3" style={{ backgroundColor: theme.colors.background }}>
          <Text selectable className="text-[13px]" style={{ color: theme.colors.text }}>
            Status: {credentials ? "Signed in" : "Not signed in"}
          </Text>
          {credentials?.email ? (
            <Text selectable className="text-[13px]" style={{ color: theme.colors.textSecondary }}>
              Account: {credentials.email}
            </Text>
          ) : null}
          {credentials?.planType ? (
            <Text selectable className="text-[13px]" style={{ color: theme.colors.textSecondary }}>
              Plan: {credentials.planType}
            </Text>
          ) : null}
          {deviceCode ? (
            <Text selectable className="text-[15px] font-semibold" style={{ color: theme.colors.accent }}>
              Device code: {deviceCode}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mt-2">
        <ModelListManager
          providerId="openai-codex"
          predefinedModels={OPENAI_CODEX_MODELS}
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
        />
      </View>

      <View className="min-h-2 flex-1" />

      <SettingsStatusBanner status={status} />

      <View className="gap-3 px-4">
        <SaveButton
          title="Sign in with OpenAI"
          onPress={() => {
            setStatus(null);
            signInMutation.mutate();
          }}
          loading={signInMutation.isPending}
        />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <SaveButton
              title="Refresh Session"
              onPress={() => refreshMutation.mutate()}
              loading={refreshMutation.isPending}
              disabled={!credentials}
            />
          </View>
          <Pressable
            onPress={handleSignOut}
            disabled={!credentials}
            className="flex-1 items-center justify-center rounded-xl border px-4 py-3"
            style={{
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              opacity: credentials ? 1 : 0.5,
            }}
          >
            <Text className="font-semibold" style={{ color: theme.colors.error }}>
              Sign Out
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="h-2" />
    </SettingsScreen>
  );
}
