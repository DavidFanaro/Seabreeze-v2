import { router, Stack } from "expo-router";
import * as React from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { Suspense, useState, useEffect } from "react";
import { IconButton, useTheme, GlassButton } from "@/components";

export default function GeneralSettings() {
    const { theme, themeMode, setTheme } = useTheme();
    const [selectedTheme, setSelectedTheme] = useState(themeMode);

    useEffect(() => {
        setSelectedTheme(themeMode);
    }, [themeMode]);

    const themeOptions = [
        { id: "light", name: "Light", icon: "sun.max" },
        { id: "dark", name: "Dark", icon: "moon" },
        { id: "system", name: "System", icon: "circle.lefthalf.filled" },
    ] as const;

    const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
        setSelectedTheme(newTheme);
        setTheme(newTheme);
    };

    return (
        <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <Stack.Screen
                options={{
                    headerTitle: "General",
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
            <SafeAreaView className="flex-1">
                <Suspense fallback={<Text>Loading</Text>}>
                    <ScrollView
                        className="flex-1"
                        contentContainerClassName="flex-grow pt-5 px-4"
                    >
                        <Text
                            className="text-[13px] font-bold uppercase tracking-wide mb-2"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            APPEARANCE
                        </Text>

                        <View
                            className="rounded-lg overflow-hidden"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            {themeOptions.map((option, index) => {
                                const isSelected = selectedTheme === option.id;
                                return (
                                    <GlassButton
                                        key={option.id}
                                        title={option.name}
                                        onPress={() => handleThemeChange(option.id)}
                                        variant={isSelected ? "primary" : "secondary"}
                                        style={{
                                            margin: 0,
                                            borderRadius: 0,
                                            borderWidth: 0,
                                            borderBottomWidth: index < themeOptions.length - 1 ? 1 : 0,
                                            borderBottomColor: theme.colors.border,
                                        }}
                                    />
                                );
                            })}
                        </View>

                        <View
                            className="p-4 rounded-lg mt-4"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            <Text
                                className="text-[16px] font-semibold mb-2"
                                style={{ color: theme.colors.text }}
                            >
                                About
                            </Text>
                            <Text
                                className="text-[14px] leading-[20px]"
                                style={{ color: theme.colors.textSecondary }}
                            >
                                Seabreeze v1.0.0
                                {"\n"}
                                A modern AI chat interface powered by React Native and Expo.
                                {"\n\n"}
                                Built with ❤️ for iOS, Android, and Web.
                            </Text>
                        </View>
                        <View className="h-4" />
                    </ScrollView>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}
