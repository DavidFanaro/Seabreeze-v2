/**
 * @file app/settings/openrouter.tsx
 * @purpose OpenRouter provider configuration — API key, model selection, connection test.
 */

import { useEffect, useState } from "react";

import { ProviderSettingsScreen } from "@/components/settings/ProviderSettingsScreen";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";
import { OPENROUTER_MODELS } from "@/types/provider.types";

export default function OpenRouterSettings() {
  const { selectedModel, setSelectedModel } = useProviderStore();
  const { openrouterApiKey, setOpenRouterApiKey } = useAuthStore();

  const [apiKey, setApiKeyState] = useState(openrouterApiKey || "");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setApiKeyState(openrouterApiKey || "");
  }, [openrouterApiKey]);

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);

    await setOpenRouterApiKey(apiKey || null);

    if (apiKey) {
      setIsTesting(true);
      const success = await testProviderConnection("openrouter", { apiKey });
      setTestResult({
        success,
        message: success ? "Connected successfully!" : "Connection failed. Check your API key.",
      });
      setIsTesting(false);
    }

    setIsSaving(false);
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
      status={testResult}
      actions={[
        {
          title: "Save Settings",
          onPress: handleSave,
          loading: isSaving || isTesting,
        },
      ]}
    />
  );
}
