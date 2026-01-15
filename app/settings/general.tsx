import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, StyleSheet } from "react-native";
import { Suspense } from "react";
import { IconButton, useTheme } from "@/components";

export default function GeneralSettings() {
    const { theme } = useTheme();

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
            <SafeAreaView style={{ flex: 1 }}>
                <Suspense fallback={<Text>Loading</Text>}>
                    <View style={styles.container}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>
                            General Settings
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                            App-wide settings will appear here
                        </Text>
                    </View>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 100,
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
    },
});
