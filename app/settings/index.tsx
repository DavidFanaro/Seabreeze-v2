import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, Pressable, ScrollView, Switch } from "react-native";
import { Suspense, useState, useEffect } from "react";
import { IconButton, useTheme, GlassButton } from "@/components";
import { ProviderIcon } from "@/components/ui/ProviderIcons";
import { isProviderConfigured } from "@/stores";
import { useSettingsStore } from "@/stores/useSettingsStore";
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
  const { theme, themeMode, setTheme } = useTheme();
  const showCodeLineNumbers = useSettingsStore((state) => state.showCodeLineNumbers);
  const setShowCodeLineNumbers = useSettingsStore((state) => state.setShowCodeLineNumbers);
  const [selectedTheme, setSelectedTheme] = useState(themeMode);

  useEffect(() => {
    setSelectedTheme(themeMode);
  }, [themeMode]);

  const navigateToProvider = (providerId: string) => {
    router.navigate(`/settings/${providerId}` as any);
  };

  const themeOptions = [
    { id: "light", name: "Light", icon: "sun.max" },
    { id: "dark", name: "Dark", icon: "moon" },
    { id: "system", name: "System", icon: "circle.lefthalf.filled" },
  ] as const;

  const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
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
              APPEARANCE
            </Text>

            <View
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {themeOptions.map((option, index) => {
                const isSelected = selectedTheme === option.id;
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
              CHAT
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
                  thumbColor={showCodeLineNumbers ? "#ffffff" : theme.colors.textSecondary}
                />
              </View>
            </View>

            <Text
              className="text-[13px] font-bold uppercase tracking-wide px-4 mb-2 mt-6"
              style={{ color: theme.colors.textSecondary }}
            >
              PROVIDERS
            </Text>
            <View
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: theme.colors.surface }}
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

            <View
              className="p-4 rounded-lg mt-6"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <Text
                className="text-[16px] font-semibold mb-2"
                style={{ color: theme.colors.text }}
              >
                About
              </Text>
              <Text
                className="text-[14px] leading-[20px]"
                style={{ color: theme.colors.textSecondary }}
              >
                Seabreeze v1.0.0
                {"\n"}
                A modern AI chat interface powered by React Native and Expo.
                {"\n\n"}
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
