import { router, Stack } from "expo-router";
import * as React from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { Suspense } from "react";
import { useTheme, IconButton } from "@/components";

export default function AppleSettings() {
    const { theme } = useTheme();

    return (
        // Main container: Flex view that fills entire screen with background color from theme
        <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            {/* Navigation Header Section: Configures the screen header with title and close button */}
            <Stack.Screen
                options={{
                    headerTitle: "Apple Intelligence",
                    headerTransparent: true,
                    headerTintColor: theme.colors.text,
                    // Close button that dismisses the modal/screen
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
            {/* Safe Area Container: Prevents content from overlapping with system UI elements */}
            <SafeAreaView className="flex-1">
                {/* Loading Suspense Boundary: Displays fallback while content loads */}
                <Suspense fallback={<Text>Loading</Text>}>
                    {/* Scrollable Content Area: Enables vertical scrolling for longer content with padding */}
                    <ScrollView
                        className="flex-1"
                        contentContainerClassName="flex-grow pt-5 px-4"
                    >
                        {/* Section 1: About Apple Intelligence Card */}
                        {/* Contains informational content with title and description */}
                        <View
                            className="p-4 rounded-lg mb-4"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            {/* Title: "About Apple Intelligence" */}
                            {/* Styled as semibold text with larger font size and primary text color */}
                            <Text
                                className="text-[16px] font-semibold mb-2"
                                style={{ color: theme.colors.text }}
                            >
                                About Apple Intelligence
                            </Text>
                            {/* Description: Explains what Apple Intelligence is and its core benefits */}
                            {/* Uses secondary text color for visual hierarchy and reduced emphasis */}
                            <Text
                                className="text-[14px] leading-[20px]"
                                style={{ color: theme.colors.textSecondary }}
                            >
                                Apple Intelligence provides on-device AI capabilities powered by Apple Silicon. It includes writing tools, image recognition, and natural language processing that runs locally on your device for privacy and performance.
                            </Text>
                        </View>

                        {/* Section 2: Features Card */}
                        {/* Lists key capabilities and features of Apple Intelligence */}
                        <View
                            className="p-4 rounded-lg mb-4"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            {/* Title: "Features" */}
                            {/* Styled as semibold text with larger font size and primary text color */}
                            <Text
                                className="text-[16px] font-semibold mb-2"
                                style={{ color: theme.colors.text }}
                            >
                                Features
                            </Text>
                            {/* Features List: Vertically stacked list with equal spacing between items */}
                            <View className="gap-2">
                                {/* Feature Item 1: Writing Tools */}
                                {/* Bullet point describing text editing and composition capabilities */}
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • Writing Tools: Rewriting, summarizing, and composing text
                                </Text>
                                {/* Feature Item 2: Image Recognition */}
                                {/* Bullet point describing image analysis capabilities */}
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • Image Recognition: Identifying objects and text in images
                                </Text>
                                {/* Feature Item 3: Siri Integration */}
                                {/* Bullet point describing Siri enhancement features */}
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • Siri Integration: Enhanced Siri capabilities
                                </Text>
                                {/* Feature Item 4: On-Device Processing */}
                                {/* Bullet point emphasizing privacy through local data processing */}
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • On-Device Processing: All data stays on your device
                                </Text>
                            </View>
                        </View>

                        {/* Section 3: System Requirements Card */}
                        {/* Lists hardware and software prerequisites for Apple Intelligence */}
                        <View
                            className="p-4 rounded-lg"
                            style={{ backgroundColor: theme.colors.surface }}
                        >
                            {/* Title: "System Requirements" */}
                            {/* Styled as semibold text with larger font size and primary text color */}
                            <Text
                                className="text-[16px] font-semibold mb-2"
                                style={{ color: theme.colors.text }}
                            >
                                System Requirements
                            </Text>
                            {/* Requirements List: Vertically stacked list with equal spacing between items */}
                            <View className="gap-2">
                                {/* Requirement Item 1: iPhone Compatibility */}
                                {/* Bullet point specifying minimum iPhone model (iPhone 15 Pro) */}
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • iPhone 15 Pro or later
                                </Text>
                                {/* Requirement Item 2: iPad Compatibility */}
                                {/* Bullet point specifying minimum iPad processor generation (M1) */}
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • iPad with M1 chip or later
                                </Text>
                                {/* Requirement Item 3: Mac Compatibility */}
                                {/* Bullet point specifying minimum Mac processor generation (M1) */}
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • Mac with M1 chip or later
                                </Text>
                                {/* Requirement Item 4: OS Version Requirement */}
                                {/* Bullet point specifying latest operating system requirement */}
                                <Text
                                    className="text-[14px] leading-[20px]"
                                    style={{ color: theme.colors.text }}
                                >
                                    • Latest iOS, iPadOS, or macOS
                                </Text>
                            </View>
                        </View>
                        {/* Bottom Spacing: Small vertical spacer for padding at end of scroll content */}
                        <View className="h-4" />
                    </ScrollView>
                </Suspense>
            </SafeAreaView>
        </View>
    );
}
