import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import { useChatStreaming } from '../useChatStreaming';
import { classifyError, getNextFallbackProvider } from '@/providers/fallback-chain';
import { executeWithRetry } from '@/hooks/useErrorRecovery';
import { formatErrorForChat, getErrorFixes, getProviderErrorHint } from '@/lib/error-messages';
import { streamText } from 'ai';
import type { ModelMessage } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { getProviderAuth } from '@/stores';
import type { ProviderId } from '@/types/provider.types';

// Mock all dependencies
jest.mock('@/providers/fallback-chain');
jest.mock('@/hooks/useErrorRecovery');
jest.mock('@/lib/error-messages');
jest.mock('ai');
jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));
jest.mock('@/stores', () => ({
  getProviderAuth: jest.fn(),
}));

describe('useChatStreaming', () => {
  const mockClassifyError = classifyError as jest.MockedFunction<typeof classifyError>;
  const mockGetNextFallbackProvider = getNextFallbackProvider as jest.MockedFunction<typeof getNextFallbackProvider>;
  const mockExecuteWithRetry = executeWithRetry as jest.MockedFunction<typeof executeWithRetry>;
  const mockFormatErrorForChat = formatErrorForChat as jest.MockedFunction<typeof formatErrorForChat>;
  const mockGetErrorFixes = getErrorFixes as jest.MockedFunction<typeof getErrorFixes>;
  const mockGetProviderErrorHint = getProviderErrorHint as jest.MockedFunction<typeof getProviderErrorHint>;
  const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;
  const mockExpoFetch = expoFetch as unknown as jest.MockedFunction<typeof expoFetch>;
  const mockGetProviderAuth = getProviderAuth as jest.MockedFunction<typeof getProviderAuth>;

  // Test data
  const mockModel = {
    model: {} as any,
    provider: 'openai' as ProviderId,
    modelId: 'gpt-5',
    isOriginal: true,
    attemptedProviders: [] as ProviderId[],
  };

  const mockMessages: ModelMessage[] = [
    { role: 'user', content: 'Hello, world!' },
  ];

  let setMessagesMock: jest.Mock;
  let failedProvidersRef: { current: ProviderId[] };

  beforeEach(() => {
    jest.clearAllMocks();
    
    setMessagesMock = jest.fn();
    failedProvidersRef = { current: [] };

    // Default mock implementations
    mockClassifyError.mockReturnValue({
      category: 'server_error',
      isRetryable: true,
      shouldFallback: true,
      message: 'Server error occurred',
    });

    mockExecuteWithRetry.mockResolvedValue({
      success: true,
      attempts: 1,
      shouldFallback: false,
    });

    mockFormatErrorForChat.mockReturnValue('Error occurred');
    mockGetErrorFixes.mockReturnValue(['Try again', 'Switch providers']);
    mockGetProviderErrorHint.mockReturnValue('Check your internet connection');
    mockGetProviderAuth.mockReturnValue({ apiKey: 'test-openrouter-key' } as any);
    mockExpoFetch.mockReset();

    // Mock streaming implementation
    const mockFullStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'reasoning-delta', text: 'Thinking' };
        yield { type: 'text-delta', text: 'Hello' };
        yield { type: 'text-delta', text: ' there' };
        yield { type: 'text-delta', text: '!' };
      },
    };

    mockStreamText.mockReturnValue({
      fullStream: mockFullStream,
    } as any);
  });

  describe('hook initialization', () => {
    it('should return executeStreaming and handleStreamingError functions', () => {
      const { result } = renderHook(() => useChatStreaming());

      expect(result.current.executeStreaming).toBeDefined();
      expect(result.current.handleStreamingError).toBeDefined();
      expect(typeof result.current.executeStreaming).toBe('function');
      expect(typeof result.current.handleStreamingError).toBe('function');
    });
  });

  describe('handleStreamingError', () => {
    it('should trigger fallback when error is fallback-worthy and fallback is enabled', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const mockOnFallback = jest.fn<
        (from: ProviderId, to: ProviderId, reason: string) => void
      >();
      const mockOnProviderChange = jest.fn<
        (providerId: ProviderId, modelId: string, isFallback: boolean) => void
      >();

      mockGetNextFallbackProvider.mockReturnValue({
        provider: 'apple' as ProviderId,
        model: 'gpt-4',
      });

      const errorResult = await act(async () => {
        return await result.current.handleStreamingError(
          new Error('Server error'),
          'openai' as ProviderId,
          true,
          jest.fn(),
          mockOnFallback,
          mockOnProviderChange,
          []
        );
      });

      expect(errorResult.shouldRetry).toBe(true);
      expect(errorResult.nextProvider).toBe('apple');
      expect(errorResult.nextModel).toBe('gpt-4');
      expect(mockOnProviderChange).toHaveBeenCalledWith('apple', 'gpt-4', true);
      expect(mockOnFallback).toHaveBeenCalledWith('openai', 'apple', 'Server error occurred');
    });

    it('should not trigger fallback when fallback is disabled', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const mockOnError = jest.fn();
      const mockOnFallback = jest.fn<
        (from: ProviderId, to: ProviderId, reason: string) => void
      >();

      const errorResult = await act(async () => {
        return await result.current.handleStreamingError(
          new Error('Server error'),
          'openai' as ProviderId,
          false, // fallback disabled
          mockOnError,
          mockOnFallback,
          jest.fn(),
          []
        );
      });

      expect(errorResult.shouldRetry).toBe(false);
      expect(mockOnFallback).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should not trigger fallback when error should not fallback', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const mockOnError = jest.fn();
      const mockOnFallback = jest.fn();

      mockClassifyError.mockReturnValue({
        category: 'configuration',
        isRetryable: false,
        shouldFallback: false,
        message: 'Configuration error',
      });

      const errorResult = await act(async () => {
        return await result.current.handleStreamingError(
          new Error('Config error'),
          'openai' as ProviderId,
          true,
          mockOnError,
          mockOnFallback,
          jest.fn(),
          []
        );
      });

      expect(errorResult.shouldRetry).toBe(false);
      expect(mockOnFallback).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should not trigger fallback when no next provider is available', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const mockOnError = jest.fn();
      const mockOnFallback = jest.fn();

      mockGetNextFallbackProvider.mockReturnValue(null);

      const errorResult = await act(async () => {
        return await result.current.handleStreamingError(
          new Error('Server error'),
          'openai' as ProviderId,
          true,
          mockOnError,
          mockOnFallback,
          jest.fn(),
          []
        );
      });

      expect(errorResult.shouldRetry).toBe(false);
      expect(mockOnFallback).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('executeStreaming', () => {
    const defaultOptions = {
      model: mockModel,
      enableRetry: false,
      retryConfig: {},
      enableFallback: false,
      activeProvider: 'openai' as ProviderId,
      effectiveProviderId: 'openai' as ProviderId,
    };

    it('should stream text successfully when no errors occur', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const mockOnChunk = jest.fn();

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            onChunk: mockOnChunk,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(streamingResult.success).toBe(true);
      expect(streamingResult.shouldRetryWithFallback).toBe(false);
      expect(streamingResult.accumulated).toBe('Hello there!');
      
      // Verify chunk callbacks were called
      expect(mockOnChunk).toHaveBeenCalledTimes(3);
      expect(mockOnChunk).toHaveBeenNthCalledWith(1, 'Hello', 'Hello');
      expect(mockOnChunk).toHaveBeenNthCalledWith(2, ' there', 'Hello there');
      expect(mockOnChunk).toHaveBeenNthCalledWith(3, '!', 'Hello there!');

      // Verify messages were updated
      expect(setMessagesMock).toHaveBeenCalledTimes(3);
    });

    it('preserves existing assistant annotations while streaming updates', async () => {
      const { result } = renderHook(() => useChatStreaming());

      await act(async () => {
        return await result.current.executeStreaming(
          defaultOptions,
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      const firstUpdater = setMessagesMock.mock.calls[0]?.[0] as ((prev: ModelMessage[]) => ModelMessage[]) | undefined;
      expect(typeof firstUpdater).toBe('function');

      const previousAssistantMessage = {
        role: 'assistant',
        content: '',
        annotations: [
          {
            type: 'error',
            error: 'previous error',
            fixes: ['Retry message'],
            source: 'streaming',
          },
        ],
      } as unknown as ModelMessage;

      const nextMessages = firstUpdater!([previousAssistantMessage]);
      const nextAssistantMessage = nextMessages[0] as ModelMessage & {
        annotations?: Array<{ type?: string; error?: string; source?: string }>;
      };

      expect(nextAssistantMessage.content).toBe('Hello');
      expect(nextAssistantMessage.annotations).toEqual([
        expect.objectContaining({
          type: 'error',
          error: 'previous error',
          source: 'streaming',
        }),
      ]);
    });

    it('emits lifecycle callbacks through successful stream completion', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const lifecycleEvents: string[] = [];

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            onChunkReceived: () => lifecycleEvents.push('chunk'),
            onDoneSignalReceived: () => lifecycleEvents.push('done'),
            onStreamCompleted: () => lifecycleEvents.push('completed'),
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(lifecycleEvents).toEqual([
        'chunk',
        'chunk',
        'chunk',
        'done',
        'completed',
      ]);
    });

    it('should stream reasoning chunks when provided', async () => {
      const { result } = renderHook(() => useChatStreaming());

      const mockOnThinkingChunk = jest.fn();

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            onThinkingChunk: mockOnThinkingChunk,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(mockOnThinkingChunk).toHaveBeenCalledTimes(1);
      expect(mockOnThinkingChunk).toHaveBeenCalledWith('Thinking', 'Thinking');
    });

    it('should pass thinking level as provider options', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const mockOnThinkingChunk = jest.fn();

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            thinkingLevel: 'high',
            onThinkingChunk: mockOnThinkingChunk,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            openai: {
              reasoningEffort: 'high',
              reasoningSummary: 'auto',
            },
          },
        })
      );
    });

    it('should pass OpenRouter reasoning options when thinking is enabled', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const mockOnThinkingChunk = jest.fn();

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            model: {
              ...mockModel,
              provider: 'openrouter' as ProviderId,
              modelId: 'openai/gpt-5',
            },
            activeProvider: 'openrouter' as ProviderId,
            effectiveProviderId: 'openrouter' as ProviderId,
            thinkingLevel: 'high',
            onThinkingChunk: mockOnThinkingChunk,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            openrouter: {
              includeReasoning: true,
              reasoning: {
                effort: 'high',
              },
            },
          },
        })
      );
    });

    it('uses OpenRouter video transport for video file messages', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const mockOnChunk = jest.fn();
      const mockOnThinkingChunk = jest.fn();

      const videoMessages: ModelMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file',
              data: 'ZmlsZS1iYXNlNjQ=',
              mediaType: 'video/mp4',
              filename: 'clip.mp4',
            },
          ] as any,
        },
      ];

      const encoder = new TextEncoder();
      const streamChunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"},"finish_reason":"stop"}]}\n\n',
        'data: [DONE]\n\n',
      ];
      let chunkIndex = 0;

      mockExpoFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: async () => {
              if (chunkIndex >= streamChunks.length) {
                return { done: true, value: undefined };
              }

              const value = encoder.encode(streamChunks[chunkIndex]);
              chunkIndex += 1;
              return { done: false, value };
            },
          }),
        },
      } as any);

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            model: {
              ...mockModel,
              provider: 'openrouter' as ProviderId,
              modelId: 'google/gemini-2.5-flash',
            },
            activeProvider: 'openrouter' as ProviderId,
            effectiveProviderId: 'openrouter' as ProviderId,
            thinkingLevel: 'high',
            onChunk: mockOnChunk,
            onThinkingChunk: mockOnThinkingChunk,
          },
          videoMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(mockExpoFetch).toHaveBeenCalledTimes(1);
      expect(mockStreamText).not.toHaveBeenCalled();

      const [fetchUrl, fetchInit] = mockExpoFetch.mock.calls[0] as [string, RequestInit];
      expect(fetchUrl).toBe('https://openrouter.ai/api/v1/chat/completions');

      const requestBody = JSON.parse(String(fetchInit.body)) as {
        messages: Array<{ content: Array<{ type: string; video_url?: { url?: string } }> }>;
      };

      expect(requestBody.messages[0].content[0]).toEqual(
        expect.objectContaining({
          type: 'video_url',
          video_url: {
            url: 'data:video/mp4;base64,ZmlsZS1iYXNlNjQ=',
          },
        })
      );

      expect(mockOnThinkingChunk).not.toHaveBeenCalled();
      expect(mockOnChunk).toHaveBeenNthCalledWith(1, 'Hello', 'Hello');
      expect(mockOnChunk).toHaveBeenNthCalledWith(2, ' world', 'Hello world');
      expect(streamingResult.success).toBe(true);
      expect(streamingResult.accumulated).toBe('Hello world');
    });

    it('should pass Ollama think options when thinking is enabled', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const mockOnThinkingChunk = jest.fn();

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            model: {
              ...mockModel,
              provider: 'ollama' as ProviderId,
              modelId: 'gpt-oss:20b',
            },
            activeProvider: 'ollama' as ProviderId,
            effectiveProviderId: 'ollama' as ProviderId,
            thinkingLevel: 'high',
            onThinkingChunk: mockOnThinkingChunk,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            ollama: {
              think: true,
            },
          },
        })
      );
      expect(mockOnThinkingChunk).toHaveBeenCalledWith('Thinking', 'Thinking');
    });

    it('should handle Ollama reasoning delta format', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const mockOnThinkingChunk = jest.fn();

      const mockFullStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'reasoning-delta', delta: 'Inner reasoning' };
          yield { type: 'text-delta', text: 'Done' };
        },
      };

      mockStreamText.mockReturnValue({
        fullStream: mockFullStream,
      } as any);

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            model: {
              ...mockModel,
              provider: 'ollama' as ProviderId,
              modelId: 'gpt-oss:20b',
            },
            activeProvider: 'ollama' as ProviderId,
            effectiveProviderId: 'ollama' as ProviderId,
            onThinkingChunk: mockOnThinkingChunk,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(mockOnThinkingChunk).toHaveBeenCalledWith('Inner reasoning', 'Inner reasoning');
    });

    it('should skip thinking options for non-thinking models', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const mockOnThinkingChunk = jest.fn();

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            model: {
              ...mockModel,
              modelId: 'gpt-3.5-turbo',
            },
            thinkingLevel: 'high',
            onThinkingChunk: mockOnThinkingChunk,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: undefined,
        })
      );
      expect(mockOnThinkingChunk).not.toHaveBeenCalled();
    });

    it('should handle streaming with retry when enabled and retry fails', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const mockOnError = jest.fn();
      const mockOnFallback = jest.fn();
      const mockOnProviderChange = jest.fn();

      mockExecuteWithRetry.mockResolvedValue({
        success: false,
        attempts: 3,
        shouldFallback: true,
        error: {
          category: 'server_error',
          isRetryable: true,
          shouldFallback: true,
          message: 'Retry failed',
        },
      });

      mockGetNextFallbackProvider.mockReturnValue({
        provider: 'apple' as ProviderId,
        model: 'gpt-4',
      });

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            enableRetry: true,
            enableFallback: true,
            onError: mockOnError,
            onFallback: mockOnFallback,
            onProviderChange: mockOnProviderChange,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(streamingResult.success).toBe(false);
      expect(streamingResult.shouldRetryWithFallback).toBe(true);
      expect(streamingResult.nextProvider).toBe('apple');
      expect(streamingResult.nextModel).toBe('gpt-4');
      expect(failedProvidersRef.current).toContain('openai');
      expect(mockOnProviderChange).toHaveBeenCalledWith('apple', 'gpt-4', true);
      expect(mockOnFallback).toHaveBeenCalledWith('openai', 'apple', 'Server error occurred');
    });

    it('surfaces timeout-triggered fallback target for authoritative retry branch', async () => {
      const { result } = renderHook(() => useChatStreaming());

      mockClassifyError.mockReturnValue({
        category: 'timeout',
        isRetryable: true,
        shouldFallback: true,
        message: 'Request timed out',
      });

      mockExecuteWithRetry.mockResolvedValue({
        success: false,
        attempts: 2,
        shouldFallback: true,
        error: {
          category: 'timeout',
          isRetryable: true,
          shouldFallback: true,
          message: 'Request timed out',
        },
      });

      mockGetNextFallbackProvider.mockReturnValue({
        provider: 'openrouter' as ProviderId,
        model: 'openai/gpt-5',
      });

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            enableRetry: true,
            enableFallback: true,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(streamingResult.success).toBe(false);
      expect(streamingResult.shouldRetryWithFallback).toBe(true);
      expect(streamingResult.nextProvider).toBe('openrouter');
      expect(streamingResult.nextModel).toBe('openai/gpt-5');
      expect(failedProvidersRef.current).toContain('openai');
    });

    it('ignores stale retry-failure fallback branch when mutation gate is closed', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const onFallback = jest.fn();
      const onProviderChange = jest.fn();

      mockExecuteWithRetry.mockResolvedValue({
        success: false,
        attempts: 2,
        shouldFallback: true,
        error: {
          category: 'timeout',
          isRetryable: true,
          shouldFallback: true,
          message: 'timed out',
        },
      });

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            enableRetry: true,
            enableFallback: true,
            canMutateState: () => false,
            onFallback,
            onProviderChange,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(streamingResult.success).toBe(true);
      expect(streamingResult.shouldRetryWithFallback).toBe(false);
      expect(streamingResult.nextProvider).toBeUndefined();
      expect(streamingResult.nextModel).toBeUndefined();
      expect(onFallback).not.toHaveBeenCalled();
      expect(onProviderChange).not.toHaveBeenCalled();
      expect(failedProvidersRef.current).toEqual([]);
    });

    it('should handle streaming with retry when no fallback available', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const mockOnError = jest.fn();

      // Mock retry failure that should trigger error handling
      mockExecuteWithRetry.mockResolvedValue({
        success: false,
        attempts: 3,
        shouldFallback: true,
        error: {
          category: 'server_error',
          isRetryable: true,
          shouldFallback: true,
          message: 'Retry failed',
        },
      });

      // No fallback provider available
      mockGetNextFallbackProvider.mockReturnValue(null);

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            enableRetry: true,
            enableFallback: true,
            onError: mockOnError,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      // When no fallback available and shouldFallback is true, but getNextFallbackProvider returns null
      // the hook should set shouldRetryWithFallback to false and success to true
      expect(streamingResult.success).toBe(true);
      expect(streamingResult.shouldRetryWithFallback).toBe(false);
    });

    it('annotates assistant message when retry fails and fallback is unavailable', async () => {
      const { result } = renderHook(() => useChatStreaming());

      mockExecuteWithRetry.mockResolvedValue({
        success: false,
        attempts: 2,
        shouldFallback: true,
        error: {
          category: 'server_error',
          isRetryable: true,
          shouldFallback: true,
          message: 'Retry failed hard',
        },
      });
      mockGetNextFallbackProvider.mockReturnValue(null);
      mockFormatErrorForChat.mockReturnValue('Rendered error');
      mockGetErrorFixes.mockReturnValue(['Retry now', 'Switch provider']);
      mockGetProviderErrorHint.mockReturnValue(null);

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            enableRetry: true,
            enableFallback: true,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      const updater = setMessagesMock.mock.calls.at(-1)?.[0] as ((prev: ModelMessage[]) => ModelMessage[]) | undefined;
      expect(typeof updater).toBe('function');

      const nextMessages = updater!([
        { role: 'assistant', content: '' } as ModelMessage,
      ]);

      const annotatedAssistant = nextMessages[0] as ModelMessage & {
        annotations?: Array<{ type?: string; error?: string; source?: string; fixes?: string[] }>;
      };

      expect(annotatedAssistant.content).toBe('Rendered error');
      expect(annotatedAssistant.annotations).toEqual([
        expect.objectContaining({
          type: 'error',
          error: 'Retry failed hard',
          source: 'streaming',
          fixes: ['Retry now', 'Switch provider'],
        }),
      ]);
    });

    it('should handle unexpected errors without retry enabled', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const mockOnError = jest.fn();
      const mockOnFallback = jest.fn();
      const mockOnProviderChange = jest.fn();

      mockStreamText.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockGetNextFallbackProvider.mockReturnValue({
        provider: 'apple' as ProviderId,
        model: 'gpt-4',
      });

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            enableFallback: true,
            onError: mockOnError,
            onFallback: mockOnFallback,
            onProviderChange: mockOnProviderChange,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(streamingResult.success).toBe(false);
      expect(streamingResult.shouldRetryWithFallback).toBe(true);
      expect(failedProvidersRef.current).toContain('openai');
      expect(mockOnProviderChange).toHaveBeenCalledWith('apple', 'gpt-4', true);
      expect(mockOnFallback).toHaveBeenCalledWith('openai', 'apple', 'Server error occurred');
    });

    it('should use custom retry config when provided', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const customRetryConfig = {
        maxRetries: 5,
        baseDelayMs: 2000,
      };

      mockExecuteWithRetry.mockResolvedValue({
        success: true,
        attempts: 1,
        shouldFallback: false,
      });

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            enableRetry: true,
            retryConfig: customRetryConfig,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(mockExecuteWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxRetries: 5,
          baseDelayMs: 2000,
        })
      );
    });

    it('should not modify failed providers when fallback succeeds with new provider', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const initialFailedProviders: ProviderId[] = ['ollama'];
      failedProvidersRef.current = [...initialFailedProviders];

      mockExecuteWithRetry.mockResolvedValue({
        success: false,
        attempts: 1,
        shouldFallback: true,
        error: {
          category: 'server_error',
          isRetryable: true,
          shouldFallback: true,
          message: 'Failed',
        },
      });

      mockGetNextFallbackProvider.mockReturnValue({
        provider: 'apple' as ProviderId,
        model: 'gpt-4',
      });

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            enableRetry: true,
            enableFallback: true,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      // Should add the failed provider to the list
      expect(failedProvidersRef.current).toEqual([...initialFailedProviders, 'openai']);
    });

    it('should work without callbacks when not provided', async () => {
      const { result } = renderHook(() => useChatStreaming());

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          defaultOptions,
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(streamingResult.success).toBe(true);
      expect(streamingResult.shouldRetryWithFallback).toBe(false);
    });

    it('blocks stale chunk updates when canMutateState becomes false', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const mockOnChunk = jest.fn();
      let canMutate = true;

      const mockFullStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'text-delta', text: 'Hello' };
          yield { type: 'text-delta', text: ' stale' };
        },
      };

      mockStreamText.mockReturnValue({
        fullStream: mockFullStream,
      } as any);

      mockOnChunk.mockImplementation(() => {
        canMutate = false;
      });

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            onChunk: mockOnChunk,
            canMutateState: () => canMutate,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(mockOnChunk).toHaveBeenCalledTimes(1);
      expect(setMessagesMock).toHaveBeenCalledTimes(1);
    });

    it('skips late error content updates when mutation gate is closed', async () => {
      const { result } = renderHook(() => useChatStreaming());

      mockStreamText.mockImplementation(() => {
        throw new Error('late stream error');
      });

      await act(async () => {
        await result.current.executeStreaming(
          {
            ...defaultOptions,
            canMutateState: () => false,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(setMessagesMock).toHaveBeenCalledTimes(0);
    });

    it('reports cancellation and avoids updates after abort', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const abortController = new AbortController();

      const mockFullStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'text-delta', text: 'first' };
          yield { type: 'text-delta', text: 'second' };
        },
      };

      mockStreamText.mockReturnValue({
        fullStream: mockFullStream,
      } as any);

      const mockOnChunk = jest.fn(() => {
        abortController.abort();
      });

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            abortSignal: abortController.signal,
            onChunk: mockOnChunk,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(mockOnChunk).toHaveBeenCalledTimes(1);
      expect(setMessagesMock).toHaveBeenCalledTimes(1);
      expect(streamingResult.wasCancelled).toBe(true);
    });

    it('treats finish-step events as stream completion', async () => {
      const { result } = renderHook(() => useChatStreaming());

      const lifecycleEvents: string[] = [];
      const mockFullStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'text-delta', text: 'pong' };
          yield { type: 'finish-step' };
          yield { type: 'text-delta', text: ' ignored' };
        },
      };

      mockStreamText.mockReturnValue({
        fullStream: mockFullStream,
      } as any);

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            onChunkReceived: () => lifecycleEvents.push('chunk'),
            onDoneSignalReceived: () => lifecycleEvents.push('done'),
            onStreamCompleted: () => lifecycleEvents.push('completed'),
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(streamingResult.success).toBe(true);
      expect(streamingResult.accumulated).toBe('pong');
      expect(lifecycleEvents).toEqual(['chunk', 'done', 'completed']);
      expect(setMessagesMock).toHaveBeenCalledTimes(1);
    });

    it('ignores empty stream deltas for chunk-received lifecycle', async () => {
      const { result } = renderHook(() => useChatStreaming());
      const lifecycleEvents: string[] = [];

      const mockFullStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'reasoning-delta', text: '' };
          yield { type: 'text-delta', text: '' };
          yield { type: 'text-delta', text: 'ok' };
          yield { type: 'finish' };
        },
      };

      mockStreamText.mockReturnValue({
        fullStream: mockFullStream,
      } as any);

      await act(async () => {
        return await result.current.executeStreaming(
          {
            ...defaultOptions,
            onChunkReceived: () => lifecycleEvents.push('chunk'),
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(lifecycleEvents).toEqual(['chunk']);
      expect(setMessagesMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle the complete flow from error to fallback', async () => {
      const { result } = renderHook(() => useChatStreaming());
      
      const mockOnError = jest.fn();
      const mockOnFallback = jest.fn();
      const mockOnProviderChange = jest.fn();

      // First attempt fails with retry
      mockExecuteWithRetry.mockResolvedValue({
        success: false,
        attempts: 3,
        shouldFallback: true,
        error: {
          category: 'network',
          isRetryable: true,
          shouldFallback: true,
          message: 'Network timeout',
        },
      });

      mockClassifyError.mockReturnValue({
        category: 'network',
        isRetryable: true,
        shouldFallback: true,
        message: 'Network timeout',
      });

      mockGetNextFallbackProvider.mockReturnValue({
        provider: 'apple' as ProviderId,
        model: 'gpt-4',
      });

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          {
            model: mockModel,
            enableRetry: true,
            enableFallback: true,
            retryConfig: {},
            activeProvider: 'openai' as ProviderId,
            effectiveProviderId: 'openai' as ProviderId,
            onError: mockOnError,
            onFallback: mockOnFallback,
            onProviderChange: mockOnProviderChange,
          },
          mockMessages,
          setMessagesMock,
          0,
          failedProvidersRef
        );
      });

      expect(streamingResult.success).toBe(false);
      expect(streamingResult.shouldRetryWithFallback).toBe(true);
      expect(mockOnFallback).toHaveBeenCalledWith('openai', 'apple', 'Network timeout');
      expect(mockOnProviderChange).toHaveBeenCalledWith('apple', 'gpt-4', true);
      expect(failedProvidersRef.current).toContain('openai');
    });

    it('forwards abortSignal to streamText', async () => {
      const { result } = renderHook(() => useChatStreaming());

      const controller = new AbortController();

      const options = {
        model: mockModel,
        enableRetry: false,
        retryConfig: {},
        enableFallback: false,
        activeProvider: 'openai' as ProviderId,
        effectiveProviderId: 'openai' as ProviderId,
        abortSignal: controller.signal,
      };

      await act(async () => {
        return await result.current.executeStreaming(
          options,
          mockMessages,
          setMessagesMock,
          0,
          { current: [] }
        );
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: controller.signal,
        })
      );
    });

    it('handles abort errors from streamText gracefully without triggering fallback', async () => {
      const { result } = renderHook(() => useChatStreaming());

      const controller = new AbortController();

      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield { type: 'text-delta', text: 'partial' };
          // Simulate abort mid-stream: the SDK throws when aborted
          controller.abort();
          const abortError = new DOMException('The operation was aborted.', 'AbortError');
          throw abortError;
        })(),
      } as any);

      const mockOnError = jest.fn();

      const options = {
        model: mockModel,
        enableRetry: false,
        retryConfig: {},
        enableFallback: false,
        activeProvider: 'openai' as ProviderId,
        effectiveProviderId: 'openai' as ProviderId,
        abortSignal: controller.signal,
        onError: mockOnError,
      };

      const streamingResult = await act(async () => {
        return await result.current.executeStreaming(
          options,
          mockMessages,
          setMessagesMock,
          0,
          { current: [] }
        );
      });

      // Abort should be treated as clean cancellation, not an error.
      expect(streamingResult.wasCancelled).toBe(true);
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });
});
