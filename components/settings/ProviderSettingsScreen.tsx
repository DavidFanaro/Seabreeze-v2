import { View } from "react-native";

import { type SettingsStatus, SettingsStatusBanner } from "@/components/settings/SettingsStatusBanner";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { ModelListManager } from "@/components/settings/ModelListManager";
import { SettingInput } from "@/components/settings/SettingInput";
import { SaveButton } from "@/components/ui/SaveButton";
import type { ProviderId } from "@/types/provider.types";

interface ProviderSettingsAction {
  title: string;
  onPress: () => void;
  loading?: boolean;
}

interface ProviderSettingsScreenProps {
  title: string;
  providerId: ProviderId;
  inputLabel: string;
  inputValue: string;
  onChangeText: (text: string) => void;
  inputPlaceholder?: string;
  inputSecureTextEntry?: boolean;
  inputAutoCapitalize?: "none" | "sentences" | "words" | "characters";
  predefinedModels: string[];
  dynamicModels?: string[];
  selectedModel: string;
  onModelSelect: (model: string) => void;
  status: SettingsStatus | null;
  actions: ProviderSettingsAction[];
}

export function ProviderSettingsScreen({
  title,
  providerId,
  inputLabel,
  inputValue,
  onChangeText,
  inputPlaceholder,
  inputSecureTextEntry = false,
  inputAutoCapitalize,
  predefinedModels,
  dynamicModels,
  selectedModel,
  onModelSelect,
  status,
  actions,
}: ProviderSettingsScreenProps) {
  return (
    <SettingsScreen
      title={title}
      contentContainerClassName="flex-grow gap-5 pt-5"
      keyboardShouldPersistTaps="handled"
    >
      <SettingInput
        label={inputLabel}
        value={inputValue}
        onChangeText={onChangeText}
        placeholder={inputPlaceholder}
        secureTextEntry={inputSecureTextEntry}
        autoCapitalize={inputAutoCapitalize}
      />

      <View className="mt-4">
        <ModelListManager
          providerId={providerId}
          predefinedModels={predefinedModels}
          dynamicModels={dynamicModels}
          selectedModel={selectedModel}
          onModelSelect={onModelSelect}
        />
      </View>

      <View className="min-h-2 flex-1" />

      <SettingsStatusBanner status={status} />

      <View className={`px-4 ${actions.length > 1 ? "flex-row gap-2" : ""}`}>
        {actions.map((action) => (
          <View key={action.title} className={actions.length > 1 ? "flex-1" : undefined}>
            <SaveButton
              onPress={action.onPress}
              loading={action.loading}
              title={action.title}
            />
          </View>
        ))}
      </View>

      <View className="h-2" />
    </SettingsScreen>
  );
}
