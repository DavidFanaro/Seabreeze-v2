import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, Pressable, ScrollView, StyleSheet } from "react-native";
import { Suspense } from "react";
import { IconButton, useTheme } from "@/components";
import { ProviderIcon } from "@/components/ui/ProviderIcons";
import { isProviderConfigured, useProviderStore } from "@/stores";
import { SymbolView } from "expo-symbols";
import type { ProviderId } from "@/types/provider.types";

interface ProviderListItemProps {
  providerId: ProviderId;
  name: string;
  description: string;
  isConfigured: boolean;
  isLast?: boolean;
  selectedModel?: string;
  onPress: () => void;
}

// Provider list item component — displays a single AI provider with configuration status
const ProviderListItem: React.FC<ProviderListItemProps> = ({
  providerId,
  name,
  description,
  isConfigured,
  isLast,
  selectedModel,
  onPress,
}) => {
  const { theme } = useTheme();

  // Accent when configured, muted when not (except PNG icons which are always full-color)
  const iconColor = isConfigured ? theme.colors.accent : theme.colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3.5 px-4"
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.colors.border : theme.colors.surface,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
      })}
    >
      {/* Icon + text */}
      <View className="flex-row items-center flex-1">
        {/* Provider icon — slightly larger rounded container for iOS-icon feel */}
        <View
          className="w-[40px] h-[40px] rounded-xl justify-center items-center mr-3"
          style={{ backgroundColor: theme.colors.background }}
        >
          <ProviderIcon providerId={providerId} size={24} color={iconColor} />
        </View>

        {/* Name, description, active model */}
        <View className="flex-1">
          <Text className="text-[16px] font-semibold mb-0.5" style={{ color: theme.colors.text }}>
            {name}
          </Text>
          <Text className="text-[13px]" style={{ color: theme.colors.textSecondary }}>
            {description}
          </Text>
          {selectedModel && (
            <Text className="text-[12px] mt-0.5" style={{ color: theme.colors.accent }}>
              {selectedModel}
            </Text>
          )}
        </View>
      </View>

      {/* Chevron */}
      <View className="ml-2">
        <SymbolView name="chevron.right" size={18} tintColor={theme.colors.textSecondary} />
      </View>
    </Pressable>
  );
};

// Main settings screen
export default function SettingsIndex() {
  const { theme } = useTheme();
  const { selectedProvider, selectedModel } = useProviderStore();

  const navigateToProvider = (providerId: string) => {
    router.push(`/settings/${providerId}` as any);
  };

  const navigateToAppearance = () => {
    router.push("/settings/appearance" as any);
  };

  const providers: { id: ProviderId; name: string; description: string }[] = [
    { id: "apple", name: "Apple Intelligence", description: "On-device AI powered by Apple Silicon" },
    { id: "openai", name: "OpenAI", description: "ChatGPT and other OpenAI models" },
    { id: "openrouter", name: "OpenRouter", description: "Access to multiple AI providers" },
    { id: "ollama", name: "Ollama", description: "Local AI models via Ollama" },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerTitle: "Settings",
          headerTransparent: true,
          headerTintColor: theme.colors.text,
          headerLeft: () => (
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
          <ScrollView className="flex-1" contentContainerClassName="flex-grow pt-5 px-4">

            {/* ── APPEARANCE ──────────────────────────────────── */}
            <Text
              className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-2"
              style={{ color: theme.colors.textSecondary }}
            >
              General
            </Text>

            <View
              className="rounded-xl overflow-hidden mb-6"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <Pressable
                onPress={navigateToAppearance}
                className="flex-row items-center justify-between py-3.5 px-4"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? theme.colors.border : theme.colors.surface,
                })}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-[40px] h-[40px] rounded-xl justify-center items-center mr-3"
                    style={{ backgroundColor: theme.colors.background }}
                  >
                    <SymbolView name="paintbrush" size={22} tintColor={theme.colors.accent} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-[16px] font-semibold mb-0.5"
                      style={{ color: theme.colors.text }}
                    >
                      Appearance
                    </Text>
                    <Text className="text-[13px]" style={{ color: theme.colors.textSecondary }}>
                      Theme and display settings
                    </Text>
                  </View>
                </View>
                <View className="ml-2">
                  <SymbolView name="chevron.right" size={18} tintColor={theme.colors.textSecondary} />
                </View>
              </Pressable>
            </View>

            {/* ── PROVIDERS ───────────────────────────────────── */}
            <Text
              className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-2"
              style={{ color: theme.colors.textSecondary }}
            >
              Providers
            </Text>

            <View
              className="rounded-xl overflow-hidden mb-6"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {providers.map((provider, index) => (
                <ProviderListItem
                  key={provider.id}
                  providerId={provider.id}
                  name={provider.name}
                  description={provider.description}
                  isConfigured={isProviderConfigured(provider.id)}
                  isLast={index === providers.length - 1}
                  selectedModel={
                    provider.id === selectedProvider ? selectedModel ?? undefined : undefined
                  }
                  onPress={() => navigateToProvider(provider.id)}
                />
              ))}
            </View>

            {/* ── ABOUT ───────────────────────────────────────── */}
            <View
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <Text
                className="text-[15px] font-semibold mb-1.5"
                style={{ color: theme.colors.text }}
              >
                About
              </Text>
              <Text
                className="text-[13px] leading-[19px]"
                style={{ color: theme.colors.textSecondary }}
              >
                Seabreeze v1.0.0{"\n"}
                A modern AI chat interface powered by React Native and Expo.{"\n\n"}
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
