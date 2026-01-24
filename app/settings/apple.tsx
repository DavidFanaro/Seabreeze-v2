import { router, Stack } from "expo-router";
import * as React from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { Suspense } from "react";
import { useTheme, IconButton } from "@/components";

export default function AppleSettings() {
    const { theme } = useTheme();

    return (
        <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <Stack.Screen
                options={{
                    headerTitle: "Apple Intelligence",
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
                        contentContainerClassName="flex-grow pt-5 px-4"
                    >
                        <View
                            className="p-4 rounded-lg mb-4"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            <Text
                                className="text-[16px] font-semibold mb-2"
                                style={{ color: theme.colors.text }}
                            >
                                About Apple Intelligence
                            </Text>
                            <Text
                                className="text-[14px] leading-[20px]"
                                style={{ color: theme.colors.textSecondary }}
                            >
                                Apple Intelligence provides on-device AI capabilities powered by Apple Silicon. It includes writing tools, image recognition, and natural language processing that runs locally on your device for privacy and performance.
                            </Text>
                        </View>

                        <View
                            className="p-4 rounded-lg mb-4"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            <Text
                                className="text-[16px] font-semibold mb-2"
                                style={{ color: theme.colors.text }}
                            >
                                Features
                            </Text>
                            <View className="gap-2">
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • Writing Tools: Rewriting, summarizing, and composing text
                                </Text>
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • Image Recognition: Identifying objects and text in images
                                </Text>
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • Siri Integration: Enhanced Siri capabilities
                                </Text>
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • On-Device Processing: All data stays on your device
                                </Text>
                            </View>
                        </View>

                        <View
                            className="p-4 rounded-lg"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            <Text
                                className="text-[16px] font-semibold mb-2"
                                style={{ color: theme.colors.text }}
                            >
                                System Requirements
                            </Text>
                            <View className="gap-2">
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • iPhone 15 Pro or later
                                </Text>
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • iPad with M1 chip or later
                                </Text>
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • Mac with M1 chip or later
                                </Text>
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • Latest iOS, iPadOS, or macOS
                                </Text>
                            </View>
                        </View>
                        <View className="h-4" />
                    </ScrollView>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}
