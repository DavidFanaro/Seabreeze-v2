/**
 * @file app/settings/ollama.tsx
 * @purpose Ollama provider configuration — base URL, connection test, model discovery.
 */

import { useEffect, useState } from "react";

import { ProviderSettingsScreen } from "@/components/settings/ProviderSettingsScreen";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";
import { fetchOllamaModels } from "@/providers/ollama-provider";
import { normalizeUniqueModelNames } from "@/lib/model-utils";
import { OLLAMA_MODELS } from "@/types/provider.types";

export default function OllamaSettings() {
  const { selectedModel, setSelectedModel, availableModels, setAvailableModels } = useProviderStore();
  const { ollamaUrl, setOllamaUrl } = useAuthStore();

  const [baseUrl, setBaseUrlState] = useState(ollamaUrl || "http://localhost:11434");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    setBaseUrlState(ollamaUrl || "http://localhost:11434");
  }, [ollamaUrl]);

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);

    await setOllamaUrl(baseUrl);

    setIsTesting(true);
    const success = await testProviderConnection("ollama", { url: baseUrl });
    setTestResult({
      success,
      message: success
        ? "Connected successfully!"
        : "Connection failed. Check your URL and Ollama server.",
    });

    setIsTesting(false);
    setIsSaving(false);
  };

  const handleFetchModels = async () => {
    setIsLoadingModels(true);
    setTestResult(null);

    const trimmedBaseUrl = baseUrl.trim();
    if (!trimmedBaseUrl) {
      setTestResult({
        success: false,
        message: "Please enter an Ollama URL before loading models.",
      });
      setIsLoadingModels(false);
      return;
    }

    try {
      const existingModels = normalizeUniqueModelNames(availableModels.ollama ?? []);
      const existingModelSet = new Set(existingModels);
      const models = normalizeUniqueModelNames(await fetchOllamaModels(trimmedBaseUrl));
      const fetchedModelSet = new Set(models);
      const addedModelCount = models.filter((m) => !existingModelSet.has(m)).length;
      const removedModelCount = existingModels.filter((m) => !fetchedModelSet.has(m)).length;

      setAvailableModels("ollama", models);

      if (models.length > 0) {
        setTestResult({
          success: true,
          message:
            addedModelCount === 0 && removedModelCount === 0
              ? `Models are up to date (${models.length} total).`
              : `Synced ${models.length} models (${addedModelCount} added, ${removedModelCount} removed).`,
        });
        return;
      }

      const connectionOk = await testProviderConnection("ollama", { url: trimmedBaseUrl });
      setTestResult(
        connectionOk
          ? {
              success: false,
              message: "Connected, but no models were returned. Run 'ollama list' to verify.",
            }
          : {
              success: false,
              message: "Could not reach Ollama. Check your URL and server status.",
            },
      );
    } catch {
      setTestResult({ success: false, message: "Failed to load models." });
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <ProviderSettingsScreen
      title="Ollama"
      providerId="ollama"
      inputLabel="Ollama Base URL"
      inputValue={baseUrl}
      onChangeText={setBaseUrlState}
      inputPlaceholder="http://localhost:11434"
      inputAutoCapitalize="none"
      predefinedModels={OLLAMA_MODELS}
      dynamicModels={availableModels.ollama}
      selectedModel={selectedModel}
      onModelSelect={setSelectedModel}
      status={testResult}
      actions={[
        {
          title: "Save & Test",
          onPress: handleSave,
          loading: isSaving || isTesting,
        },
        {
          title: "Load Models",
          onPress: handleFetchModels,
          loading: isLoadingModels,
        },
      ]}
    />
  );
}
