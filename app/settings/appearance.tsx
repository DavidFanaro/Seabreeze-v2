import { router, Stack } from "expo-router";
import { Pressable, View, Text, SafeAreaView, ScrollView, Switch } from "react-native";
import { Suspense } from "react";
import { SymbolView } from "expo-symbols";
import { IconButton, useTheme } from "@/components";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ThemeMode } from "@/components/ui/ThemeProvider";

const hexToRgba = (hex: string, alpha: number): string => {
    const sanitized = hex.replace("#", "");
    const normalized = sanitized.length === 3
        ? sanitized
            .split("")
            .map((value) => value + value)
            .join("")
        : sanitized;
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export default function AppearanceSettings() {
    const { theme, themeMode, setTheme } = useTheme();
    const showCodeLineNumbers = useSettingsStore((state) => state.showCodeLineNumbers);
    const setShowCodeLineNumbers = useSettingsStore((state) => state.setShowCodeLineNumbers);

    const themeOptions: { id: ThemeMode; name: string }[] = [
        { id: "light", name: "Light" },
        { id: "dark", name: "Dark" },
        { id: "nord", name: "Nord" },
        { id: "catppuccin", name: "Catppuccin" },
        { id: "tokyo-night", name: "Tokyo Night (Night)" },
        { id: "tokyo-night-storm", name: "Tokyo Night (Storm)" },
        { id: "tokyo-night-moon", name: "Tokyo Night (Moon)" },
        { id: "one-dark", name: "One Dark" },
        { id: "gruvbox-dark-hard", name: "Gruvbox (Dark Hard)" },
        { id: "gruvbox-dark-medium", name: "Gruvbox (Dark Medium)" },
        { id: "gruvbox-dark-soft", name: "Gruvbox (Dark Soft)" },
        { id: "darcula", name: "Darcula" },
        { id: "system", name: "System" },
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
                                const selectedBackground = hexToRgba(theme.colors.accent, 0.14);
                                const pressedBackground = isSelected
                                    ? hexToRgba(theme.colors.accent, 0.2)
                                    : theme.colors.border;

                                return (
                                    <Pressable
                                        key={option.id}
                                        onPress={() => handleThemeChange(option.id)}
                                        className="flex-row items-center justify-between px-4 py-4"
                                        style={({ pressed }) => ({
                                            minHeight: 56,
                                            backgroundColor: pressed
                                                ? pressedBackground
                                                : isSelected
                                                    ? selectedBackground
                                                    : theme.colors.surface,
                                            borderBottomWidth: index < themeOptions.length - 1 ? 1 : 0,
                                            borderBottomColor: theme.colors.border,
                                        })}
                                    >
                                        <View className="flex-row items-center flex-1">
                                            <Text
                                                className="text-[16px] font-semibold"
                                                style={{ color: theme.colors.text }}
                                            >
                                                {option.name}
                                            </Text>
                                        </View>
                                        {isSelected ? (
                                            <SymbolView
                                                name="checkmark"
                                                size={16}
                                                tintColor={theme.colors.accent}
                                            />
                                        ) : (
                                            <View className="w-[16px]" />
                                        )}
                                    </Pressable>
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
