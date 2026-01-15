import { router, Stack } from "expo-router";
import { View, Text, SafeAreaView, Pressable, StyleSheet } from "react-native";
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
      style={({ pressed }) => [
        styles.listItem,
        {
          backgroundColor: pressed
            ? theme.colors.surface
            : theme.colors.background,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.listItemLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <ProviderIcon
            providerId={providerId}
            size={24}
            color={getStatusColor()}
          />
        </View>
        <View style={styles.listItemContent}>
          <Text style={[styles.listItemTitle, { color: theme.colors.text }]}>
            {name}
          </Text>
          <Text
            style={[
              styles.listItemDescription,
              { color: theme.colors.textSecondary },
            ]}
          >
            {description}
          </Text>
          {selectedModel && (
            <Text
              style={[styles.listItemModel, { color: theme.colors.accent }]}
            >
              {selectedModel}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.listItemRight}>
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
      <SafeAreaView style={{ flex: 1 }}>
        <Suspense fallback={<Text>Loading</Text>}>
          <View style={styles.container}>
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                PROVIDERS
              </Text>
              <View
                style={[
                  styles.listContainer,
                  { borderColor: theme.colors.border },
                ]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  listItemDescription: {
    fontSize: 13,
  },
  listItemModel: {
    fontSize: 12,
    marginTop: 4,
  },
  listItemRight: {
    marginLeft: 8,
  },
});
