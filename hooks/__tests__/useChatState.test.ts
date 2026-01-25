import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import { useChatState, getEffectiveProviderModelSync, useChatOverrideStore } from '../useChatState';
import { useProviderStore } from '@/stores/useProviderStore';
import * as SecureStore from 'expo-secure-store';
import type { ChatOverride } from '../useChatState';
import type { ProviderId } from '@/types/provider.types';

// Mock the provider store
jest.mock('@/stores/useProviderStore', () => ({
  useProviderStore: jest.fn(),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Zustand persistence
jest.mock('zustand/middleware', () => ({
  ...jest.requireActual('zustand/middleware'),
  createJSONStorage: jest.fn(() => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

const mockUseProviderStore = useProviderStore as jest.MockedFunction<typeof useProviderStore>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const mockGlobalState = {
  selectedProvider: 'apple' as ProviderId,
  selectedModel: 'system-default',
};

describe('useChatState', () => {
  let setChatOverrideSpy: jest.Mock;
  let clearChatOverrideSpy: jest.Mock;
  let clearAllOverridesSpy: jest.Mock;

  const setupStoreMocks = () => {
    // Create fresh spies
    setChatOverrideSpy = jest.fn();
    clearChatOverrideSpy = jest.fn();
    clearAllOverridesSpy = jest.fn();
    
    // Get current state and replace functions
    const currentState = useChatOverrideStore.getState();
    Object.assign(currentState, {
      overrides: {} as Record<string, ChatOverride>,
      setChatOverride: setChatOverrideSpy,
      clearChatOverride: clearChatOverrideSpy,
      getChatOverride: jest.fn((chatId: string) => {
        const state = useChatOverrideStore.getState();
        return state.overrides[chatId] || null;
      }),
      clearAllOverrides: clearAllOverridesSpy,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up store mocks
    setupStoreMocks();
    
    // Set up default global state
    mockUseProviderStore.mockReturnValue(mockGlobalState);
    
    // Mock secure store to resolve successfully
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue();
    mockSecureStore.deleteItemAsync.mockResolvedValue();
  });

  describe('new chat behavior', () => {
    it('should use global settings for new chat (null)', () => {
      const { result } = renderHook(() => useChatState(null));

      expect(result.current.provider).toBe('apple');
      expect(result.current.model).toBe('system-default');
      expect(result.current.isOverridden).toBe(false);
      expect(result.current.globalProvider).toBe('apple');
      expect(result.current.globalModel).toBe('system-default');
      expect(result.current.hasOverride).toBe(false);
    });

    it('should use global settings for new chat ("new")', () => {
      const { result } = renderHook(() => useChatState('new'));

      expect(result.current.provider).toBe('apple');
      expect(result.current.model).toBe('system-default');
      expect(result.current.isOverridden).toBe(false);
      expect(result.current.hasOverride).toBe(false);
    });

    it('should not allow setting overrides for new chats', () => {
      const { result } = renderHook(() => useChatState('new'));

      act(() => {
        result.current.setOverride('openai', 'gpt-4');
      });

      expect(setChatOverrideSpy).not.toHaveBeenCalled();
    });

    it('should not allow clearing overrides for new chats', () => {
      const { result } = renderHook(() => useChatState('new'));

      act(() => {
        result.current.clearOverride();
      });

      expect(clearChatOverrideSpy).not.toHaveBeenCalled();
    });

    it('should not sync from database for new chats', () => {
      const { result } = renderHook(() => useChatState('new'));

      act(() => {
        result.current.syncFromDatabase('openai', 'gpt-4');
      });

      expect(setChatOverrideSpy).not.toHaveBeenCalled();
    });
  });

  describe('existing chat without overrides', () => {
    it('should use global settings for existing chat with no override', () => {
      const { result } = renderHook(() => useChatState('123'));

      expect(result.current.provider).toBe('apple');
      expect(result.current.model).toBe('system-default');
      expect(result.current.isOverridden).toBe(false);
      expect(result.current.hasOverride).toBe(false);
    });

    it('should update when global provider changes', () => {
      const { result, rerender } = renderHook(() => useChatState('123'));

      expect(result.current.provider).toBe('apple');

      // Update global provider
      mockUseProviderStore.mockReturnValue({
        selectedProvider: 'openai' as ProviderId,
        selectedModel: 'gpt-4',
      });

      rerender();

      expect(result.current.provider).toBe('openai');
      expect(result.current.model).toBe('gpt-4');
      expect(result.current.isOverridden).toBe(false);
    });
  });

  describe('chat overrides', () => {
    beforeEach(() => {
      // Set up initial override state
      const testOverrides: Record<string, ChatOverride> = {
        '123': { provider: 'openai' as ProviderId, model: 'gpt-4' },
      };
      
      const currentState = useChatOverrideStore.getState();
      Object.assign(currentState, {
        overrides: testOverrides,
        setChatOverride: setChatOverrideSpy,
        clearChatOverride: clearChatOverrideSpy,
        getChatOverride: jest.fn((chatId: string) => {
          const state = useChatOverrideStore.getState();
          return state.overrides[chatId] || null;
        }),
        clearAllOverrides: clearAllOverridesSpy,
      });
    });

    it('should use override when it exists', () => {
      const { result } = renderHook(() => useChatState('123'));

      expect(result.current.provider).toBe('openai');
      expect(result.current.model).toBe('gpt-4');
      expect(result.current.isOverridden).toBe(true);
      expect(result.current.globalProvider).toBe('apple');
      expect(result.current.globalModel).toBe('system-default');
      expect(result.current.hasOverride).toBe(true);
    });

    it('should set new override correctly', () => {
      const { result } = renderHook(() => useChatState('456'));

      act(() => {
        result.current.setOverride('openrouter', 'anthropic/claude-sonnet');
      });

      expect(setChatOverrideSpy).toHaveBeenCalledWith('456', 'openrouter', 'anthropic/claude-sonnet');
    });

    it('should clear existing override correctly', () => {
      const { result } = renderHook(() => useChatState('123'));

      act(() => {
        result.current.clearOverride();
      });

      expect(clearChatOverrideSpy).toHaveBeenCalledWith('123');
    });

    it('should sync from database when values differ from global', () => {
      const { result } = renderHook(() => useChatState('456'));

      act(() => {
        result.current.syncFromDatabase('openrouter', 'anthropic/claude-sonnet');
      });

      expect(setChatOverrideSpy).toHaveBeenCalledWith('456', 'openrouter', 'anthropic/claude-sonnet');
    });

    it('should not create override when database values match global', () => {
      const { result } = renderHook(() => useChatState('456'));

      act(() => {
        result.current.syncFromDatabase('apple', 'system-default');
      });

      expect(setChatOverrideSpy).not.toHaveBeenCalled();
    });

    it('should not create override when database values are null', () => {
      const { result } = renderHook(() => useChatState('456'));

      act(() => {
        result.current.syncFromDatabase(null, null);
      });

      expect(setChatOverrideSpy).not.toHaveBeenCalled();
    });
  });

  describe('hasOverride calculation', () => {
    it('should return false when no override exists', () => {
      const { result } = renderHook(() => useChatState('999'));

      expect(result.current.hasOverride).toBe(false);
    });

    it('should return true when override exists', () => {
      const testOverrides: Record<string, ChatOverride> = {
        '999': { provider: 'openai' as ProviderId, model: 'gpt-4' },
      };
      
      const currentState = useChatOverrideStore.getState();
      Object.assign(currentState, {
        overrides: testOverrides,
        setChatOverride: setChatOverrideSpy,
        clearChatOverride: clearChatOverrideSpy,
        getChatOverride: jest.fn((chatId: string) => {
          const state = useChatOverrideStore.getState();
          return state.overrides[chatId] || null;
        }),
        clearAllOverrides: clearAllOverridesSpy,
      });

      const { result } = renderHook(() => useChatState('999'));

      expect(result.current.hasOverride).toBe(true);
    });
  });

  describe('store operations', () => {
    it('should handle multiple overrides correctly', () => {
      const { result: result1 } = renderHook(() => useChatState('123'));
      const { result: result2 } = renderHook(() => useChatState('456'));

      act(() => {
        result1.current.setOverride('openai', 'gpt-4');
        result2.current.setOverride('openrouter', 'anthropic/claude-sonnet');
      });

      expect(setChatOverrideSpy).toHaveBeenCalledTimes(2);
      expect(setChatOverrideSpy).toHaveBeenCalledWith('123', 'openai', 'gpt-4');
      expect(setChatOverrideSpy).toHaveBeenCalledWith('456', 'openrouter', 'anthropic/claude-sonnet');
    });

    it('should clear all overrides correctly', () => {
      act(() => {
        useChatOverrideStore.getState().clearAllOverrides();
      });

      expect(clearAllOverridesSpy).toHaveBeenCalled();
    });
  });
});

describe('getEffectiveProviderModelSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the override store state
    const currentState = useChatOverrideStore.getState();
    Object.assign(currentState, {
      overrides: {} as Record<string, ChatOverride>,
      setChatOverride: jest.fn(),
      clearChatOverride: jest.fn(),
      getChatOverride: jest.fn((chatId: string) => {
        const state = useChatOverrideStore.getState();
        return state.overrides[chatId] || null;
      }),
      clearAllOverrides: jest.fn(),
    });
    
    // Set up default global state for both hook and getState
    mockUseProviderStore.mockReturnValue(mockGlobalState);
    (useProviderStore as any).getState = jest.fn(() => mockGlobalState);
  });

  it('should use global settings for new chat (null)', () => {
    const result = getEffectiveProviderModelSync(null);

    expect(result.provider).toBe('apple');
    expect(result.model).toBe('system-default');
    expect(result.isOverridden).toBe(false);
  });

  it('should use global settings for new chat ("new")', () => {
    const result = getEffectiveProviderModelSync('new');

    expect(result.provider).toBe('apple');
    expect(result.model).toBe('system-default');
    expect(result.isOverridden).toBe(false);
  });

  it('should use global settings for existing chat with no override', () => {
    const result = getEffectiveProviderModelSync('123');

    expect(result.provider).toBe('apple');
    expect(result.model).toBe('system-default');
    expect(result.isOverridden).toBe(false);
  });

  it('should use override when it exists', () => {
    // Set up override in store
    const testOverrides: Record<string, ChatOverride> = {
      '123': { provider: 'openai' as ProviderId, model: 'gpt-4' },
    };
    
    const currentState = useChatOverrideStore.getState();
    Object.assign(currentState, {
      overrides: testOverrides,
      setChatOverride: jest.fn(),
      clearChatOverride: jest.fn(),
      getChatOverride: jest.fn((chatId: string) => {
        const state = useChatOverrideStore.getState();
        return state.overrides[chatId] || null;
      }),
      clearAllOverrides: jest.fn(),
    });

    const result = getEffectiveProviderModelSync('123');

    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4');
    expect(result.isOverridden).toBe(true);
  });

  it('should work outside React context', () => {
    expect(() => {
      getEffectiveProviderModelSync('123');
    }).not.toThrow();
  });
});

describe('error handling', () => {
  it('should handle secure store errors gracefully', async () => {
    mockSecureStore.getItemAsync.mockRejectedValue(new Error('Secure store error'));
    mockSecureStore.setItemAsync.mockRejectedValue(new Error('Secure store error'));
    mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Secure store error'));

    expect(() => {
      renderHook(() => useChatState('123'));
    }).not.toThrow();
  });

  it('should handle missing store state gracefully', () => {
    const setChatOverrideSpy = jest.fn();
    const clearChatOverrideSpy = jest.fn();
    const clearAllOverridesSpy = jest.fn();
    
    // Mock store to return empty state
    const currentState = useChatOverrideStore.getState();
    Object.assign(currentState, {
      overrides: {} as Record<string, ChatOverride>,
      setChatOverride: setChatOverrideSpy,
      clearChatOverride: clearChatOverrideSpy,
      getChatOverride: jest.fn(() => null),
      clearAllOverrides: clearAllOverridesSpy,
    });

    const { result } = renderHook(() => useChatState('123'));

    expect(result.current.provider).toBe('apple');
    expect(result.current.model).toBe('system-default');
    expect(result.current.isOverridden).toBe(false);
  });
});