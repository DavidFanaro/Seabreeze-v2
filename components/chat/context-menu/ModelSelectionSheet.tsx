import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ProviderIcon } from "@/components/ui/ProviderIcons";
import { useTheme } from "@/components/ui/ThemeProvider";
import { SymbolView } from "expo-symbols";

import { PROVIDER_IDS, toTestIdFragment } from "./utils";
import { PROVIDERS, type ProviderId } from "@/types/provider.types";

interface ModelSelectionSheetProps {
  sheetProvider: ProviderId;
  visibleModels: string[];
  providerConfigured: boolean;
  onProviderBrowse: (providerId: ProviderId) => void;
  onModelSelect: (providerId: ProviderId, model: string) => void;
  isModelSelected: (providerId: ProviderId, model: string) => boolean;
  dividerColor: string;
}

export function ModelSelectionSheet({
  sheetProvider,
  visibleModels,
  providerConfigured,
  onProviderBrowse,
  onModelSelect,
  isModelSelected,
  dividerColor,
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
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
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
      </View>

      <View style={{ flexDirection: "row", minHeight: 344 }}>
        <View
          style={{
            width: 64,
            paddingLeft: 12,
            paddingRight: 8,
            paddingTop: 2,
            paddingBottom: 8,
            gap: 10,
            borderRightWidth: 0.5,
            borderRightColor: dividerColor,
          }}
        >
          {PROVIDER_IDS.map((providerId) => {
            const isSelected = sheetProvider === providerId;
            const provider = PROVIDERS[providerId];
            return (
              <TouchableOpacity
                key={providerId}
                testID={`chat-toolbar-provider-${providerId}`}
                onPress={() => onProviderBrowse(providerId)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={provider.name}
                accessibilityState={{ selected: isSelected }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected
                    ? `${theme.colors.accent}18`
                    : `${theme.colors.text}08`,
                  borderWidth: 0.5,
                  borderColor: isSelected
                    ? `${theme.colors.accent}66`
                    : "transparent",
                }}
              >
                <ProviderIcon
                  providerId={providerId}
                  size={22}
                  color={
                    isSelected ? theme.colors.accent : theme.colors.textSecondary
                  }
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: providerConfigured ? 12 : 10,
              gap: 5,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 15,
                fontWeight: "600",
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {visibleProvider?.name ?? "Provider"}
            </Text>

            {!providerConfigured ? (
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: 12,
                  lineHeight: 16,
                }}
              >
                {unconfiguredMessage}
              </Text>
            ) : null}
          </View>

          <View style={{ height: 0.5, backgroundColor: dividerColor }} />

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
                    {index > 0 && (
                      <View style={{ height: 0.5, backgroundColor: dividerColor }} />
                    )}
                    <TouchableOpacity
                      testID={`chat-model-option-${toTestIdFragment(model)}`}
                      onPress={() => onModelSelect(sheetProvider, model)}
                      activeOpacity={0.6}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        minHeight: 56,
                        paddingLeft: 16,
                        paddingRight: 14,
                        paddingVertical: 12,
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
                          paddingRight: 12,
                        }}
                        numberOfLines={1}
                      >
                        {model}
                      </Text>
                      <View
                        style={{
                          width: 22,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {selected ? (
                          <SymbolView
                            name="checkmark"
                            size={13}
                            tintColor={theme.colors.accent}
                          />
                        ) : null}
                      </View>
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
        </View>
      </View>
    </>
  );
}
