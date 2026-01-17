import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, Pressable } from "react-native";
import { Suspense } from "react";
import { IconButton, useTheme } from "@/components";
import { ProviderIcon } from "@/components/ui/ProviderIcons";
import { isProviderConfigured } from "@/stores";
import { SymbolView } from "expo-symbols";
import { ProviderId } from "@/types/provider.types";

interface ProviderListItemProps {
  providerId: ProviderId;
  name: string;
  description: string;
  isConfigured: boolean;
  selectedModel?: string;
  onPress: () => void;
}

const ProviderListItem: React.FC<ProviderListItemProps> = ({
  providerId,
  name,
  description,
  isConfigured,
  selectedModel,
  onPress,
}) => {
  const { theme } = useTheme();

  const getStatusColor = () => {
    if (!isConfigured) return theme.colors.textSecondary;
    return theme.colors.accent;
  };

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3.5 px-4 border-b"
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? theme.colors.surface
          : theme.colors.background,
        borderColor: theme.colors.border,
      })}
    >
      <View className="flex-row items-center flex-1">
        <View
          className="w-[40px] h-[40px] rounded-lg justify-center items-center mr-3"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <ProviderIcon
            providerId={providerId}
            size={24}
            color={getStatusColor()}
          />
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-semibold mb-0.5" style={{ color: theme.colors.text }}>
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
              className="text-[12px] mt-1"
              style={{ color: theme.colors.accent }}
            >
              {selectedModel}
            </Text>
          )}
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
  );
};

export default function SettingsIndex() {
  const { theme } = useTheme();

  const navigateToProvider = (providerId: string) => {
    router.navigate(`/settings/${providerId}` as any);
  };

  const navigateToGeneral = () => {
    router.navigate("/settings/general" as any);
  };

  const providers = [
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
      id: "openrouter",
      name: "OpenRouter",
      description: "Access to multiple AI providers",
    },
    {
      id: "ollama",
      name: "Ollama",
      description: "Local AI models via Ollama",
    },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerTitle: "Settings",
          headerTransparent: true,
          headerLeft: () => (
            <IconButton
              icon="xmark"
              onPress={() => router.dismiss()}
              size={24}
              style={{ marginLeft: 6 }}
            />
          ),
          headerRight: () => (
            <IconButton
              icon="gearshape"
              onPress={navigateToGeneral}
              size={24}
              style={{ marginLeft: 6 }}
            />
          ),
        }}
      />
      <SafeAreaView className="flex-1">
        <Suspense fallback={<Text>Loading</Text>}>
          <View className="flex-1 pt-4">
            <View className="mb-6">
              <Text
                className="text-[13px] font-bold uppercase tracking-wide px-4 mb-2"
                style={{ color: theme.colors.textSecondary }}
              >
                PROVIDERS
              </Text>
              <View
                className="border-b"
                style={{ borderColor: theme.colors.border }}
              >
                {providers.map((provider) => (
                  <ProviderListItem
                    key={provider.id}
                    providerId={provider.id as ProviderId}
                    name={provider.name}
                    description={provider.description}
                    isConfigured={isProviderConfigured(provider.id as ProviderId)}
                    onPress={() => navigateToProvider(provider.id)}
                  />
                ))}
              </View>
            </View>
          </View>
        </Suspense>
      </SafeAreaView>
    </View>
  );
}
