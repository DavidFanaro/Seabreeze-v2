import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { Suspense, useState, useEffect } from "react";
import { IconButton, SettingInput, SaveButton, ModelListManager, useTheme } from "@/components";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";
import { OLLAMA_MODELS } from "@/types/provider.types";

/**
 * OllamaSettings Component
 *
 * Main settings screen for configuring Ollama provider connections.
 * Allows users to:
 * - Set the Ollama base URL
 * - Test the connection to verify the server is running
 * - Fetch available models from the Ollama instance
 * - Select and manage models for use in the chat
 */
export default function OllamaSettings() {
    // Get theme colors and styles from the theme context
    const { theme } = useTheme();

    // Get model selection and available models from the provider store
    const { selectedModel, setSelectedModel, availableModels } = useProviderStore();

    // Get Ollama URL configuration from auth store for persistence
    const { ollamaUrl, setOllamaUrl } = useAuthStore();

    // Local state for the base URL input field, initialized from persistent auth store
    const [baseUrl, setBaseUrlState] = useState(ollamaUrl || "http://localhost:11434");

    // State to track if a connection test is in progress
    const [isTesting, setIsTesting] = useState(false);

    // State to store the result of connection tests (success/failure with message)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // State to track if the settings are being saved
    const [isSaving, setIsSaving] = useState(false);

    // State to track if models are being loaded from the Ollama instance
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Effect: Sync local baseUrl state when the stored ollamaUrl changes
    // This ensures the input field reflects updates from other sources
    useEffect(() => {
        setBaseUrlState(ollamaUrl || "http://localhost:11434");
    }, [ollamaUrl]);

    /**
     * Handler: Save URL and test connection
     * - Persists the base URL to auth store
     * - Tests the connection to verify Ollama server is accessible
     * - Displays result message to user
     */
    const handleSave = async () => {
        setIsSaving(true);
        setTestResult(null);

        // Persist the URL to the auth store
        await setOllamaUrl(baseUrl);

        // Test the connection with the saved URL
        setIsTesting(true);
        const success = await testProviderConnection("ollama", { url: baseUrl });

        // Set result message based on success/failure
        setTestResult({
            success,
            message: success ? "Connected successfully!" : "Connection failed. Check your URL and Ollama server.",
        });

        setIsTesting(false);
        setIsSaving(false);
    };

    /**
     * Handler: Fetch available models from Ollama instance
     * - Calls Ollama API endpoint to retrieve installed models
     * - Stores models in provider store for model selection
     * - Displays success/failure message to user
     */
    const handleFetchModels = async () => {
        setIsLoadingModels(true);
        try {
            // Call Ollama API to get available models
            const response = await fetch(`${baseUrl}/api/tags`);

            if (response.ok) {
                // Extract model names from response
                const data = await response.json();
                const models = data.models.map((m: { name: string }) => m.name);

                // Store models in provider store for later selection
                useProviderStore.getState().setAvailableModels("ollama", models);

                // Show success message with model count
                setTestResult({
                    success: true,
                    message: `Loaded ${models.length} models`,
                });
            } else {
                // Handle HTTP error responses
                setTestResult({
                    success: false,
                    message: "Failed to load models",
                });
            }
        } catch {
            // Handle network or other errors
            setTestResult({
                success: false,
                message: "Connection error",
            });
        }
        setIsLoadingModels(false);
    };

    return (
        // Main container with background color from theme
        <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            {/* Header configuration with title and close button */}
            <Stack.Screen
                options={{
                    headerTitle: "Ollama",
                    headerTransparent: true,
                    headerTintColor: theme.colors.text,
                    // Header right button to dismiss this modal/screen
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
            {/* Safe area view to respect device safe areas (notch, home indicator, etc.) */}
            <SafeAreaView className="flex-1">
                {/* Suspense boundary for async operations with loading fallback */}
                <Suspense fallback={<Text>Loading</Text>}>
                    {/* Scrollable container for all settings content */}
                    <ScrollView
                        className="flex-1"
                        contentContainerClassName="flex-grow pt-5 gap-5"
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* SECTION 1: URL Input Field */}
                        {/* Allows user to enter or modify the Ollama server base URL */}
                        <SettingInput
                            label="Ollama Base URL"
                            value={baseUrl}
                            onChangeText={setBaseUrlState}
                            placeholder="http://localhost:11434"
                            autoCapitalize="none"
                        />

                        {/* SECTION 2: Action Buttons Row */}
                        {/* Horizontal row containing two action buttons for saving/testing and loading models */}
                        <View className="flex-row gap-2 px-4 mt-4">
                            {/* Left button: Save URL and test connection to Ollama server */}
                            <View className="flex-1">
                                <SaveButton
                                    onPress={handleSave}
                                    loading={isSaving || isTesting}
                                    title="Save & Test"
                                />
                            </View>

                            {/* Right button: Fetch available models from the connected Ollama instance */}
                            <View className="flex-1">
                                <SaveButton
                                    onPress={handleFetchModels}
                                    loading={isLoadingModels}
                                    title="Load Models"
                                />
                            </View>
                        </View>

                        {/* SECTION 4: Model Selection Manager */}
                        {/* Component for selecting and managing available Ollama models */}
                        {/* Shows both predefined models and dynamically loaded models from the Ollama instance */}
                        <View className="mt-4">
                            <ModelListManager
                                providerId="ollama"
                                predefinedModels={OLLAMA_MODELS}
                                dynamicModels={availableModels.ollama}
                                selectedModel={selectedModel}
                                onModelSelect={setSelectedModel}
                            />
                        </View>

                        {/* SECTION 3: Connection Test Result Message */}
                        {/* Displays success or error message after testing connection or loading models */}
                        {testResult && (
                            <View className="mx-4 p-3 rounded-lg" style={{ backgroundColor: testResult.success ? theme.colors.accent : theme.colors.error }}>
                                <Text className="text-white text-center font-semibold">{testResult.message}</Text>
                            </View>
                        )}
                        <View className="flex-1 min-h-2" />
                    </ScrollView>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}
