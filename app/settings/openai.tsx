/**
 * @file app/settings/openai.tsx
 * @purpose OpenAI provider configuration — API key, model selection, connection test.
 */

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import type { SettingsStatus } from "@/components/settings/SettingsStatusBanner";
import { ProviderSettingsScreen } from "@/components/settings/ProviderSettingsScreen";
import { OPENAI_MODELS } from "@/types/provider.types";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";

export default function OpenAISettings() {
  const { selectedModel, setSelectedModel } = useProviderStore();
  const { openaiApiKey, setOpenAIApiKey } = useAuthStore();

  const [apiKey, setApiKeyState] = useState(openaiApiKey || "");
  const [status, setStatus] = useState<SettingsStatus | null>(null);

  useEffect(() => {
    setApiKeyState(openaiApiKey || "");
  }, [openaiApiKey]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (): Promise<SettingsStatus | null> => {
      setOpenAIApiKey(apiKey || null);

      if (!apiKey) {
        return null;
      }

      const success = await testProviderConnection("openai", { apiKey });
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
        message: error instanceof Error ? error.message : "Could not save OpenAI settings.",
      });
    },
  });

  const handleSave = () => {
    setStatus(null);
    saveSettingsMutation.mutate();
  };

  return (
    <ProviderSettingsScreen
      title="OpenAI"
      providerId="openai"
      inputLabel="API Key"
      inputValue={apiKey}
      onChangeText={setApiKeyState}
      inputPlaceholder="sk-..."
      inputSecureTextEntry
      predefinedModels={OPENAI_MODELS}
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
