import { router } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { useTheme } from "@/components/ui/ThemeProvider";
import { ProviderIcon } from "@/components/ui/ProviderIcons";
import { isProviderConfigured, useAuthStore, useProviderStore } from "@/stores";
import { useSettingsStore } from "@/stores/useSettingsStore";
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
  const iconColor = isConfigured
    ? theme.colors.accent
    : theme.colors.textSecondary;

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
          <Text
            className="text-[16px] font-semibold mb-0.5"
            style={{ color: theme.colors.text }}
          >
            {name}
          </Text>
          <Text
            className="text-[13px]"
            style={{ color: theme.colors.textSecondary }}
          >
            {description}
          </Text>
          {selectedModel && (
            <Text
              className="text-[12px] mt-0.5"
              style={{ color: theme.colors.accent }}
            >
              {selectedModel}
            </Text>
          )}
        </View>
      </View>

      {/* Chevron */}
      <View className="ml-2">
        <SymbolView
          name="chevron.right"
          size={18}
          tintColor={theme.colors.textSecondary}
        />
      </View>
    </Pressable>
  );
};

// Main settings screen
export default function SettingsIndex() {
  const { theme } = useTheme();
  const { selectedProvider, selectedModel } = useProviderStore();
  const webSearchEnabled = useSettingsStore((state) => state.webSearchEnabled);
  const searxngUrl = useAuthStore((state) => state.searxngUrl);

  const navigateToProvider = (providerId: string) => {
    router.push(`/settings/${providerId}` as any);
  };

  const navigateToAppearance = () => {
    router.push("/settings/appearance" as any);
  };

  const navigateToSearch = () => {
    router.push("/settings/search" as any);
  };

  const providers: { id: ProviderId; name: string; description: string }[] = [
    {
      id: "apple",
      name: "Apple Intelligence",
      description: "On-device AI powered by Apple Silicon",
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "ChatGPT and other OpenAI models",
    },
    {
      id: "openai-codex",
      name: "OpenAI Codex",
      description: "ChatGPT subscription models through Codex OAuth",
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      description: "Access to multiple AI providers",
    },
    {
      id: "opencode",
      name: "Opencode",
      description: "OpenCode Go curated coding models",
    },
    { id: "ollama", name: "Ollama", description: "Local AI models via Ollama" },
  ];

  return (
    <SettingsScreen title="Settings" closeButtonPosition="left">
      <Text
        className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: theme.colors.textSecondary }}
      >
        General
      </Text>

      <View
        className="mb-6 overflow-hidden rounded-xl"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Pressable
          onPress={navigateToAppearance}
          className="flex-row items-center justify-between px-4 py-3.5"
          style={({ pressed }) => ({
            backgroundColor: pressed
              ? theme.colors.border
              : theme.colors.surface,
          })}
        >
          <View className="flex-1 flex-row items-center">
            <View
              className="mr-3 h-[40px] w-[40px] items-center justify-center rounded-xl"
              style={{ backgroundColor: theme.colors.background }}
            >
              <SymbolView
                name="paintbrush"
                size={22}
                tintColor={theme.colors.accent}
              />
            </View>
            <View className="flex-1">
              <Text
                className="mb-0.5 text-[16px] font-semibold"
                style={{ color: theme.colors.text }}
              >
                Appearance
              </Text>
              <Text
                className="text-[13px]"
                style={{ color: theme.colors.textSecondary }}
              >
                Theme and display settings
              </Text>
            </View>
          </View>
          <View className="ml-2">
            <SymbolView
              name="chevron.right"
              size={18}
              tintColor={theme.colors.textSecondary}
            />
          </View>
        </Pressable>

        <Pressable
          onPress={navigateToSearch}
          className="flex-row items-center justify-between px-4 py-3.5"
          style={({ pressed }) => ({
            backgroundColor: pressed
              ? theme.colors.border
              : theme.colors.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.border,
          })}
        >
          <View className="flex-1 flex-row items-center">
            <View
              className="mr-3 h-[40px] w-[40px] items-center justify-center rounded-xl"
              style={{ backgroundColor: theme.colors.background }}
            >
              <SymbolView
                name="magnifyingglass.circle"
                size={22}
                tintColor={
                  webSearchEnabled
                    ? theme.colors.accent
                    : theme.colors.textSecondary
                }
              />
            </View>
            <View className="flex-1">
              <Text
                className="mb-0.5 text-[16px] font-semibold"
                style={{ color: theme.colors.text }}
              >
                Web Search
              </Text>
              <Text
                className="text-[13px]"
                style={{ color: theme.colors.textSecondary }}
              >
                {webSearchEnabled
                  ? searxngUrl
                    ? "Enabled app-wide with your SearXNG instance"
                    : "Enabled app-wide, but SearXNG is not configured yet"
                  : "Configure SearXNG and app-wide search behavior"}
              </Text>
            </View>
          </View>
          <View className="ml-2">
            <SymbolView
              name="chevron.right"
              size={18}
              tintColor={theme.colors.textSecondary}
            />
          </View>
        </Pressable>
      </View>

      <Text
        className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: theme.colors.textSecondary }}
      >
        Providers
      </Text>

      <View
        className="mb-6 overflow-hidden rounded-xl"
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
              provider.id === selectedProvider
                ? (selectedModel ?? undefined)
                : undefined
            }
            onPress={() => navigateToProvider(provider.id)}
          />
        ))}
      </View>

      <View
        className="rounded-xl p-4"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Text
          className="mb-1.5 text-[15px] font-semibold"
          style={{ color: theme.colors.text }}
        >
          About
        </Text>
        <Text
          className="text-[13px] leading-[19px]"
          style={{ color: theme.colors.textSecondary }}
        >
          Seabreeze v1.0.0{"\n"}A modern AI chat interface powered by React
          Native and Expo.{"\n\n"}
          Built with ❤️ for iOS, Android, and Web.
        </Text>
      </View>

      <View className="h-4" />
    </SettingsScreen>
  );
}
