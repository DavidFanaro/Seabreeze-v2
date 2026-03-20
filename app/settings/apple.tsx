/**
 * @file app/settings/apple.tsx
 * @purpose Informational screen for Apple Intelligence provider.
 */

import * as React from "react";
import { View, Text, StyleSheet } from "react-native";

import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { useTheme } from "@/components/ui/ThemeProvider";

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
    <SettingsScreen title="Apple Intelligence">
      <View
        className="overflow-hidden rounded-xl"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <View className="px-4 pb-4 pt-4">
          <Text
            className="mb-2 text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: theme.colors.textSecondary }}
          >
            About
          </Text>
          <Text className="text-[14px] leading-[21px]" style={{ color: theme.colors.text }}>
            Apple Intelligence provides on-device AI capabilities powered by Apple Silicon. It
            includes writing tools, image recognition, and natural language processing that runs
            locally on your device for privacy and performance.
          </Text>
        </View>

        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.colors.border,
            marginHorizontal: 16,
          }}
        />

        <View className="px-4 pb-4 pt-4">
          <Text
            className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
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

        <View className="px-4 pb-4 pt-4">
          <Text
            className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
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
    </SettingsScreen>
  );
}
