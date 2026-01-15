import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, StyleSheet } from "react-native";
import { Suspense } from "react";
import { IconButton, useTheme } from "@/components";
import { SymbolView } from "expo-symbols";

export default function AppleSettings() {
    const { theme } = useTheme();

    const features = [
        { icon: "cpu", text: "On-device processing for privacy" },
        { icon: "lock.shield", text: "Your data stays on your device" },
        { icon: "bolt.fill", text: "Fast inference with Apple Silicon" },
        { icon: "hand.tap", text: "System integration with iOS" },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Stack.Screen
                options={{
                    headerTitle: "Apple Intelligence",
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
                        <View style={styles.header}>
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: theme.colors.surface },
                                ]}
                            >
                                <SymbolView
                                    name="apple.logo"
                                    size={48}
                                    tintColor={theme.colors.text}
                                />
                            </View>
                            <Text style={[styles.title, { color: theme.colors.text }]}>
                                Apple Intelligence
                            </Text>
                            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                                On-device AI powered by Apple Silicon
                            </Text>
                        </View>

                        <View style={styles.infoSection}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                                FEATURES
                            </Text>
                            <View
                                style={[
                                    styles.featuresContainer,
                                    { borderColor: theme.colors.border },
                                ]}
                            >
                                {features.map((feature, index) => (
                                    <View key={index} style={styles.featureItem}>
                                        <SymbolView
                                            name={feature.icon as any}
                                            size={24}
                                            tintColor={theme.colors.accent}
                                        />
                                        <Text
                                            style={[
                                                styles.featureText,
                                                { color: theme.colors.text },
                                            ]}
                                        >
                                            {feature.text}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.noteSection}>
                            <View
                                style={[
                                    styles.noteContainer,
                                    { backgroundColor: theme.colors.surface },
                                ]}
                            >
                                <SymbolView
                                    name="info.circle"
                                    size={20}
                                    tintColor={theme.colors.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.noteText,
                                        { color: theme.colors.textSecondary },
                                    ]}
                                >
                                    Apple Intelligence is built into your device and requires no configuration. It uses system-default models optimized for Apple Silicon.
                                </Text>
                            </View>
                        </View>
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
    header: {
        alignItems: "center",
        marginBottom: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: "center",
    },
    infoSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    featuresContainer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    featureText: {
        fontSize: 15,
        marginLeft: 12,
    },
    noteSection: {
        marginTop: 16,
    },
    noteContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 16,
        borderRadius: 12,
    },
    noteText: {
        fontSize: 14,
        flex: 1,
        marginLeft: 12,
        lineHeight: 20,
    },
});
