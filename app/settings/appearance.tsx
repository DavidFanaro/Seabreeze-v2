import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, ScrollView, Switch } from "react-native";
import { Suspense } from "react";
import { IconButton, GlassButton, useTheme } from "@/components";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ThemeMode } from "@/components/ui/ThemeProvider";

export default function AppearanceSettings() {
    const { theme, themeMode, setTheme } = useTheme();
    const showCodeLineNumbers = useSettingsStore((state) => state.showCodeLineNumbers);
    const setShowCodeLineNumbers = useSettingsStore((state) => state.setShowCodeLineNumbers);

    const themeOptions: { id: ThemeMode; name: string; icon: string }[] = [
        { id: "light", name: "Light", icon: "sun.max" },
        { id: "dark", name: "Dark", icon: "moon" },
        { id: "nord", name: "Nord", icon: "snowflake" },
        { id: "catppuccin", name: "Catppuccin", icon: "pawprint" },
        { id: "tokyo-night", name: "Tokyo Night", icon: "moon.stars" },
        { id: "system", name: "System", icon: "circle.lefthalf.filled" },
    ];

    const handleThemeChange = (newTheme: ThemeMode) => {
        setTheme(newTheme);
    };

    return (
        <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <Stack.Screen
                options={{
                    headerTitle: "Appearance",
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
                        <Text
                            className="text-[13px] font-bold uppercase tracking-wide mb-2"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            THEME
                        </Text>

                        <View
                            className="rounded-lg overflow-hidden"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            {themeOptions.map((option, index) => {
                                const isSelected = themeMode === option.id;
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

                        <Text
                            className="text-[13px] font-bold uppercase tracking-wide mb-2 mt-6"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            CHAT DISPLAY
                        </Text>

                        <View
                            className="rounded-lg overflow-hidden p-4"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <Text
                                        className="text-[16px] font-semibold"
                                        style={{ color: theme.colors.text }}
                                    >
                                        Show Code Line Numbers
                                    </Text>
                                    <Text
                                        className="text-[13px] mt-1"
                                        style={{ color: theme.colors.textSecondary }}
                                    >
                                        Display line numbers in code blocks
                                    </Text>
                                </View>
                                <Switch
                                    value={showCodeLineNumbers}
                                    onValueChange={setShowCodeLineNumbers}
                                    trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                                    thumbColor={showCodeLineNumbers ? theme.colors.accent : theme.colors.textSecondary}
                                />
                            </View>
                        </View>

                        <View className="h-4" />
                    </ScrollView>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}
