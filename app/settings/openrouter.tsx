/**
 * @file app/settings/openrouter.tsx
 * @purpose OpenRouter provider configuration — API key, model selection, connection test.
 */

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import type { SettingsStatus } from "@/components/settings/SettingsStatusBanner";
import { ProviderSettingsScreen } from "@/components/settings/ProviderSettingsScreen";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";
import { OPENROUTER_MODELS } from "@/types/provider.types";

export default function OpenRouterSettings() {
  const { selectedModel, setSelectedModel } = useProviderStore();
  const { openrouterApiKey, setOpenRouterApiKey } = useAuthStore();

  const [apiKey, setApiKeyState] = useState(openrouterApiKey || "");
  const [status, setStatus] = useState<SettingsStatus | null>(null);

  useEffect(() => {
    setApiKeyState(openrouterApiKey || "");
  }, [openrouterApiKey]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (): Promise<SettingsStatus | null> => {
      setOpenRouterApiKey(apiKey || null);

      if (!apiKey) {
        return null;
      }

      const success = await testProviderConnection("openrouter", { apiKey });
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
        message: error instanceof Error ? error.message : "Could not save OpenRouter settings.",
      });
    },
  });

  const handleSave = () => {
    setStatus(null);
    saveSettingsMutation.mutate();
  };

  return (
    <ProviderSettingsScreen
      title="OpenRouter"
      providerId="openrouter"
      inputLabel="API Key"
      inputValue={apiKey}
      onChangeText={setApiKeyState}
      inputPlaceholder="sk-or-..."
      inputSecureTextEntry
      predefinedModels={OPENROUTER_MODELS}
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
