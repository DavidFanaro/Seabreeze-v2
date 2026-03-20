/**
 * @file app/settings/openai.tsx
 * @purpose OpenAI provider configuration — API key, model selection, connection test.
 */

import { useEffect, useState } from "react";

import { ProviderSettingsScreen } from "@/components/settings/ProviderSettingsScreen";
import { OPENAI_MODELS } from "@/types/provider.types";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";

export default function OpenAISettings() {
  const { selectedModel, setSelectedModel } = useProviderStore();
  const { openaiApiKey, setOpenAIApiKey } = useAuthStore();

  const [apiKey, setApiKeyState] = useState(openaiApiKey || "");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setApiKeyState(openaiApiKey || "");
  }, [openaiApiKey]);

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);

    await setOpenAIApiKey(apiKey || null);

    if (apiKey) {
      setIsTesting(true);
      const success = await testProviderConnection("openai", { apiKey });
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
