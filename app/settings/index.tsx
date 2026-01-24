import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, Pressable, ScrollView } from "react-native";
import { Suspense } from "react";
import { IconButton, useTheme } from "@/components";
import { ProviderIcon } from "@/components/ui/ProviderIcons";
import { isProviderConfigured } from "@/stores";
import { SymbolView } from "expo-symbols";
import type { ProviderId } from "@/types/provider.types";

interface ProviderListItemProps {
  providerId: ProviderId;
  name: string;
  description: string;
  isConfigured: boolean;
  selectedModel?: string;
  onPress: () => void;
}

// Provider list item component - displays a single AI provider with configuration status
const ProviderListItem: React.FC<ProviderListItemProps> = ({
  providerId,
  name,
  description,
  isConfigured,
  selectedModel,
  onPress,
}) => {
  const { theme } = useTheme();

  // Determine icon color based on provider configuration status
  // Unconfigured providers show secondary text color, configured providers show accent color
  const getStatusColor = () => {
    if (!isConfigured) return theme.colors.textSecondary;
    return theme.colors.accent;
  };

  return (
    // Pressable container for the entire provider list item
    // Provides press feedback and navigation to provider settings
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
      {/* Left content section: icon + provider information */}
      <View className="flex-row items-center flex-1">
        {/* Provider icon container with rounded background */}
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
        
        {/* Provider information section containing name, description, and optional selected model */}
        <View className="flex-1">
          {/* Provider name label displayed in bold */}
          <Text className="text-[16px] font-semibold mb-0.5" style={{ color: theme.colors.text }}>
            {name}
          </Text>
          
          {/* Provider description label (e.g., "ChatGPT and other OpenAI models") */}
          <Text
            className="text-[13px]"
            style={{ color: theme.colors.textSecondary }}
          >
            {description}
          </Text>
          
          {/* Selected model indicator displayed when a model is configured for this provider */}
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
      
      {/* Right section: navigation chevron icon indicating this is tappable */}
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

// Main settings screen displaying all configuration options
export default function SettingsIndex() {
  const { theme } = useTheme();

  // Navigate to a specific provider's settings page
  const navigateToProvider = (providerId: string) => {
    router.push(`/settings/${providerId}` as any);
  };

  // Navigate to appearance/theme settings page
  const navigateToAppearance = () => {
    router.push("/settings/appearance" as any);
  };

  // Array of available AI providers with their names and descriptions
  // Used to dynamically render the providers list
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
    // Root container for the settings screen
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      {/* Header configuration: title and close button */}
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
          {/* Scrollable content container for settings sections */}
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow pt-5 px-4"
          >
            {/* APPEARANCE SECTION - Theme and display settings */}
            <Pressable
              onPress={navigateToAppearance}
              className="flex-row items-center justify-between py-3.5 px-4 rounded-lg mb-6"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? theme.colors.border
                  : theme.colors.surface,
              })}
            >
              {/* Appearance section content: icon + labels */}
              <View className="flex-row items-center flex-1">
                {/* Paintbrush icon for appearance settings */}
                <View
                  className="w-[40px] h-[40px] rounded-lg justify-center items-center mr-3"
                  style={{ backgroundColor: theme.colors.background }}
                >
                  <SymbolView
                    name="paintbrush"
                    size={24}
                    tintColor={theme.colors.accent}
                  />
                </View>
                
                {/* Appearance section text content */}
                <View className="flex-1">
                  {/* Section title label */}
                  <Text className="text-[16px] font-semibold mb-0.5" style={{ color: theme.colors.text }}>
                    Appearance
                  </Text>
                  
                  {/* Section description label */}
                  <Text
                    className="text-[13px]"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Theme and display settings
                  </Text>
                </View>
              </View>
              
              {/* Navigation chevron icon */}
              <View className="ml-2">
                <SymbolView
                  name="chevron.right"
                  size={18}
                  tintColor={theme.colors.textSecondary}
                />
              </View>
            </Pressable>

            {/* PROVIDERS SECTION HEADER - Uppercase label for the providers list */}
            <Text
              className="text-[13px] font-bold uppercase tracking-wide px-4 mb-2 mt-6"
              style={{ color: theme.colors.textSecondary }}
            >
              PROVIDERS
            </Text>
            
            {/* PROVIDERS SECTION - Container for all available AI providers */}
            <View
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {/* Dynamically render provider list items for each available provider */}
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

            {/* ABOUT SECTION - Application information and version */}
            <View
              className="p-4 rounded-lg mt-6"
              style={{ backgroundColor: theme.colors.surface }}
            >
              {/* About section title label */}
              <Text
                className="text-[16px] font-semibold mb-2"
                style={{ color: theme.colors.text }}
              >
                About
              </Text>
              
              {/* About section content: version and description */}
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
            
            {/* Bottom spacer for scroll padding */}
            <View className="h-4" />
          </ScrollView>
        </Suspense>
      </SafeAreaView>
    </View>
  );
}
