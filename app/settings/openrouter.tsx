import { router, Stack } from "expo-router";
import * as React from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { Suspense, useState, useEffect } from "react";
import { IconButton, SettingInput, SaveButton, ModelListManager, useTheme } from "@/components";
import { SymbolView } from "expo-symbols";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";
import { OPENROUTER_MODELS } from "@/types/provider.types";

export default function OpenRouterSettings() {
    const { theme } = useTheme();
    const { selectedModel, setSelectedModel } = useProviderStore();
    const { openrouterApiKey, setOpenRouterApiKey } = useAuthStore();

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
        // ROOT CONTAINER: Full-screen outer wrapper with themed background color
        <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            {/* HEADER SECTION: Navigation bar with title and close button */}
            <Stack.Screen
                options={{
                    // Sets the screen title to "OpenRouter"
                    headerTitle: "OpenRouter",
                    // Transparent header for seamless integration with background
                    headerTransparent: true,
                    // Tint color matches the theme's text color for consistency
                    headerTintColor: theme.colors.text,
                    // Right header action: Close/dismiss button
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
            {/* SAFE AREA VIEW: Ensures content respects device safe areas (notches, etc.) */}
            <SafeAreaView className="flex-1">
                {/* SUSPENSE BOUNDARY: Loading fallback while content is being prepared */}
                <Suspense fallback={<Text>Loading</Text>}>
                    {/* SCROLLABLE CONTENT CONTAINER: Allows vertical scrolling with keyboard persistence */}
                    <ScrollView
                        className="flex-1"
                        contentContainerClassName="flex-grow pt-5 gap-5"
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* API KEY INPUT SECTION: Secure text entry for OpenRouter API credentials */}
                        <SettingInput
                            label="API Key"
                            value={apiKey}
                            onChangeText={setApiKeyState}
                            // secureTextEntry hides sensitive API key characters from view
                            secureTextEntry={true}
                            placeholder="sk-or-..."
                        />

                        {/* MODEL SELECTION SECTION: Manages available OpenRouter models */}
                        <View className="mt-4">
                            <ModelListManager
                                providerId="openrouter"
                                // Uses predefined list of available OpenRouter models
                                predefinedModels={OPENROUTER_MODELS}
                                // Current selected model from global provider store
                                selectedModel={selectedModel}
                                // Callback to update selected model in store
                                onModelSelect={setSelectedModel}
                            />
                        </View>

                        {/* TEST RESULT FEEDBACK SECTION: Displays connection test status and message */}
                        {testResult && (
                            <View
                                className="flex-row items-center mx-4 p-3 rounded-md"
                                style={{ backgroundColor: theme.colors.surface }}
                            >
                                {/* Icon: Success (checkmark) or failure (xmark) symbol */}
                                <SymbolView
                                    name={testResult.success ? "checkmark.circle" : "xmark.circle"}
                                    size={20}
                                    tintColor={testResult.success ? theme.colors.accent : theme.colors.error}
                                />
                                {/* Message: Descriptive text about the connection test result */}
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

                        {/* SPACER: Flexible space that pushes content up and the save button down */}
                        <View className="flex-1 min-h-2" />

                        {/* SAVE BUTTON SECTION: Action button to persist settings and test connection */}
                        <View className="px-4">
                            <SaveButton
                                onPress={handleSave}
                                // Shows loading indicator while saving settings or testing connection
                                loading={isSaving || isTesting}
                                title="Save Settings"
                            />
                        </View>

                        {/* BOTTOM PADDING: Small space at bottom for visual breathing room */}
                        <View className="h-2" />
                    </ScrollView>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}
