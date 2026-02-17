/**
 * @file app/settings/apple.tsx
 * @purpose Informational screen for Apple Intelligence provider.
 */

import { router, Stack } from "expo-router";
import * as React from "react";
import { View, Text, SafeAreaView, ScrollView, StyleSheet } from "react-native";
import { Suspense } from "react";
import { useTheme, IconButton } from "@/components";

const FEATURES = [
  "Writing Tools: Rewriting, summarizing, and composing text",
  "Image Recognition: Identifying objects and text in images",
  "Siri Integration: Enhanced Siri capabilities",
  "On-Device Processing: All data stays on your device",
];

const REQUIREMENTS = [
  "iPhone 15 Pro or later",
  "iPad with M1 chip or later",
  "Mac with M1 chip or later",
  "Latest iOS, iPadOS, or macOS",
];

interface InfoListProps {
  items: string[];
  accentColor: string;
  textColor: string;
}

const InfoList: React.FC<InfoListProps> = ({ items, accentColor, textColor }) => (
  <View className="gap-2">
    {items.map((item, i) => (
      <View key={i} className="flex-row items-start gap-2.5">
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: accentColor,
            marginTop: 8,
            flexShrink: 0,
          }}
        />
        <Text
          className="flex-1 text-[14px] leading-[21px]"
          style={{ color: textColor }}
        >
          {item}
        </Text>
      </View>
    ))}
  </View>
);

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
            {/* Single card with hairline dividers between sections */}
            <View
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {/* ── About ──────────────────────────────────────── */}
              <View className="px-4 pt-4 pb-4">
                <Text
                  className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                  style={{ color: theme.colors.textSecondary }}
                >
                  About
                </Text>
                <Text
                  className="text-[14px] leading-[21px]"
                  style={{ color: theme.colors.text }}
                >
                  Apple Intelligence provides on-device AI capabilities powered
                  by Apple Silicon. It includes writing tools, image recognition,
                  and natural language processing that runs locally on your device
                  for privacy and performance.
                </Text>
              </View>

              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.colors.border,
                  marginHorizontal: 16,
                }}
              />

              {/* ── Features ───────────────────────────────────── */}
              <View className="px-4 pt-4 pb-4">
                <Text
                  className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Features
                </Text>
                <InfoList
                  items={FEATURES}
                  accentColor={theme.colors.accent}
                  textColor={theme.colors.text}
                />
              </View>

              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.colors.border,
                  marginHorizontal: 16,
                }}
              />

              {/* ── Requirements ───────────────────────────────── */}
              <View className="px-4 pt-4 pb-4">
                <Text
                  className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Requirements
                </Text>
                <InfoList
                  items={REQUIREMENTS}
                  accentColor={theme.colors.accent}
                  textColor={theme.colors.text}
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
