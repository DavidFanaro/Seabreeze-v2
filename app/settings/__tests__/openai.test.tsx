import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import OpenAISettings from "../openai";

const mockSetSelectedModel = jest.fn();
const mockSetOpenAIApiKey = jest.fn();
const mockProviderSettingsScreen = jest.fn();

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return actual;
});

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
    selectedModel: "gpt-4o",
    setSelectedModel: mockSetSelectedModel,
  }),
  useAuthStore: () => ({
    openaiApiKey: "sk-test-key-12345",
    setOpenAIApiKey: mockSetOpenAIApiKey,
  }),
}));

const mockTestProviderConnection = jest.fn();

jest.mock("@/providers/provider-factory", () => ({
  testProviderConnection: (...args: any[]) => mockTestProviderConnection(...args),
}));

jest.mock("@/types/provider.types", () => ({
  OPENAI_MODELS: ["gpt-4o", "gpt-4o-mini"],
}));

describe("OpenAISettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockTestProviderConnection as any).mockResolvedValue(true);
  });

  it("passes the expected screen props to the shared provider settings screen", () => {
    render(<OpenAISettings />);

    expect(mockProviderSettingsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "OpenAI",
        providerId: "openai",
        inputLabel: "API Key",
        inputPlaceholder: "sk-...",
        selectedModel: "gpt-4o",
      }),
    );
  });

  it("saves the API key and updates the success state", async () => {
    const { getByTestId, getByText } = render(<OpenAISettings />);

    fireEvent.changeText(getByTestId("provider-input"), "sk-updated");
    fireEvent.press(getByTestId("action-Save Settings"));

    await waitFor(() => {
      expect(mockSetOpenAIApiKey).toHaveBeenCalledWith("sk-updated");
      expect(mockTestProviderConnection).toHaveBeenCalledWith("openai", { apiKey: "sk-updated" });
      expect(getByText("Connected successfully!")).toBeTruthy();
    });
  });
});
