/**
 * @file app/settings/opencode.tsx
 * @purpose Opencode provider configuration — API key, model selection, connection test.
 */

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import type { SettingsStatus } from "@/components/settings/SettingsStatusBanner";
import { ProviderSettingsScreen } from "@/components/settings/ProviderSettingsScreen";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";
import { OPENCODE_MODELS } from "@/types/provider.types";

export default function OpencodeSettings() {
  const { selectedModel, setSelectedModel } = useProviderStore();
  const { opencodeApiKey, setOpencodeApiKey } = useAuthStore();

  const [apiKey, setApiKeyState] = useState(opencodeApiKey || "");
  const [status, setStatus] = useState<SettingsStatus | null>(null);

  useEffect(() => {
    setApiKeyState(opencodeApiKey || "");
  }, [opencodeApiKey]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (): Promise<SettingsStatus | null> => {
      setOpencodeApiKey(apiKey || null);

      if (!apiKey) {
        return null;
      }

      const success = await testProviderConnection("opencode", { apiKey });
      return {
        success,
        message: success ? "Connected successfully!" : "Connection failed. Check your API key.",
      };
    },
    onSuccess: (nextStatus) => {
      setStatus(nextStatus);
    },
    onError: (error) => {
      setStatus({
        success: false,
        message: error instanceof Error ? error.message : "Could not save Opencode settings.",
      });
    },
  });

  const handleSave = () => {
    setStatus(null);
    saveSettingsMutation.mutate();
  };

  return (
    <ProviderSettingsScreen
      title="Opencode"
      providerId="opencode"
      inputLabel="API Key"
      inputValue={apiKey}
      onChangeText={setApiKeyState}
      inputPlaceholder="opencode..."
      inputSecureTextEntry
      predefinedModels={OPENCODE_MODELS}
      selectedModel={selectedModel}
      onModelSelect={setSelectedModel}
      status={status}
      actions={[
        {
          title: "Save Settings",
          onPress: handleSave,
          loading: saveSettingsMutation.isPending,
        },
      ]}
    />
  );
}
