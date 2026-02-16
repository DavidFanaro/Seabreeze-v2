import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import useChat from '../useChat';

const mockExecuteStreaming = jest.fn();

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
};

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
      options?.onChunkReceived?.();
      const onThinkingChunk = options?.onThinkingChunk as ((chunk: string, accumulated: string) => void) | undefined;
      onThinkingChunk?.('Thinking', 'Thinking');
      options?.onDoneSignalReceived?.();
      options?.onStreamCompleted?.();
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

    it('marks stream lifecycle as completed when streaming succeeds', async () => {
      const { result } = renderHook(() => useChat({}));

      act(() => {
        result.current.setText('complete this stream');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      const [options] = mockExecuteStreaming.mock.calls[0] as [
        {
          onChunkReceived?: () => void;
          onDoneSignalReceived?: () => void;
          onStreamCompleted?: () => void;
        },
      ];

      expect(options.onChunkReceived).toEqual(expect.any(Function));
      expect(options.onDoneSignalReceived).toEqual(expect.any(Function));
      expect(options.onStreamCompleted).toEqual(expect.any(Function));
      expect(result.current.streamState).toBe('completed');
      expect(result.current.isStreaming).toBe(false);
    });

    it('re-enters streaming state for sequential sends in the same chat', async () => {
      const secondSendDeferred = createDeferred<{
        success: boolean;
        shouldRetryWithFallback: boolean;
        accumulated: string;
      }>();

      mockExecuteStreaming
        .mockImplementationOnce(async (options: any) => {
          options?.onChunkReceived?.();
          options?.onDoneSignalReceived?.();
          options?.onStreamCompleted?.();
          return {
            success: true,
            shouldRetryWithFallback: false,
            accumulated: 'first response',
          };
        })
        .mockImplementationOnce(async (options: any) => {
          const result = await secondSendDeferred.promise;
          options?.onDoneSignalReceived?.();
          options?.onStreamCompleted?.();
          return result;
        });

      const { result } = renderHook(() => useChat({}));

      act(() => {
        result.current.setText('first send');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(result.current.streamState).toBe('completed');

      act(() => {
        result.current.setText('second send');
      });

      let secondSend = Promise.resolve();
      act(() => {
        secondSend = result.current.sendMessage();
      });

      expect(result.current.streamState).toBe('streaming');
      expect(result.current.isStreaming).toBe(true);

      await act(async () => {
        secondSendDeferred.resolve({
          success: true,
          shouldRetryWithFallback: false,
          accumulated: 'second response',
        });
        await secondSend;
      });

      expect(result.current.isStreaming).toBe(false);
      expect(mockExecuteStreaming).toHaveBeenCalledTimes(2);
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

    it('should ignore thinking output when disabled', async () => {
      const onThinkingChunk = jest.fn();
      const { result } = renderHook(() => useChat({
        enableThinking: false,
        onThinkingChunk,
      }));

      act(() => {
        result.current.setText('Hello, world!');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(result.current.thinkingOutput).toEqual(['', '']);
      expect(result.current.isThinking).toBe(false);
      expect(onThinkingChunk).not.toHaveBeenCalled();
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

    it('should pass thinking level to streaming options', async () => {
      const { result } = renderHook(() => useChat({ thinkingLevel: 'high' }));

      act(() => {
        result.current.setText('Hello, world!');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(mockExecuteStreaming).toHaveBeenCalled();
      const [options] = mockExecuteStreaming.mock.calls[0] as [{ thinkingLevel?: string }];
      expect(options.thinkingLevel).toBe('high');
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

    it('keeps completion ordering stable under rapid sends', async () => {
      const onComplete = jest.fn();
      const first = createDeferred<{
        success: boolean;
        shouldRetryWithFallback: boolean;
        accumulated: string;
      }>();
      const second = createDeferred<{
        success: boolean;
        shouldRetryWithFallback: boolean;
        accumulated: string;
      }>();

      mockExecuteStreaming
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise);

      const { result } = renderHook(() => useChat({ onComplete }));

      let firstSend = Promise.resolve();
      let secondSend = Promise.resolve();

      act(() => {
        firstSend = result.current.sendMessage('first');
      });

      act(() => {
        secondSend = result.current.sendMessage('second');
      });

      await act(async () => {
        first.resolve({
          success: true,
          shouldRetryWithFallback: false,
          accumulated: 'first-response',
        });
        await firstSend;
      });

      expect(result.current.isStreaming).toBe(true);
      expect(onComplete).toHaveBeenCalledTimes(0);

      await act(async () => {
        second.resolve({
          success: true,
          shouldRetryWithFallback: false,
          accumulated: 'second-response',
        });
        await secondSend;
      });

      expect(result.current.isStreaming).toBe(false);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('prevents post-cancel error mutation from stale stream callbacks', async () => {
      const onError = jest.fn();
      const pending = createDeferred<{
        success: boolean;
        shouldRetryWithFallback: boolean;
        accumulated: string;
      }>();
      let capturedOptions: { onError?: (error: unknown) => void } | null = null;

      mockExecuteStreaming.mockImplementationOnce(async (options: any) => {
        capturedOptions = options;
        return pending.promise;
      });

      const { result } = renderHook(() => useChat({ onError }));

      let sendPromise = Promise.resolve();

      act(() => {
        sendPromise = result.current.sendMessage('cancel-me');
      });

      act(() => {
        result.current.cancel();
      });

      await act(async () => {
        capturedOptions?.onError?.(new Error('late error'));
        pending.resolve({
          success: true,
          shouldRetryWithFallback: false,
          accumulated: '',
        });
        await sendPromise;
      });

      expect(result.current.errorMessage).toBeNull();
      expect(result.current.canRetry).toBe(false);
      expect(onError).toHaveBeenCalledTimes(0);
    });

    it('fails stalled streams with watchdog timeout and enables retry', async () => {
      jest.useFakeTimers();

      try {
        mockExecuteStreaming.mockImplementationOnce(
          async () => new Promise(() => undefined)
        );

        const onError = jest.fn();
        const { result } = renderHook(() => useChat({ onError }));

        let sendPromise = Promise.resolve();
        act(() => {
          sendPromise = result.current.sendMessage('watchdog timeout');
        });

        await act(async () => {
          jest.advanceTimersByTime(46000);
          await sendPromise;
        });

        expect(result.current.isStreaming).toBe(false);
        expect(result.current.canRetry).toBe(true);
        expect(result.current.errorMessage).toContain('timed out');
        expect(onError).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('deduplicates quick retry taps for the same failed operation', async () => {
      mockExecuteStreaming.mockImplementationOnce(async (options: any) => {
        options?.onError?.(new Error('network flap'));
        return {
          success: false,
          shouldRetryWithFallback: false,
          accumulated: '',
        };
      });

      const retryDeferred = createDeferred<{
        success: boolean;
        shouldRetryWithFallback: boolean;
        accumulated: string;
      }>();

      mockExecuteStreaming.mockImplementationOnce(async () => retryDeferred.promise);

      const { result } = renderHook(() => useChat({}));

      await act(async () => {
        await result.current.sendMessage('retry me');
      });

      expect(result.current.canRetry).toBe(true);
      expect(result.current.messages).toHaveLength(2);

      let firstRetry = Promise.resolve();
      let secondRetry = Promise.resolve();

      act(() => {
        firstRetry = result.current.retryLastMessage();
        secondRetry = result.current.retryLastMessage();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockExecuteStreaming).toHaveBeenCalledTimes(2);

      await act(async () => {
        retryDeferred.resolve({
          success: true,
          shouldRetryWithFallback: false,
          accumulated: 'retry ok',
        });

        await Promise.all([firstRetry, secondRetry]);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]).toEqual({
        role: 'user',
        content: 'retry me',
      });
    });

    it('keeps retry state stable when retry is tapped while a retry is inflight', async () => {
      mockExecuteStreaming.mockImplementationOnce(async (options: any) => {
        options?.onError?.(new Error('temporary outage'));
        return {
          success: false,
          shouldRetryWithFallback: false,
          accumulated: '',
        };
      });

      const inflightRetry = createDeferred<{
        success: boolean;
        shouldRetryWithFallback: boolean;
        accumulated: string;
      }>();

      mockExecuteStreaming.mockImplementationOnce(async () => inflightRetry.promise);

      const { result } = renderHook(() => useChat({}));

      await act(async () => {
        await result.current.sendMessage('inflight retry');
      });

      let firstRetry = Promise.resolve();
      let secondRetry = Promise.resolve();

      act(() => {
        firstRetry = result.current.retryLastMessage();
      });

      act(() => {
        secondRetry = result.current.retryLastMessage();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockExecuteStreaming).toHaveBeenCalledTimes(2);

      await act(async () => {
        inflightRetry.resolve({
          success: true,
          shouldRetryWithFallback: false,
          accumulated: 'recovered',
        });

        await Promise.all([firstRetry, secondRetry]);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.canRetry).toBe(false);
    });

    it('recovers from repeated network flap retries without duplicating chat entries', async () => {
      mockExecuteStreaming.mockImplementationOnce(async (options: any) => {
        options?.onError?.(new Error('network flap - initial'));
        return {
          success: false,
          shouldRetryWithFallback: false,
          accumulated: '',
        };
      });

      mockExecuteStreaming.mockImplementationOnce(async (options: any) => {
        options?.onError?.(new Error('network flap - retry'));
        return {
          success: false,
          shouldRetryWithFallback: false,
          accumulated: '',
        };
      });

      mockExecuteStreaming.mockImplementationOnce(async () => ({
        success: true,
        shouldRetryWithFallback: false,
        accumulated: 'eventual success',
      }));

      const { result } = renderHook(() => useChat({}));

      await act(async () => {
        await result.current.sendMessage('flap-safe');
      });

      expect(result.current.canRetry).toBe(true);
      expect(result.current.messages).toHaveLength(2);

      await act(async () => {
        await result.current.retryLastMessage();
      });

      expect(result.current.canRetry).toBe(true);
      expect(result.current.messages).toHaveLength(2);

      await act(async () => {
        await result.current.retryLastMessage();
      });

      expect(result.current.canRetry).toBe(false);
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]).toEqual({
        role: 'user',
        content: 'flap-safe',
      });
    });

    it('retries fallback in a single authoritative pipeline without duplicating user messages', async () => {
      mockExecuteStreaming
        .mockImplementationOnce(async () => ({
          success: false,
          shouldRetryWithFallback: true,
          accumulated: '',
          nextProvider: 'apple',
          nextModel: 'gpt-4',
        }))
        .mockImplementationOnce(async () => ({
          success: true,
          shouldRetryWithFallback: false,
          accumulated: 'fallback success',
        }));

      const { result } = renderHook(() => useChat({
        providerId: 'openai' as any,
        modelId: 'gpt-5',
      }));

      await act(async () => {
        await result.current.sendMessage('fallback me');
      });

      const firstCallOptions = mockExecuteStreaming.mock.calls[0]?.[0] as { activeProvider?: string } | undefined;
      const secondCallOptions = mockExecuteStreaming.mock.calls[1]?.[0] as { activeProvider?: string } | undefined;

      expect(mockExecuteStreaming).toHaveBeenCalledTimes(2);
      expect(firstCallOptions?.activeProvider).toBe('openai');
      expect(secondCallOptions?.activeProvider).toBe('apple');
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]).toEqual({
        role: 'user',
        content: 'fallback me',
      });
      expect(result.current.isStreaming).toBe(false);
    });
  });
});
