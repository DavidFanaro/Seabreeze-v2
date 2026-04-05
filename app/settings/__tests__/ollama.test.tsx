import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, waitFor } from "@testing-library/react-native";
import React from "react";

import OllamaSettings from "../ollama";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const mockSetSelectedModel = jest.fn();
const mockSetAvailableModels = jest.fn();
const mockSetOllamaUrl = jest.fn();
const mockProviderSettingsScreen = jest.fn();
const mockTestProviderConnection = jest.fn();
const mockFetchOllamaModels = jest.fn();

let mockAvailableModels: { ollama: string[] } = { ollama: [] };
let mockOllamaUrl = "http://localhost:11434";

jest.mock("@/components/settings/ProviderSettingsScreen", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, TextInput, View } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    ProviderSettingsScreen: (props: any) => {
      mockProviderSettingsScreen(props);
      return (
        <View>
          <TextInput testID="provider-input" value={props.inputValue} onChangeText={props.onChangeText} />
          <Text>{props.providerId}</Text>
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
    selectedModel: null,
    setSelectedModel: mockSetSelectedModel,
    availableModels: mockAvailableModels,
    setAvailableModels: mockSetAvailableModels,
  }),
  useAuthStore: () => ({
    ollamaUrl: mockOllamaUrl,
    setOllamaUrl: mockSetOllamaUrl,
  }),
}));

jest.mock("@/providers/provider-factory", () => ({
  testProviderConnection: (...args: any[]) => mockTestProviderConnection(...args),
}));

jest.mock("@/providers/ollama-provider", () => ({
  fetchOllamaModels: (...args: any[]) => mockFetchOllamaModels(...args),
}));

jest.mock("@/types/provider.types", () => ({
  OLLAMA_MODELS: [],
}));

describe("OllamaSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAvailableModels = { ollama: [] };
    mockOllamaUrl = "http://localhost:11434";
    (mockTestProviderConnection as any).mockResolvedValue(true);
    (mockFetchOllamaModels as any).mockResolvedValue(["llama3.2", "mistral"]);
  });

  it("passes the expected screen props to the shared provider settings screen", () => {
    renderWithQueryClient(<OllamaSettings />);

    expect(mockProviderSettingsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Ollama",
        providerId: "ollama",
        inputLabel: "Ollama Base URL",
        inputPlaceholder: "http://localhost:11434",
      }),
    );
  });

  it("loads and normalizes models", async () => {
    (mockFetchOllamaModels as any).mockResolvedValue([" llama3.2 ", "mistral", "mistral", "", "   "] as any);

    const { getByTestId, getByText } = renderWithQueryClient(<OllamaSettings />);
    fireEvent.press(getByTestId("action-Load Models"));

    await waitFor(() => {
      expect(mockFetchOllamaModels).toHaveBeenCalledWith("http://localhost:11434");
      expect(mockSetAvailableModels).toHaveBeenCalledWith("ollama", ["llama3.2", "mistral"]);
      expect(getByText("Synced 2 models (2 added, 0 removed).")).toBeTruthy();
    });
  });

  it("shows a validation message for an empty URL before loading models", async () => {
    const { getByTestId, getByText } = renderWithQueryClient(<OllamaSettings />);
    fireEvent.changeText(getByTestId("provider-input"), "   ");
    fireEvent.press(getByTestId("action-Load Models"));

    await waitFor(() => {
      expect(getByText("Please enter an Ollama URL before loading models.")).toBeTruthy();
    });
  });

  it("renders the provider id through the shared provider settings screen", () => {
    const { getByText } = renderWithQueryClient(<OllamaSettings />);
    expect(getByText("ollama")).toBeTruthy();
  });
});
