import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import { useTitleGeneration } from '../useTitleGeneration';

// Mock the ai package
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock the error recovery hook
jest.mock('@/hooks/useErrorRecovery', () => ({
  executeWithRetry: jest.fn(),
  DEFAULT_RETRY_CONFIG: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableCategories: ['network', 'timeout', 'rate_limit'],
  },
}));

// Import the mocked functions
const { generateText } = require('ai');
const { executeWithRetry } = require('@/hooks/useErrorRecovery');

// Mock types
interface Message {
  role: string;
  content: string;
}

interface MockModel {
  provider: string;
  modelId: string;
}

const mockModel: MockModel = {
  provider: 'openai',
  modelId: 'gpt-4',
};

describe('useTitleGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default title "Chat"', () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any)
      );

      expect(result.current.title).toBe('Chat');
    });

    it('should return all required methods and state', () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any)
      );

      expect(typeof result.current.title).toBe('string');
      expect(typeof result.current.setTitle).toBe('function');
      expect(typeof result.current.generateTitle).toBe('function');
      expect(typeof result.current.resetTitle).toBe('function');
    });
  });

  describe('title generation with retry enabled', () => {
    it('should generate title successfully using retry logic', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Tell me about React' },
        { role: 'assistant', content: 'React is a JavaScript library...' }
      ];
      
      executeWithRetry.mockResolvedValue({
        success: true,
        data: 'React Discussion',
        attempts: 1,
        shouldFallback: false,
      });

      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any, true)
      );

      const title = await act(async () => {
        return await result.current.generateTitle();
      });

      expect(title).toBe('React Discussion');
      expect(result.current.title).toBe('React Discussion');
      expect(executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ maxRetries: 2 })
      );
    });

    it('should handle retry failure gracefully', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      
      executeWithRetry.mockResolvedValue({
        success: false,
        error: { 
          category: 'network', 
          isRetryable: true, 
          shouldFallback: true 
        },
        attempts: 2,
        shouldFallback: true,
      });

      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any, true)
      );

      const title = await act(async () => {
        return await result.current.generateTitle();
      });

      expect(title).toBe('');
      expect(result.current.title).toBe('Chat'); // Should remain unchanged
    });

    it('should use custom retry config', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const customRetryConfig = {
        maxRetries: 5,
        baseDelayMs: 2000,
      };
      
      executeWithRetry.mockResolvedValue({
        success: true,
        data: 'Test Title',
        attempts: 1,
        shouldFallback: false,
      });

      const { result } = renderHook(() => 
        useTitleGeneration(
          messages, 
          mockModel as any, 
          true, 
          customRetryConfig
        )
      );

      await act(async () => {
        await result.current.generateTitle();
      });

      expect(executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ 
          maxRetries: 2, // Hardcoded to 2 in the hook
          baseDelayMs: 2000,
          maxDelayMs: 10000, // From default
        })
      );
    });
  });

  describe('title generation without retry', () => {
    it('should generate title directly when retry is disabled', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Tell me about AI' }];
      const mockTitle = 'AI Conversation';
      
      generateText.mockResolvedValue({
        text: mockTitle,
      });

      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any, false)
      );

      const title = await act(async () => {
        return await result.current.generateTitle();
      });

      expect(title).toBe(mockTitle);
      expect(result.current.title).toBe(mockTitle);
      expect(executeWithRetry).not.toHaveBeenCalled();
      expect(generateText).toHaveBeenCalledWith({
        model: mockModel,
        prompt: expect.stringContaining('Generate a 2-4 word title'),
      });
    });

    it('should handle generation failure gracefully without retry', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      
      generateText.mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any, false)
      );

      const title = await act(async () => {
        return await result.current.generateTitle();
      });

      expect(title).toBe('');
      expect(result.current.title).toBe('Chat'); // Should remain unchanged
    });
  });

  describe('edge cases and validation', () => {
    it('should return empty string when no messages provided', async () => {
      const { result } = renderHook(() => 
        useTitleGeneration([], mockModel as any)
      );

      const title = await act(async () => {
        return await result.current.generateTitle();
      });

      expect(title).toBe('');
      expect(generateText).not.toHaveBeenCalled();
      expect(executeWithRetry).not.toHaveBeenCalled();
    });

    it('should return empty string when no model provided', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const { result } = renderHook(() => 
        useTitleGeneration(messages, null)
      );

      const title = await act(async () => {
        return await result.current.generateTitle();
      });

      expect(title).toBe('');
      expect(generateText).not.toHaveBeenCalled();
      expect(executeWithRetry).not.toHaveBeenCalled();
    });

    it('should trim whitespace from generated titles', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      
      generateText.mockResolvedValue({
        text: '  Trimmed Title  ',
      });

      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any, false)
      );

      const title = await act(async () => {
        return await result.current.generateTitle();
      });

      expect(title).toBe('Trimmed Title');
    });

    it('should construct prompt with initial user request only', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' },
      ];
      
      generateText.mockResolvedValue({
        text: 'Chat Title',
      });

      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any, false)
      );

      await act(async () => {
        await result.current.generateTitle();
      });

      const prompt = generateText.mock.calls[0][0].prompt;
      expect(prompt).toContain('Initial request:');
      expect(prompt).toContain('First message');
      expect(prompt).not.toContain('First response');
      expect(prompt).not.toContain('Second message');
    });

    it('should return empty string when there is no non-empty user message', async () => {
      const messages: Message[] = [
        { role: 'assistant', content: 'Hello from assistant' },
        { role: 'user', content: '   ' },
      ];

      const { result } = renderHook(() =>
        useTitleGeneration(messages, mockModel as any)
      );

      const title = await act(async () => {
        return await result.current.generateTitle();
      });

      expect(title).toBe('');
      expect(generateText).not.toHaveBeenCalled();
      expect(executeWithRetry).not.toHaveBeenCalled();
    });
  });

  describe('title state management', () => {
    it('should update title when setTitle is called', () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any)
      );

      act(() => {
        result.current.setTitle('Custom Title');
      });

      expect(result.current.title).toBe('Custom Title');
    });

    it('should reset title to default when resetTitle is called', () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any)
      );

      // Set a custom title first
      act(() => {
        result.current.setTitle('Custom Title');
      });
      expect(result.current.title).toBe('Custom Title');

      // Reset to default
      act(() => {
        result.current.resetTitle();
      });
      expect(result.current.title).toBe('Chat');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      
      // Mock executeWithRetry to throw an unexpected error
      executeWithRetry.mockRejectedValue(
        new Error('Unexpected error')
      );

      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any, true)
      );

      const title = await act(async () => {
        return await result.current.generateTitle();
      });

      expect(title).toBe('');
      expect(result.current.title).toBe('Chat');
    });

    it('should handle case where generated title is empty string', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      
      generateText.mockResolvedValue({
        text: '',
      });

      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any, false)
      );

      const title = await act(async () => {
        return await result.current.generateTitle();
      });

      expect(title).toBe('');
      expect(result.current.title).toBe('Chat'); // Should not update with empty title
    });
  });

  describe('prompt construction', () => {
    it('should include title generation constraints in prompt', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Tell me about TypeScript' }];
      
      generateText.mockResolvedValue({
        text: 'TypeScript Help',
      });

      const { result } = renderHook(() => 
        useTitleGeneration(messages, mockModel as any, false)
      );

      await act(async () => {
        await result.current.generateTitle();
      });

      const prompt = generateText.mock.calls[0][0].prompt;
      expect(prompt).toContain('2-4 word title');
      expect(prompt).toContain('Return only the title, nothing else');
      expect(prompt).toContain('Initial request:');
    });
  });
});
