import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import { SymbolView } from "expo-symbols";

import { SheetDivider } from "./ChatToolbarSheet";
import {
  PROVIDER_IDS,
  getProviderSheetLabel,
  toTestIdFragment,
} from "./utils";
import { PROVIDERS, type ProviderId } from "@/types/provider.types";

interface ModelSelectionSheetProps {
  sheetProvider: ProviderId;
  visibleModels: string[];
  providerConfigured: boolean;
  onProviderBrowse: (providerId: ProviderId) => void;
  onModelSelect: (providerId: ProviderId, model: string) => void;
  isModelSelected: (providerId: ProviderId, model: string) => boolean;
  dividerColor: string;
  cardBg: string;
}

export function ModelSelectionSheet({
  sheetProvider,
  visibleModels,
  providerConfigured,
  onProviderBrowse,
  onModelSelect,
  isModelSelected,
  dividerColor,
  cardBg,
}: ModelSelectionSheetProps) {
  const { theme } = useTheme();
  const visibleProvider = PROVIDERS[sheetProvider];
  const unconfiguredMessage = visibleProvider
    ? `${visibleProvider.name} is not configured. Go to Settings to ${
        visibleProvider.requiresApiKey ? "add your API key" : "finish setup"
      }.`
    : "This provider is not available. Go to Settings and choose a provider again.";

  return (
    <>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 17,
            fontWeight: "600",
            letterSpacing: -0.3,
          }}
        >
          Choose Model
        </Text>

        <View
          style={{
            flexDirection: "row",
            marginTop: 14,
            borderRadius: 12,
            backgroundColor: `${theme.colors.text}0a`,
            padding: 3,
          }}
        >
          {PROVIDER_IDS.map((providerId) => {
            const isSelected = sheetProvider === providerId;
            return (
              <TouchableOpacity
                key={providerId}
                testID={`chat-toolbar-provider-${providerId}`}
                onPress={() => onProviderBrowse(providerId)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: isSelected ? cardBg : "transparent",
                  ...(isSelected
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 2,
                        elevation: 1,
                      }
                    : {}),
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? "600" : "400",
                    color: isSelected
                      ? theme.colors.text
                      : theme.colors.textSecondary,
                    letterSpacing: -0.1,
                  }}
                  numberOfLines={1}
                >
                  {getProviderSheetLabel(providerId)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!providerConfigured ? (
          <Text
            style={{
              color: theme.colors.accent,
              fontSize: 12,
              marginTop: 8,
            }}
          >
            {unconfiguredMessage}
          </Text>
        ) : null}
      </View>

      <SheetDivider color={dividerColor} />

      <ScrollView
        style={{ marginTop: 0 }}
        contentContainerStyle={{ paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
      >
        {visibleModels.length > 0 ? (
          visibleModels.map((model, index) => {
            const selected = isModelSelected(sheetProvider, model);
            return (
              <React.Fragment key={model}>
                {index > 0 && <SheetDivider color={dividerColor} />}
                <TouchableOpacity
                  testID={`chat-model-option-${toTestIdFragment(model)}`}
                  onPress={() => onModelSelect(sheetProvider, model)}
                  activeOpacity={0.6}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: selected
                      ? `${theme.colors.accent}12`
                      : "transparent",
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15.5,
                      fontWeight: selected ? "600" : "400",
                      color: selected
                        ? theme.colors.accent
                        : theme.colors.text,
                      letterSpacing: -0.2,
                    }}
                    numberOfLines={1}
                  >
                    {model}
                  </Text>
                  {selected ? (
                    <SymbolView
                      name="checkmark"
                      size={13}
                      tintColor={theme.colors.accent}
                    />
                  ) : null}
                </TouchableOpacity>
              </React.Fragment>
            );
          })
        ) : (
          <Text
            testID="chat-model-empty-state"
            style={{
              color: theme.colors.textSecondary,
              fontSize: 14,
              paddingHorizontal: 16,
              paddingVertical: 20,
            }}
          >
            No models available for this provider.
          </Text>
        )}
      </ScrollView>
    </>
  );
}
