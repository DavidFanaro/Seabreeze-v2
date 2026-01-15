import { router, Stack } from "expo-router";
import * as React from "react";
import { View, Text, SafeAreaView, StyleSheet, ScrollView } from "react-native";
import { Suspense, useState, useEffect } from "react";
import { IconButton, SettingInput, SaveButton, ModelListManager, useTheme } from "@/components";
import { SymbolView } from "expo-symbols";
import { useAIProviderStore, useAIAuthStore } from "@/stores/useAIStore";
import { testProviderConnection } from "@/lib/providers/provider-factory";
import { OPENROUTER_MODELS } from "@/lib/types/provider-types";

export default function OpenRouterSettings() {
    const { theme } = useTheme();
    const { selectedModel, setSelectedModel } = useAIProviderStore();
    const { openrouterApiKey, setOpenRouterApiKey } = useAIAuthStore();

    const [apiKey, setApiKeyState] = useState(openrouterApiKey || "");
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Sync local state when store value changes
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
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Stack.Screen
                options={{
                    headerTitle: "OpenRouter",
                    headerTransparent: true,
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
            <SafeAreaView style={{ flex: 1 }}>
                <Suspense fallback={<Text>Loading</Text>}>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{
                            flexGrow: 1,
                            paddingTop: theme.spacing.lg,
                        }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={{ gap: theme.spacing.lg }}>
                            <SettingInput
                                label="API Key"
                                value={apiKey}
                                onChangeText={setApiKeyState}
                                secureTextEntry={true}
                                placeholder="sk-or-..."
                            />

                            <View style={{ marginTop: theme.spacing.md }}>
                                <ModelListManager
                                    providerId="openrouter"
                                    predefinedModels={OPENROUTER_MODELS}
                                    selectedModel={selectedModel}
                                    onModelSelect={setSelectedModel}
                                />
                            </View>

                            {testResult && (
                                <View
                                    style={[
                                        styles.statusContainer,
                                        {
                                            backgroundColor: theme.colors.surface,
                                        },
                                    ]}
                                >
                                    <SymbolView
                                        name={testResult.success ? "checkmark.circle" : "xmark.circle"}
                                        size={20}
                                        tintColor={testResult.success ? theme.colors.accent : theme.colors.error}
                                    />
                                    <Text
                                        style={{
                                            color: testResult.success ? theme.colors.accent : theme.colors.error,
                                            fontSize: 14,
                                            marginLeft: 8,
                                        }}
                                    >
                                        {testResult.message}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ flex: 1, minHeight: theme.spacing.xl }} />
                        <SaveButton
                            onPress={handleSave}
                            loading={isSaving || isTesting}
                            title="Save Settings"
                        />
                        <View style={{ height: theme.spacing.md }} />
                    </ScrollView>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        padding: 12,
        borderRadius: 8,
    },
});
