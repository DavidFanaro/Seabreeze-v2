/**
 * @file app/settings/ollama.tsx
 * @purpose Ollama provider configuration — base URL, connection test, model discovery.
 */

import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { Suspense, useState, useEffect } from "react";
import { IconButton, SettingInput, SaveButton, ModelListManager, useTheme } from "@/components";
import { SymbolView } from "expo-symbols";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";
import { fetchOllamaModels } from "@/providers/ollama-provider";
import { OLLAMA_MODELS } from "@/types/provider.types";

function normalizeUniqueModelNames(models: unknown[]): string[] {
  const normalizedModels: string[] = [];
  const seenModels = new Set<string>();

  for (const model of models) {
    if (typeof model !== "string") continue;
    const normalizedModel = model.trim();
    if (!normalizedModel || seenModels.has(normalizedModel)) continue;
    seenModels.add(normalizedModel);
    normalizedModels.push(normalizedModel);
  }

  return normalizedModels;
}

export default function OllamaSettings() {
  const { theme } = useTheme();
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
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerTitle: "Ollama",
          headerTransparent: true,
          headerTintColor: theme.colors.text,
          headerRight: () => (
            <IconButton
              icon="xmark"
              onPress={() => router.dismiss()}
              size={24}
              style={{ marginLeft: 6 }}
            />
          ),
        }}
      />
      <SafeAreaView className="flex-1">
        <Suspense fallback={<Text>Loading</Text>}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow pt-5 gap-5"
            keyboardShouldPersistTaps="handled"
          >
            {/* Base URL input */}
            <SettingInput
              label="Ollama Base URL"
              value={baseUrl}
              onChangeText={setBaseUrlState}
              placeholder="http://localhost:11434"
              autoCapitalize="none"
            />

            {/* Model selection */}
            <View className="mt-4">
              <ModelListManager
                providerId="ollama"
                predefinedModels={OLLAMA_MODELS}
                dynamicModels={availableModels.ollama}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
              />
            </View>

            {/* Push bottom section down */}
            <View className="flex-1 min-h-2" />

            {/* Test result — consistent with OpenAI/OpenRouter style */}
            {testResult && (
              <View
                className="flex-row items-center mx-4 p-3 rounded-xl"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <SymbolView
                  name={testResult.success ? "checkmark.circle" : "xmark.circle"}
                  size={20}
                  tintColor={testResult.success ? theme.colors.accent : theme.colors.error}
                />
                <Text
                  className="text-[14px] ml-2 flex-1"
                  style={{
                    color: testResult.success ? theme.colors.accent : theme.colors.error,
                  }}
                >
                  {testResult.message}
                </Text>
              </View>
            )}

            {/* Action buttons — side by side at bottom */}
            <View className="flex-row gap-2 px-4">
              <View className="flex-1">
                <SaveButton
                  onPress={handleSave}
                  loading={isSaving || isTesting}
                  title="Save & Test"
                />
              </View>
              <View className="flex-1">
                <SaveButton
                  onPress={handleFetchModels}
                  loading={isLoadingModels}
                  title="Load Models"
                />
              </View>
            </View>

            <View className="h-2" />
          </ScrollView>
        </Suspense>
      </SafeAreaView>
    </View>
  );
}
