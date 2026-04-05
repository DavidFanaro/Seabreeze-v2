import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, waitFor } from "@testing-library/react-native";
import React from "react";

import OpenRouterSettings from "../openrouter";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const mockSetSelectedModel = jest.fn();
const mockSetOpenRouterApiKey = jest.fn();
const mockProviderSettingsScreen = jest.fn();
const mockTestProviderConnection = jest.fn();

jest.mock("@/components/settings/ProviderSettingsScreen", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, TextInput, View } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    ProviderSettingsScreen: (props: any) => {
      mockProviderSettingsScreen(props);
      return (
        <View>
          <TextInput testID="provider-input" value={props.inputValue} onChangeText={props.onChangeText} />
          {props.actions.map((action: any) => (
            <Pressable key={action.title} testID={`action-${action.title}`} onPress={action.onPress}>
              <Text>{action.title}</Text>
            </Pressable>
          ))}
          {props.status ? <Text>{props.status.message}</Text> : null}
        </View>
      );
    },
  };
});

jest.mock("@/stores", () => ({
  useProviderStore: () => ({
    selectedModel: "openai/gpt-4o",
    setSelectedModel: mockSetSelectedModel,
  }),
  useAuthStore: () => ({
    openrouterApiKey: "sk-or-test",
    setOpenRouterApiKey: mockSetOpenRouterApiKey,
  }),
}));

jest.mock("@/providers/provider-factory", () => ({
  testProviderConnection: (...args: any[]) => mockTestProviderConnection(...args),
}));

jest.mock("@/types/provider.types", () => ({
  OPENROUTER_MODELS: ["openai/gpt-4o", "openai/gpt-4o-mini"],
}));

describe("OpenRouterSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockTestProviderConnection as any).mockResolvedValue(true);
  });

  it("passes the expected screen props to the shared provider settings screen", () => {
    renderWithQueryClient(<OpenRouterSettings />);

    expect(mockProviderSettingsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "OpenRouter",
        providerId: "openrouter",
        inputLabel: "API Key",
        inputPlaceholder: "sk-or-...",
        selectedModel: "openai/gpt-4o",
      }),
    );
  });

  it("saves the API key and updates the success state", async () => {
    const { getByTestId, getByText } = renderWithQueryClient(<OpenRouterSettings />);

    fireEvent.changeText(getByTestId("provider-input"), "sk-or-updated");
    fireEvent.press(getByTestId("action-Save Settings"));

    await waitFor(() => {
      expect(mockSetOpenRouterApiKey).toHaveBeenCalledWith("sk-or-updated");
      expect(mockTestProviderConnection).toHaveBeenCalledWith("openrouter", { apiKey: "sk-or-updated" });
      expect(getByText("Connected successfully!")).toBeTruthy();
    });
  });
});
