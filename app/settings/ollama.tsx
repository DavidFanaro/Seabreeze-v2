import { router, Stack } from "expo-router";
import * as React from "react";
import { View, Text, SafeAreaView, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Suspense, useState, useEffect, useCallback } from "react";
import { IconButton, SettingInput, SaveButton, ModelListManager, useTheme } from "@/components";
import { SymbolView } from "expo-symbols";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";
import { fetchOllamaModels } from "@/providers/ollama-provider";
import { OLLAMA_MODELS } from "@/types/provider.types";

type ConnectionStatus = "unknown" | "checking" | "connected" | "disconnected";

export default function OllamaSettings() {
    const { theme } = useTheme();
    const { selectedModel, setSelectedModel, customModels, addCustomModel } = useProviderStore();
    const { ollamaUrl, setOllamaUrl } = useAuthStore();

    const [url, setUrlState] = useState(ollamaUrl || "");
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("unknown");

    const checkConnection = useCallback(async (urlToCheck: string | null) => {
        if (!urlToCheck) {
            setConnectionStatus("unknown");
            return;
        }
        setConnectionStatus("checking");
        try {
            const success = await testProviderConnection("ollama", { url: urlToCheck });
            setConnectionStatus(success ? "connected" : "disconnected");
        } catch {
            setConnectionStatus("disconnected");
        }
    }, []);

    const handleFetchModels = async () => {
        if (!url) {
            setTestResult({
                success: false,
                message: "Please enter an Ollama URL first.",
            });
            return;
        }

        setIsFetchingModels(true);
        setTestResult(null);

        try {
            const models = await fetchOllamaModels(url);

            if (models.length === 0) {
                setTestResult({
                    success: false,
                    message: "No models found on server. Check console logs for details.",
                });
                return;
            }

            const currentCustomModels = customModels["ollama"] || [];
            const newModels = models.filter((m) => !currentCustomModels.includes(m));

            if (newModels.length === 0) {
                setTestResult({
                    success: true,
                    message: "Server returned models you already have. No new models added.",
                });
                setIsFetchingModels(false);
                return;
            }

            for (const model of newModels) {
                addCustomModel("ollama", model);
            }

            setTestResult({
                success: true,
                message: `Added ${newModels.length} model${newModels.length === 1 ? "" : "s"} from server. Use the list below to manage all your models (add, edit, delete).`,
            });
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : "Unknown error occurred";
            setTestResult({
                success: false,
                message: `Failed to fetch models: ${errorMessage}. Check console logs for details.`,
            });
        } finally {
            setIsFetchingModels(false);
        }
    };

    // Sync local state when store value changes and check connection
    useEffect(() => {
        setUrlState(ollamaUrl || "");
        checkConnection(ollamaUrl);
    }, [ollamaUrl, checkConnection]);

    const handleSave = async () => {
        setIsSaving(true);
        setTestResult(null);

        await setOllamaUrl(url || null);

        if (url) {
            setIsTesting(true);
            const success = await testProviderConnection("ollama", { url });
            setTestResult({
                success,
                message: success ? "Connected successfully!" : "Connection failed. Check your URL.",
            });
            setIsTesting(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Stack.Screen
                options={{
                    headerTitle: "Ollama",
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
                                label="Ollama URL"
                                value={url}
                                onChangeText={setUrlState}
                                placeholder="http://localhost:11434"
                            />

                            {/* Connection Status */}
                            <Pressable
                                onPress={() => checkConnection(url)}
                                disabled={connectionStatus === "checking" || !url}
                                style={({ pressed }) => [
                                    styles.statusBadge,
                                    {
                                        backgroundColor: theme.colors.surface,
                                        borderColor: theme.colors.border,
                                        opacity: pressed ? 0.7 : 1,
                                    },
                                ]}
                            >
                                {connectionStatus === "checking" ? (
                                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                                ) : (
                                    <View
                                        style={[
                                            styles.statusDot,
                                            {
                                                backgroundColor:
                                                    connectionStatus === "connected"
                                                        ? "#34C759"
                                                        : connectionStatus === "disconnected"
                                                        ? theme.colors.error
                                                        : theme.colors.textSecondary,
                                            },
                                        ]}
                                    />
                                )}
                                <Text style={[styles.statusText, { color: theme.colors.text }]}>
                                    {connectionStatus === "checking"
                                        ? "Checking..."
                                        : connectionStatus === "connected"
                                        ? "Connected"
                                        : connectionStatus === "disconnected"
                                        ? "Disconnected"
                                        : "Not configured"}
                                </Text>
                                {connectionStatus !== "checking" && url && (
                                    <SymbolView
                                        name="arrow.clockwise"
                                        size={14}
                                        tintColor={theme.colors.textSecondary}
                                    />
                                )}
                            </Pressable>

                            {/* Fetch Models Button */}
                            <Pressable
                                onPress={handleFetchModels}
                                disabled={isFetchingModels || connectionStatus !== "connected" || !url}
                                style={({ pressed }) => [
                                    styles.fetchButton,
                                    {
                                        backgroundColor: theme.colors.accent,
                                        opacity: pressed || isFetchingModels ? 0.6 : 1,
                                    },
                                ]}
                            >
                                {isFetchingModels ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <>
                                        <SymbolView name="arrow.down.circle.fill" size={18} tintColor="#ffffff" />
                                        <Text style={styles.fetchButtonText}>Fetch Models from Server</Text>
                                    </>
                                )}
                            </Pressable>

                            <View style={{ marginTop: theme.spacing.md }}>
                                <ModelListManager
                                    providerId="ollama"
                                    predefinedModels={OLLAMA_MODELS}
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
                            loading={isSaving || isTesting || isFetchingModels}
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
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "500",
        flex: 1,
    },
    fetchButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 10,
    },
    fetchButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
    },
    infoContainer: {
        marginHorizontal: 16,
        padding: 12,
        borderRadius: 8,
        backgroundColor: "transparent",
    },
    infoText: {
        fontSize: 14,
    },
});
