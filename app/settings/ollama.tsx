/**
 * @file app/settings/ollama.tsx
 * @purpose Ollama provider configuration — base URL, connection test, model discovery.
 */

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import type { SettingsStatus } from "@/components/settings/SettingsStatusBanner";
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
  const [status, setStatus] = useState<SettingsStatus | null>(null);

  useEffect(() => {
    setBaseUrlState(ollamaUrl || "http://localhost:11434");
  }, [ollamaUrl]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (): Promise<SettingsStatus> => {
      setOllamaUrl(baseUrl);

      const success = await testProviderConnection("ollama", { url: baseUrl });
      return {
        success,
        message: success
          ? "Connected successfully!"
          : "Connection failed. Check your URL and Ollama server.",
      };
    },
    onSuccess: (nextStatus) => {
      setStatus(nextStatus);
    },
    onError: (error) => {
      setStatus({
        success: false,
        message: error instanceof Error ? error.message : "Could not save Ollama settings.",
      });
    },
  });

  const loadModelsMutation = useMutation({
    mutationFn: async (): Promise<SettingsStatus> => {
      const trimmedBaseUrl = baseUrl.trim();
      if (!trimmedBaseUrl) {
        return {
          success: false,
          message: "Please enter an Ollama URL before loading models.",
        };
      }

      const existingModels = normalizeUniqueModelNames(availableModels.ollama ?? []);
      const existingModelSet = new Set(existingModels);
      const models = normalizeUniqueModelNames(await fetchOllamaModels(trimmedBaseUrl));
      const fetchedModelSet = new Set(models);
      const addedModelCount = models.filter((modelName) => !existingModelSet.has(modelName)).length;
      const removedModelCount = existingModels.filter((modelName) => !fetchedModelSet.has(modelName)).length;

      setAvailableModels("ollama", models);

      if (models.length > 0) {
        return {
          success: true,
          message:
            addedModelCount === 0 && removedModelCount === 0
              ? `Models are up to date (${models.length} total).`
              : `Synced ${models.length} models (${addedModelCount} added, ${removedModelCount} removed).`,
        };
      }

      const connectionOk = await testProviderConnection("ollama", { url: trimmedBaseUrl });
      return connectionOk
        ? {
            success: false,
            message: "Connected, but no models were returned. Run 'ollama list' to verify.",
          }
        : {
            success: false,
            message: "Could not reach Ollama. Check your URL and server status.",
          };
    },
    onSuccess: (nextStatus) => {
      setStatus(nextStatus);
    },
    onError: () => {
      setStatus({ success: false, message: "Failed to load models." });
    },
  });

  const handleSave = () => {
    setStatus(null);
    saveSettingsMutation.mutate();
  };

  const handleFetchModels = () => {
    setStatus(null);
    loadModelsMutation.mutate();
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
      status={status}
      actions={[
        {
          title: "Save & Test",
          onPress: handleSave,
          loading: saveSettingsMutation.isPending,
        },
        {
          title: "Load Models",
          onPress: handleFetchModels,
          loading: loadModelsMutation.isPending,
        },
      ]}
    />
  );
}
