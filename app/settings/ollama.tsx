import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { Suspense, useState, useEffect } from "react";
import { IconButton, SettingInput, SaveButton, ModelListManager, useTheme } from "@/components";
import { SymbolView } from "expo-symbols";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";
import { OLLAMA_MODELS } from "@/types/provider.types";

export default function OllamaSettings() {
    const { theme } = useTheme();
    const { selectedModel, setSelectedModel, availableModels } = useProviderStore();
    const { ollamaUrl, setOllamaUrl } = useAuthStore();

    const [baseUrl, setBaseUrlState] = useState(ollamaUrl || "http://localhost:11434");
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Sync local state when store value changes
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
            message: success ? "Connected successfully!" : "Connection failed. Check your URL and Ollama server.",
        });
        setIsTesting(false);
        setIsSaving(false);
    };

    const handleFetchModels = async () => {
        setIsLoadingModels(true);
        try {
            const response = await fetch(`${baseUrl}/api/tags`);
            if (response.ok) {
                const data = await response.json();
                const models = data.models.map((m: { name: string }) => m.name);
                useProviderStore.getState().setAvailableModels("ollama", models);
                setTestResult({
                    success: true,
                    message: `Loaded ${models.length} models`,
                });
            } else {
                setTestResult({
                    success: false,
                    message: "Failed to load models",
                });
            }
        } catch {
            setTestResult({
                success: false,
                message: "Connection error",
            });
        }
        setIsLoadingModels(false);
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
                        <SettingInput
                            label="Ollama Base URL"
                            value={baseUrl}
                            onChangeText={setBaseUrlState}
                            placeholder="http://localhost:11434"
                            autoCapitalize="none"
                        />

                        <View className="flex-row gap-2 px-4 mt-4">
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

                        <View className="mt-4">
                            <ModelListManager
                                providerId="ollama"
                                predefinedModels={OLLAMA_MODELS}
                                dynamicModels={availableModels.ollama}
                                selectedModel={selectedModel}
                                onModelSelect={setSelectedModel}
                            />
                        </View>

                        {testResult && (
                            <View
                                className="flex-row items-center mx-4 p-3 rounded-md"
                                style={{ backgroundColor: theme.colors.surface }}
                            >
                                <SymbolView
                                    name={testResult.success ? "checkmark.circle" : "xmark.circle"}
                                    size={20}
                                    tintColor={testResult.success ? theme.colors.accent : theme.colors.error}
                                />
                                <Text
                                    className="text-[14px] ml-2"
                                    style={{
                                        color: testResult.success ? theme.colors.accent : theme.colors.error,
                                    }}
                                >
                                    {testResult.message}
                                </Text>
                            </View>
                        )}
                        <View className="flex-1 min-h-5" />
                    </ScrollView>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}
