/**
 * @file app/settings/openai.tsx
 * @purpose OpenAI provider configuration — API key, model selection, connection test.
 */

import { router, Stack } from "expo-router";
import * as React from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { Suspense, useState, useEffect } from "react";
import { IconButton, SettingInput, SaveButton, ModelListManager, useTheme } from "@/components";
import { SymbolView } from "expo-symbols";
import { OPENAI_MODELS } from "@/types/provider.types";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";

export default function OpenAISettings() {
  const { theme } = useTheme();
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
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerTitle: "OpenAI",
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
            {/* API Key */}
            <SettingInput
              label="API Key"
              value={apiKey}
              onChangeText={setApiKeyState}
              secureTextEntry={true}
              placeholder="sk-..."
            />

            {/* Model selection */}
            <View className="mt-4">
              <ModelListManager
                providerId="openai"
                predefinedModels={OPENAI_MODELS}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
              />
            </View>

            {/* Push bottom section down */}
            <View className="flex-1 min-h-2" />

            {/* Test result — shown just above Save button for context */}
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

            {/* Save button */}
            <View className="px-4">
              <SaveButton
                onPress={handleSave}
                loading={isSaving || isTesting}
                title="Save Settings"
              />
            </View>

            <View className="h-2" />
          </ScrollView>
        </Suspense>
      </SafeAreaView>
    </View>
  );
}
