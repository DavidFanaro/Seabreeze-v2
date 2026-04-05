/**
 * @file ChatContextMenu.test.tsx
 * @purpose Focused behavioral coverage for the inline chat toolbar menus
 */

import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { ChatContextMenu } from "../ChatContextMenu";
import { useProviderStore, isProviderConfigured } from "@/stores";
import useHapticFeedback from "@/hooks/useHapticFeedback";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useSettingsStore } from "@/stores/useSettingsStore";

jest.mock("@/stores", () => ({
  useProviderStore: jest.fn(),
  isProviderConfigured: jest.fn(),
}));

jest.mock("@/hooks/useHapticFeedback");
jest.mock("@/components/ui/ThemeProvider");
jest.mock("@/stores/useSettingsStore");

jest.mock("react-native/Libraries/Modal/Modal", () => {
  const React = jest.requireActual("react");

  const MockModal = ({ children, visible }: { children: React.ReactNode; visible: boolean }) => {
    if (!visible) {
      return null;
    }

    return React.createElement(React.Fragment, null, children);
  };

  MockModal.displayName = "MockModal";

  return {
    __esModule: true,
    default: MockModal,
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

jest.mock("expo-symbols", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");

  return {
    SymbolView: ({ name }: { name: string }) => <Text testID={`symbol-${name}`}>{name}</Text>,
  };
});

describe("ChatContextMenu", () => {
  const mockTriggerPress = jest.fn();
  const mockSetSelectedProvider = jest.fn();
  const mockSetSelectedModel = jest.fn();
  const mockOnReset = jest.fn();
  const mockOnRename = jest.fn();
  const mockSetThinkingEnabled = jest.fn();
  const mockSetThinkingLevel = jest.fn();
  const mockSetWebSearchEnabled = jest.fn();

  const mockTheme = {
    colors: {
      background: "#000000",
      surface: "#111111",
      border: "#222222",
      text: "#ffffff",
      textSecondary: "#cccccc",
      accent: "#4f9cf7",
    },
  };

  const providerStore: any = {
    selectedProvider: "apple",
    selectedModel: "system-default",
    customModels: {} as Record<string, string[]>,
    hiddenModels: {} as Record<string, string[]>,
    availableModels: {} as Record<string, string[]>,
    setSelectedProvider: mockSetSelectedProvider,
    setSelectedModel: mockSetSelectedModel,
  };

  const settingsStore: any = {
    thinkingEnabled: true,
    setThinkingEnabled: mockSetThinkingEnabled,
    thinkingLevel: "medium" as const,
    setThinkingLevel: mockSetThinkingLevel,
    webSearchEnabled: false,
    setWebSearchEnabled: mockSetWebSearchEnabled,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    providerStore.selectedProvider = "apple";
    providerStore.selectedModel = "system-default";
    providerStore.customModels = {};
    providerStore.hiddenModels = {};
    providerStore.availableModels = {};

    settingsStore.thinkingEnabled = true;
    settingsStore.thinkingLevel = "medium";
    settingsStore.webSearchEnabled = false;

    (useHapticFeedback as jest.Mock).mockReturnValue({
      triggerPress: mockTriggerPress,
    });

    (useTheme as jest.Mock).mockReturnValue({ theme: mockTheme });
    (useProviderStore as unknown as jest.Mock).mockReturnValue(providerStore);
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector: (state: typeof settingsStore) => unknown) => {
      return selector(settingsStore);
    });
    (isProviderConfigured as jest.Mock).mockReturnValue(true);
  });

  it("renders the inline toolbar triggers", () => {
    render(<ChatContextMenu onReset={mockOnReset} onRename={mockOnRename} />);

    expect(screen.getByTestId("chat-toolbar-model-trigger")).toBeTruthy();
    expect(screen.getByText("Apple Intelligence")).toBeTruthy();
    expect(screen.getByTestId("chat-toolbar-web-toggle")).toBeTruthy();
    expect(screen.getByTestId("chat-toolbar-options-trigger")).toBeTruthy();
  });

  it("toggles web search from the toolbar chip", () => {
    render(<ChatContextMenu onReset={mockOnReset} />);

    fireEvent.press(screen.getByTestId("chat-toolbar-web-toggle"));

    expect(mockTriggerPress).toHaveBeenCalledWith("light");
    expect(mockSetWebSearchEnabled).toHaveBeenCalledWith(true);
  });

  it("opens the model sheet and selects a non-apple model", () => {
    render(<ChatContextMenu onReset={mockOnReset} />);

    fireEvent.press(screen.getByTestId("chat-toolbar-model-trigger"));
    fireEvent.press(screen.getByTestId("chat-toolbar-provider-openai"));
    fireEvent.press(screen.getByTestId("chat-model-option-gpt-5"));

    expect(mockSetSelectedProvider).toHaveBeenCalledWith("openai");
    expect(mockSetSelectedModel).toHaveBeenCalledWith("gpt-5");
  });

  it("stores apple as system-default when selected from the model sheet", () => {
    providerStore.selectedProvider = "openai";
    providerStore.selectedModel = "gpt-5";

    render(<ChatContextMenu onReset={mockOnReset} />);

    fireEvent.press(screen.getByTestId("chat-toolbar-model-trigger"));
    fireEvent.press(screen.getByTestId("chat-toolbar-provider-apple"));
    fireEvent.press(screen.getByTestId("chat-model-option-apple-intelligence"));

    expect(mockSetSelectedProvider).toHaveBeenCalledWith("apple");
    expect(mockSetSelectedModel).toHaveBeenCalledWith("system-default");
  });

  it("shows Apple in the model sheet while keeping Apple Intelligence in the chip", () => {
    render(<ChatContextMenu onReset={mockOnReset} />);

    expect(screen.getByText("Apple Intelligence")).toBeTruthy();

    fireEvent.press(screen.getByTestId("chat-toolbar-model-trigger"));

    expect(
      within(screen.getByTestId("chat-toolbar-provider-apple")).getByText("Apple"),
    ).toBeTruthy();
  });

  it("shows an empty-state message when a provider has no available models", () => {
    providerStore.availableModels = { ollama: [] };

    render(<ChatContextMenu onReset={mockOnReset} />);

    fireEvent.press(screen.getByTestId("chat-toolbar-model-trigger"));
    fireEvent.press(screen.getByTestId("chat-toolbar-provider-ollama"));

    expect(screen.getByTestId("chat-model-empty-state")).toBeTruthy();
  });

  it("opens the options sheet and triggers rename", async () => {
    render(<ChatContextMenu onReset={mockOnReset} onRename={mockOnRename} />);

    fireEvent.press(screen.getByTestId("chat-toolbar-options-trigger"));
    fireEvent.press(screen.getByTestId("chat-toolbar-rename-action"));

    await waitFor(() => {
      expect(mockOnRename).toHaveBeenCalledTimes(1);
    });

    expect(mockTriggerPress).toHaveBeenCalledWith("light");
  });

  it("opens the options sheet and triggers reset", () => {
    render(<ChatContextMenu onReset={mockOnReset} />);

    fireEvent.press(screen.getByTestId("chat-toolbar-options-trigger"));
    fireEvent.press(screen.getByTestId("chat-toolbar-reset-action"));

    expect(mockOnReset).toHaveBeenCalledTimes(1);
    expect(mockTriggerPress).toHaveBeenCalledWith("medium");
  });

  it("toggles thinking output from the options sheet", () => {
    render(<ChatContextMenu onReset={mockOnReset} />);

    fireEvent.press(screen.getByTestId("chat-toolbar-options-trigger"));
    // The thinking toggle is a Switch — fire the valueChange event
    fireEvent(screen.getByTestId("chat-toolbar-thinking-toggle"), "valueChange", false);

    expect(mockSetThinkingEnabled).toHaveBeenCalledWith(false);
  });

  it("shows the thinking level chip in the toolbar for reasoning-capable models", () => {
    providerStore.selectedProvider = "openai";
    providerStore.selectedModel = "gpt-5";
    settingsStore.thinkingLevel = "medium";

    render(<ChatContextMenu onReset={mockOnReset} />);

    const chip = screen.getByTestId("chat-toolbar-thinking-level-chip");
    expect(chip).toBeTruthy();
    expect(screen.getByText("Medium")).toBeTruthy();
  });

  it("cycles thinking level Low→Medium→High→Low on chip press", () => {
    providerStore.selectedProvider = "openai";
    providerStore.selectedModel = "gpt-5";
    settingsStore.thinkingLevel = "low";

    render(<ChatContextMenu onReset={mockOnReset} />);

    fireEvent.press(screen.getByTestId("chat-toolbar-thinking-level-chip"));
    expect(mockSetThinkingLevel).toHaveBeenCalledWith("medium");
  });

  it("hides the thinking level chip for non-reasoning models", () => {
    providerStore.selectedProvider = "apple";
    providerStore.selectedModel = "system-default";

    render(<ChatContextMenu onReset={mockOnReset} />);

    expect(screen.queryByTestId("chat-toolbar-thinking-level-chip")).toBeNull();
  });

  it("shows the Ollama reasoning hint instead of thinking levels for managed models", () => {
    providerStore.selectedProvider = "ollama";
    providerStore.selectedModel = "gpt-oss:20b";

    render(<ChatContextMenu onReset={mockOnReset} />);

    fireEvent.press(screen.getByTestId("chat-toolbar-options-trigger"));

    expect(screen.getByTestId("chat-ollama-thinking-hint")).toBeTruthy();
    expect(screen.queryByTestId("chat-thinking-level-low")).toBeNull();
  });
});
