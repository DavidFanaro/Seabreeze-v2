import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import useChat from '../useChat';

const mockExecuteStreaming = jest.fn();

// Mock all dependencies with simpler mocks
jest.mock('@/hooks/useChatState', () => ({
  useChatState: jest.fn(() => ({
    provider: 'apple',
    model: 'gpt-4',
    isOverridden: false,
    globalProvider: 'apple',
    globalModel: 'gpt-4',
    setOverride: jest.fn(),
    clearOverride: jest.fn(),
    syncFromDatabase: jest.fn(),
    hasOverride: false,
  })),
}));

jest.mock('../useTitleGeneration', () => {
  const mockTitleState = {
    title: 'Test Chat',
    setTitle: jest.fn(),
    generateTitle: jest.fn(async () => 'Generated Title'),
    resetTitle: jest.fn(),
  };

  return {
    useTitleGeneration: jest.fn(() => mockTitleState),
  };
});

jest.mock('../useChatStreaming', () => ({
  useChatStreaming: jest.fn(() => ({
    executeStreaming: (...args: any[]) => mockExecuteStreaming(...args),
    handleStreamingError: jest.fn(),
  })),
}));

jest.mock('@/providers/provider-cache', () => ({
  getCachedModel: jest.fn(() => ({
    provider: 'openai',
    modelId: 'gpt-4',
  })),
}));

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteStreaming.mockImplementation(async (options: any) => {
      const onThinkingChunk = options?.onThinkingChunk as ((chunk: string, accumulated: string) => void) | undefined;
      onThinkingChunk?.('Thinking', 'Thinking');
      return {
        success: true,
        shouldRetryWithFallback: false,
        accumulated: 'Test response',
      };
    });
  });

  describe('basic functionality', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useChat({}));

      expect(result.current.text).toBe('');
      expect(result.current.messages).toEqual([]);
      expect(result.current.thinkingOutput).toEqual([]);
      expect(result.current.isThinking).toBe(false);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.title).toBe('Test Chat');
      expect(result.current.currentProvider).toBe('apple');
      expect(result.current.currentModel).toBe('system-default'); // Default when no chatId
      expect(result.current.isUsingFallback).toBe(false);
      expect(result.current.canRetry).toBe(false);
    });

    it('should initialize with provided initial text', () => {
      const { result } = renderHook(() => useChat({ initialText: 'Hello' }));

      expect(result.current.text).toBe('Hello');
    });

    it('should update text when setText is called', () => {
      const { result } = renderHook(() => useChat({}));

      act(() => {
        result.current.setText('New text');
      });

      expect(result.current.text).toBe('New text');
    });

    it('should not send empty message', async () => {
      const { result } = renderHook(() => useChat({}));

      await act(async () => {
        await result.current.sendMessage('');
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.isStreaming).toBe(false);
    });

    it('should not send whitespace-only message', async () => {
      const { result } = renderHook(() => useChat({}));

      act(() => {
        result.current.setText('   \n\t  ');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe('message sending', () => {
    it('should send message and add to history', async () => {
      const { result } = renderHook(() => useChat({}));

      act(() => {
        result.current.setText('Hello, world!');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]).toEqual({
        role: 'user',
        content: 'Hello, world!',
      });
      expect(result.current.messages[1]).toEqual({
        role: 'assistant',
        content: '...',
      });
      expect(result.current.thinkingOutput).toEqual(['', 'Thinking']);
      expect(result.current.text).toBe('');
      expect(result.current.isThinking).toBe(false);
      expect(result.current.isStreaming).toBe(false); // Streaming completes after act
    });

    it('should set isThinking while reasoning streams', async () => {
      let resolveStreaming: (() => void) | null = null;
      mockExecuteStreaming.mockImplementation(async (options: any) => {
        const onThinkingChunk = options?.onThinkingChunk as ((chunk: string, accumulated: string) => void) | undefined;
        onThinkingChunk?.('Thinking', 'Thinking');
        await new Promise<void>((resolve) => {
          resolveStreaming = resolve;
        });
        return {
          success: true,
          shouldRetryWithFallback: false,
          accumulated: 'Test response',
        };
      });

      const { result } = renderHook(() => useChat({}));

      act(() => {
        result.current.setText('Hello, world!');
      });

      let sendPromise = Promise.resolve();
      act(() => {
        sendPromise = result.current.sendMessage();
      });

      expect(result.current.isThinking).toBe(true);

      await act(async () => {
        resolveStreaming?.();
        await sendPromise;
      });

      expect(result.current.isThinking).toBe(false);
    });

    it('should skip placeholder text when disabled', async () => {
      const { result } = renderHook(() => useChat({ placeholder: false }));

      act(() => {
        result.current.setText('Hello, world!');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]).toEqual({
        role: 'assistant',
        content: '',
      });
    });

    it('should handle message with override text', async () => {
      const { result } = renderHook(() => useChat({}));

      act(() => {
        result.current.setText('Original text');
      });

      await act(async () => {
        await result.current.sendMessage('Override text');
      });

      expect(result.current.messages[0]).toEqual({
        role: 'user',
        content: 'Override text',
      });
      expect(result.current.text).toBe('Original text'); // Should not clear when using override
    });
  });

  describe('state management', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useChat({}));

      // Modify some state
      act(() => {
        result.current.setText('Some text');
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.text).toBe('');
      expect(result.current.messages).toEqual([]);
      expect(result.current.thinkingOutput).toEqual([]);
      expect(result.current.isThinking).toBe(false);
      expect(result.current.isUsingFallback).toBe(false);
      expect(result.current.canRetry).toBe(false);
    });

    it('should not throw when cancel is called', () => {
      const { result } = renderHook(() => useChat({}));

      expect(() => result.current.cancel()).not.toThrow();
    });
  });

  describe('provider configuration', () => {
    it('should use legacy provider when no chatId provided', () => {
      const { result } = renderHook(() => useChat({
        providerId: 'openai' as any,
        modelId: 'gpt-3.5',
      }));

      expect(result.current.currentProvider).toBe('openai');
      expect(result.current.currentModel).toBe('gpt-3.5');
    });

    it('should use chat state when chatId is provided', () => {
      const { result } = renderHook(() => useChat({
        chatId: '123',
        providerId: 'openai' as any, // Should be ignored
        modelId: 'gpt-3.5',        // Should be ignored
      }));

      expect(result.current.currentProvider).toBe('apple');
      expect(result.current.currentModel).toBe('gpt-4');
    });
  });

  describe('title functionality', () => {
    it('should update title when setTitle is called', () => {
      const { result } = renderHook(() => useChat({}));

      act(() => {
        result.current.setTitle('New Title');
      });

      const { useTitleGeneration } = require('../useTitleGeneration');
      expect(useTitleGeneration().setTitle).toHaveBeenCalledWith('New Title');
    });

    it('should generate title when generateTitle is called', async () => {
      const { result } = renderHook(() => useChat({}));

      await act(async () => {
        const title = await result.current.generateTitle();
        expect(title).toBe('Generated Title');
      });

      const { useTitleGeneration } = require('../useTitleGeneration');
      expect(useTitleGeneration().generateTitle).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle non-string input gracefully', async () => {
      const { result } = renderHook(() => useChat({}));

      await act(async () => {
        await result.current.sendMessage(123 as any);
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.isStreaming).toBe(false);
    });
  });
});
