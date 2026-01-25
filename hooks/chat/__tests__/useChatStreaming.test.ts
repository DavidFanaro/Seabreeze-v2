import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import { useChatStreaming } from '../useChatStreaming';
import { classifyError, getNextFallbackProvider } from '@/providers/fallback-chain';
import { executeWithRetry } from '@/hooks/useErrorRecovery';
import { formatErrorForChat, getProviderErrorHint } from '@/lib/error-messages';
import { streamText } from 'ai';
import type { ModelMessage } from 'ai';
import type { ProviderId } from '@/types/provider.types';

// Mock all dependencies
jest.mock('@/providers/fallback-chain');
jest.mock('@/hooks/useErrorRecovery');
jest.mock('@/lib/error-messages');
jest.mock('ai');

describe('useChatStreaming', () => {
  const mockClassifyError = classifyError as jest.MockedFunction<typeof classifyError>;
  const mockGetNextFallbackProvider = getNextFallbackProvider as jest.MockedFunction<typeof getNextFallbackProvider>;
  const mockExecuteWithRetry = executeWithRetry as jest.MockedFunction<typeof executeWithRetry>;
  const mockFormatErrorForChat = formatErrorForChat as jest.MockedFunction<typeof formatErrorForChat>;
  const mockGetProviderErrorHint = getProviderErrorHint as jest.MockedFunction<typeof getProviderErrorHint>;
  const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;

  // Test data
  const mockModel = {
    model: {} as any,
    provider: 'openai' as ProviderId,
    modelId: 'gpt-4',
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
    mockGetProviderErrorHint.mockReturnValue('Check your internet connection');

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
      expect(failedProvidersRef.current).toContain('openai');
      expect(mockOnProviderChange).toHaveBeenCalledWith('apple', 'gpt-4', true);
      expect(mockOnFallback).toHaveBeenCalledWith('openai', 'apple', 'Server error occurred');
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
  });
});
