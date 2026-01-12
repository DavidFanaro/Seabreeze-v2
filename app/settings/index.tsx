import { router, Stack } from "expo-router";
import * as React from "react";
import * as SecureStore from "expo-secure-store";
import { View, Text, SafeAreaView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { services, settingTags } from "@/util/kvtags";
import { IconButton, SettingInput, SaveButton, useTheme } from "@/components";

async function saveOpenAIApiKey(apiKey: string) {
    await SecureStore.setItemAsync(settingTags.OpenAIAPIKey, apiKey);
}
async function saveOpenRouterApiKey(apiKey: string) {
    await SecureStore.setItemAsync(settingTags.OpenRouterAPIkey, apiKey);
}
async function saveOllamaURL(url: string) {
    await SecureStore.setItemAsync(settingTags.OllamaURL, url);
}
async function getOpenAIAPIKey() {
    return await SecureStore.getItemAsync(settingTags.OpenAIAPIKey);
}
async function getOpenRouterAPIKey() {
    return await SecureStore.getItemAsync(settingTags.OpenRouterAPIkey);
}
async function getOllamaURL() {
    return await SecureStore.getItemAsync(settingTags.OllamaURL);
}

export default function Settings() {
    const { theme } = useTheme();
    const openApiKey = useQuery({
        queryKey: [services.OpenAI],
        queryFn: getOpenAIAPIKey,
        suspense: true,
    });
    const openRouterKey = useQuery({
        queryKey: [services.OpenRouter],
        queryFn: getOpenRouterAPIKey,
        suspense: true,
    });
    const ollamaUrl = useQuery({
        queryKey: [services.Ollama],
        queryFn: getOllamaURL,
        suspense: true,
    });
    const [openAIAPIKeyState, setOpenAIAPIKeyState] = useState(openApiKey.data);
    const [openRouterIAPIKeyState, setOpenRouterAPIKeyState] = useState(
        openRouterKey.data,
    );
    const [ollamaURlState, setOllamaURlState] = useState(ollamaUrl.data);

    const openAIAPIKeyMutation = useMutation({
        mutationFn: saveOpenAIApiKey,
        mutationKey: [services.OpenAI],
    });
    const openRouterAPIKeyMutation = useMutation({
        mutationFn: saveOpenRouterApiKey,
        mutationKey: [services.OpenRouter],
    });
    const ollamaURlMutation = useMutation({
        mutationFn: saveOllamaURL,
        mutationKey: [services.Ollama],
    });

    function saveSettings() {
        openAIAPIKeyMutation.mutate(openAIAPIKeyState!);
        openRouterAPIKeyMutation.mutate(openRouterIAPIKeyState!);
        ollamaURlMutation.mutate(ollamaURlState!);
    }

    const isSaving =
        openAIAPIKeyMutation.isPending ||
        openRouterAPIKeyMutation.isPending ||
        ollamaURlMutation.isPending;

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Stack.Screen
                options={{
                    headerTitle: "Settings",
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
                    <KeyboardAwareScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{
                            flexGrow: 1,
                            paddingTop: theme.spacing.lg,
                        }}
                    >
                        <View style={{ gap: theme.spacing.lg }}>
                            <SettingInput
                                label="Open Router API Key"
                                value={openRouterIAPIKeyState || ""}
                                onChangeText={setOpenRouterAPIKeyState}
                                secureTextEntry={true}
                                placeholder="sk-or-..."
                            />
                            <SettingInput
                                label="OpenAI API Key"
                                value={openAIAPIKeyState || ""}
                                onChangeText={setOpenAIAPIKeyState}
                                secureTextEntry={true}
                                placeholder="sk-..."
                            />
                            <SettingInput
                                label="Ollama URL"
                                value={ollamaURlState || ""}
                                onChangeText={setOllamaURlState}
                                placeholder="http://localhost:11434"
                            />
                        </View>
                        <View style={{ flex: 1, minHeight: theme.spacing.xl }} />
                        <SaveButton
                            onPress={saveSettings}
                            loading={isSaving}
                            title="Save Settings"
                        />
                        <View style={{ height: theme.spacing.md }} />
                    </KeyboardAwareScrollView>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}
