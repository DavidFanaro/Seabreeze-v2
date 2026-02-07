import { act } from '@testing-library/react-native';

import { useProviderStore } from '@/stores/useProviderStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { resetHydrationRegistryForTests } from '@/stores/hydration-registry';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockSecureStore = jest.requireMock('expo-secure-store') as {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};

const toPersistedValue = (state: Record<string, unknown>): string => {
  return JSON.stringify({ state, version: 0 });
};

const resetProviderStateForHydrationTest = (): void => {
  useProviderStore.setState({
    selectedProvider: 'apple',
    selectedModel: 'system-default',
    __meta: {
      writeVersion: 0,
      hasHydrated: false,
    },
  });
};

const resetSettingsStateForHydrationTest = (): void => {
  useSettingsStore.setState({
    theme: 'dark',
    hapticEnabled: true,
    autoGenerateTitles: true,
    thinkingEnabled: true,
    thinkingLevel: 'medium',
    messageFontSize: 16,
    showCodeLineNumbers: false,
    __meta: {
      writeVersion: 0,
      hasHydrated: false,
    },
  });
};

describe('Hydration mutation guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHydrationRegistryForTests();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
    resetProviderStateForHydrationTest();
    resetSettingsStateForHydrationTest();
  });

  it('applies persisted state on cold start when no runtime mutations exist', async () => {
    mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === 'ai-provider-storage') {
        return toPersistedValue({
          selectedProvider: 'openrouter',
          selectedModel: 'openai/gpt-4o',
          __meta: {
            writeVersion: 2,
          },
        });
      }

      return null;
    });

    await act(async () => {
      await useProviderStore.persist.rehydrate();
    });

    const state = useProviderStore.getState();
    expect(state.selectedProvider).toBe('openrouter');
    expect(state.selectedModel).toBe('openai/gpt-4o');
  });

  it('keeps newer runtime provider writes when hydration finishes later', async () => {
    mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === 'ai-provider-storage') {
        return toPersistedValue({
          selectedProvider: 'openai',
          selectedModel: 'gpt-4o',
          __meta: {
            writeVersion: 0,
          },
        });
      }

      return null;
    });

    act(() => {
      useProviderStore.getState().setSelectedProvider('ollama');
      useProviderStore.getState().setSelectedModel('mistral');
    });

    await act(async () => {
      await useProviderStore.persist.rehydrate();
    });

    const state = useProviderStore.getState();
    expect(state.selectedProvider).toBe('ollama');
    expect(state.selectedModel).toBe('mistral');
  });

  it('preserves simultaneous runtime mutations across provider and settings stores', async () => {
    mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === 'ai-provider-storage') {
        return toPersistedValue({
          selectedProvider: 'openai',
          selectedModel: 'gpt-3.5-turbo',
          __meta: {
            writeVersion: 0,
          },
        });
      }

      if (key === 'settings-storage') {
        return toPersistedValue({
          theme: 'light',
          messageFontSize: 14,
          __meta: {
            writeVersion: 0,
          },
        });
      }

      return null;
    });

    act(() => {
      useProviderStore.getState().setSelectedProvider('openrouter');
      useProviderStore.getState().setSelectedModel('anthropic/claude-sonnet-4-20250514');
      useSettingsStore.getState().setTheme('darcula');
      useSettingsStore.getState().setMessageFontSize(20);
    });

    await act(async () => {
      await Promise.all([
        useProviderStore.persist.rehydrate(),
        useSettingsStore.persist.rehydrate(),
      ]);
    });

    const providerState = useProviderStore.getState();
    const settingsState = useSettingsStore.getState();

    expect(providerState.selectedProvider).toBe('openrouter');
    expect(providerState.selectedModel).toBe('anthropic/claude-sonnet-4-20250514');
    expect(settingsState.theme).toBe('darcula');
    expect(settingsState.messageFontSize).toBe(20);
  });
});
