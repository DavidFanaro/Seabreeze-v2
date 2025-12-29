import { router, Stack } from "expo-router";
import * as React from "react";
import * as SecureStore from "expo-secure-store";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Button,
    Pressable,
} from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { GlassView } from "expo-glass-effect";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";

enum settingTags {
    OpenAIAPIKey = "open_ai_apikey",
    OpenRouterAPIkey = "openrouter_apikey",
    OllamaURL = "ollama_url",
}
enum services {
    OpenAI = "openai",
    OpenRouter = "openrouter",
    Ollama = "ollama",
}

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

    return (
        <View>
            <Stack.Screen
                options={{
                    headerTitle: "Settings",
                    headerTransparent: true,
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => {
                                router.dismiss();
                            }}
                        >
                            <AntDesign
                                style={{ marginLeft: 6 }}
                                name="close"
                                size={24}
                                color="white"
                            />
                        </TouchableOpacity>
                    ),
                }}
            />
            <SafeAreaView>
                <Suspense fallback={<Text>Loading</Text>}>
                    <KeyboardAwareScrollView>
                        <View style={{ paddingHorizontal: 10 }}>
                            <Text
                                style={{
                                    color: "white",
                                    fontSize: 20,
                                    paddingBottom: 5,
                                }}
                            >
                                Open Router Api Key
                            </Text>
                            <GlassView
                                isInteractive
                                style={{ marginVertical: 5, borderRadius: 10 }}
                            >
                                <TextInput
                                    autoCapitalize="none"
                                    value={openRouterIAPIKeyState || ""}
                                    onChangeText={setOpenRouterAPIKeyState}
                                    secureTextEntry={true}
                                    style={{
                                        color: "white",
                                        height: 30,
                                        margin: 4,
                                    }}
                                />
                            </GlassView>
                        </View>
                        <View style={{ paddingTop: 10, paddingHorizontal: 10 }}>
                            <Text
                                style={{
                                    color: "white",
                                    fontSize: 20,
                                    paddingBottom: 5,
                                }}
                            >
                                OpenAI Api Key
                            </Text>
                            <GlassView
                                isInteractive
                                style={{ marginVertical: 5, borderRadius: 10 }}
                            >
                                <TextInput
                                    autoCapitalize="none"
                                    value={openAIAPIKeyState || ""}
                                    onChangeText={setOpenAIAPIKeyState}
                                    secureTextEntry={true}
                                    style={{
                                        color: "white",
                                        height: 30,
                                        margin: 4,
                                    }}
                                />
                            </GlassView>
                        </View>
                        <View style={{ paddingTop: 10, paddingHorizontal: 10 }}>
                            <Text
                                style={{
                                    color: "white",
                                    fontSize: 20,
                                    paddingBottom: 5,
                                }}
                            >
                                Ollama URL
                            </Text>
                            <GlassView
                                isInteractive
                                style={{ marginVertical: 5, borderRadius: 10 }}
                            >
                                <TextInput
                                    autoCapitalize="none"
                                    value={ollamaURlState || ""}
                                    onChangeText={setOllamaURlState}
                                    style={{
                                        color: "white",
                                        height: 30,
                                        margin: 4,
                                    }}
                                />
                            </GlassView>
                        </View>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "#0567d1",
                                margin: 10,
                                padding: 10,
                                borderRadius: 20,
                            }}
                            onPress={() => {
                                saveSettings();
                            }}
                        >
                            <Text style={{ color: "white", fontSize: 20 }}>
                                Save
                            </Text>
                        </TouchableOpacity>
                    </KeyboardAwareScrollView>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}
