import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  classifyError,
  getModelWithFallback,
  getNextFallbackProvider,
  hasFallbackAvailable,
  getAvailableProviders,
  ErrorCategory,
  ErrorClassification,
} from '../fallback-chain';
import { getProviderModel, isProviderAvailable } from '../provider-factory';
import { getDefaultModelForProvider, isProviderConfigured } from '@/stores';
import type { ProviderId } from '@/types/provider.types';
import { LanguageModel } from 'ai';

jest.mock('../provider-factory');
jest.mock('@/stores');

const mockedGetProviderModel = getProviderModel as jest.MockedFunction<typeof getProviderModel>;
const mockedIsProviderAvailable = isProviderAvailable as jest.MockedFunction<typeof isProviderAvailable>;
const mockedGetDefaultModelForProvider = getDefaultModelForProvider as jest.MockedFunction<typeof getDefaultModelForProvider>;
const mockedIsProviderConfigured = isProviderConfigured as jest.MockedFunction<typeof isProviderConfigured>;

describe('classifyError', () => {
  it('should classify configuration errors', () => {
    const error = new Error('API key not configured');
    const result: ErrorClassification = classifyError(error);

    expect(result.category).toBe('configuration');
    expect(result.isRetryable).toBe(false);
    expect(result.shouldFallback).toBe(true);
    expect(result.message).toContain('Provider not configured');
  });

  it('should classify missing API key errors', () => {
    const error = new Error('API key is missing');
    const result = classifyError(error);

    expect(result.category).toBe('configuration');
    expect(result.isRetryable).toBe(false);
    expect(result.shouldFallback).toBe(true);
  });

  it('should classify authentication errors (401)', () => {
    const error = new Error('Unauthorized') as any;
    error.statusCode = 401;
    const result = classifyError(error);

    expect(result.category).toBe('authentication');
    expect(result.isRetryable).toBe(false);
    expect(result.shouldFallback).toBe(true);
    expect(result.message).toContain('Authentication failed');
  });

  it('should classify forbidden errors (403)', () => {
    const error = new Error('Forbidden') as any;
    error.statusCode = 403;
    const result = classifyError(error);

    expect(result.category).toBe('authentication');
    expect(result.isRetryable).toBe(false);
    expect(result.shouldFallback).toBe(true);
  });

  it('should classify rate limit errors (429)', () => {
    const error = new Error('Too many requests') as any;
    error.statusCode = 429;
    const result = classifyError(error);

    expect(result.category).toBe('rate_limit');
    expect(result.isRetryable).toBe(true);
    expect(result.shouldFallback).toBe(true);
    expect(result.message).toContain('Rate limit exceeded');
  });

  it('should classify rate limit by message', () => {
    const error = new Error('Rate limit exceeded');
    const result = classifyError(error);

    expect(result.category).toBe('rate_limit');
    expect(result.isRetryable).toBe(true);
    expect(result.shouldFallback).toBe(true);
  });

  it('should classify model not found errors (404)', () => {
    const error = new Error('Model not found') as any;
    error.statusCode = 404;
    const result = classifyError(error);

    expect(result.category).toBe('model_not_found');
    expect(result.isRetryable).toBe(false);
    expect(result.shouldFallback).toBe(true);
    expect(result.message).toContain('Model not found');
  });

  it('should classify server errors (5xx)', () => {
    const error = new Error('Internal server error') as any;
    error.statusCode = 500;
    const result = classifyError(error);

    expect(result.category).toBe('server_error');
    expect(result.isRetryable).toBe(true);
    expect(result.shouldFallback).toBe(true);
    expect(result.message).toContain('server error');
  });

  it('should classify network errors', () => {
    const error = new Error('Network connection failed');
    const result = classifyError(error);

    expect(result.category).toBe('network');
    expect(result.isRetryable).toBe(true);
    expect(result.shouldFallback).toBe(true);
    expect(result.message).toContain('Network error');
  });

  it('should classify connection errors', () => {
    const error = new Error('ECONNREFUSED');
    const result = classifyError(error);

    expect(result.category).toBe('network');
    expect(result.isRetryable).toBe(true);
    expect(result.shouldFallback).toBe(true);
  });

  it('should classify timeout errors', () => {
    const error = new Error('Request timed out');
    const result = classifyError(error);

    expect(result.category).toBe('timeout');
    expect(result.isRetryable).toBe(true);
    expect(result.shouldFallback).toBe(true);
    expect(result.message).toContain('timed out');
  });

  it('should respect isRetryable flag', () => {
    const error = new Error('Custom error') as any;
    error.isRetryable = true;
    const result = classifyError(error);

    expect(result.category).toBe('unknown');
    expect(result.isRetryable).toBe(true);
    expect(result.shouldFallback).toBe(false);
  });

  it('should classify unknown errors', () => {
    const error = new Error('Unknown error occurred');
    const result = classifyError(error);

    expect(result.category).toBe('unknown');
    expect(result.isRetryable).toBe(false);
    expect(result.shouldFallback).toBe(true);
  });

  it('should handle null errors', () => {
    const result = classifyError(null);

    expect(result.category).toBe('unknown');
    expect(result.isRetryable).toBe(false);
    expect(result.shouldFallback).toBe(true);
  });

  it('should handle non-Error objects', () => {
    const result = classifyError('string error');

    expect(result.category).toBe('unknown');
    expect(result.shouldFallback).toBe(true);
  });
});

describe('getModelWithFallback', () => {
  const mockModel = {} as LanguageModel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetProviderModel.mockReturnValue({
      model: mockModel,
      isConfigured: true,
    });
    mockedIsProviderAvailable.mockReturnValue(true);
    mockedGetDefaultModelForProvider.mockImplementation((provider: ProviderId) => {
      const models: Record<ProviderId, string> = {
        apple: 'gpt-4',
        openai: 'gpt-4',
        openrouter: 'claude-3',
        ollama: 'llama2',
      };
      return models[provider];
    });
  });

  it('should return model from preferred provider when available', () => {
    const result = getModelWithFallback('openai', 'gpt-4');

    expect(result.model).toBe(mockModel);
    expect(result.provider).toBe('openai');
    expect(result.modelId).toBe('gpt-4');
    expect(result.isOriginal).toBe(true);
    expect(result.fallbackReason).toBeUndefined();
  });

  it('should fallback to next provider when preferred is unavailable', () => {
    mockedGetProviderModel.mockImplementation((provider: ProviderId) => {
      if (provider === 'openai') {
        return { model: null, isConfigured: false };
      }
      return { model: mockModel, isConfigured: true };
    });

    const result = getModelWithFallback('openai', 'gpt-4');

    expect(result.model).toBe(mockModel);
    expect(result.provider).toBe('apple');
    expect(result.isOriginal).toBe(false);
    expect(result.fallbackReason).toContain('openai unavailable');
  });

  it('should skip excluded providers', () => {
    const result = getModelWithFallback('openai', 'gpt-4', ['openai', 'apple']);

    expect(result.provider).not.toBe('openai');
    expect(result.provider).not.toBe('apple');
  });

  it('should track attempted providers', () => {
    mockedGetProviderModel.mockImplementation((provider: ProviderId) => {
      if (provider === 'openai' || provider === 'apple') {
        return { model: null, isConfigured: false };
      }
      return { model: mockModel, isConfigured: true };
    });

    const result = getModelWithFallback('openai', 'gpt-4');

    expect(result.attemptedProviders).toContain('openai');
    expect(result.attemptedProviders).toContain('apple');
    expect(result.attemptedProviders).toContain('openrouter');
  });

  it('should return null when no providers available', () => {
    mockedGetProviderModel.mockReturnValue({
      model: null,
      isConfigured: false,
    });
    mockedIsProviderAvailable.mockReturnValue(false);

    const result = getModelWithFallback('openai', 'gpt-4');

    expect(result.model).toBeNull();
    expect(result.error).toContain('No configured providers');
  });

  it('should use default model for fallback providers', () => {
    mockedGetProviderModel.mockImplementation((providerId: ProviderId, modelId?: string) => {
      if (providerId === 'openai') {
        return { model: null, isConfigured: false };
      }
      return { model: mockModel, isConfigured: true };
    });

    const result = getModelWithFallback('openai', 'gpt-4');

    expect(mockedGetProviderModel).toHaveBeenCalledWith('apple', 'gpt-4');
  });

  it('should skip unavailable providers in fallback chain', () => {
    mockedIsProviderAvailable.mockImplementation((provider: ProviderId) => {
      return provider === 'apple';
    });

    const result = getModelWithFallback('openai', 'gpt-4', ['openai']);

    expect(result.provider).toBe('apple');
  });
});

describe('getNextFallbackProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsProviderAvailable.mockReturnValue(true);
    mockedGetDefaultModelForProvider.mockImplementation((provider: ProviderId) => {
      const models: Record<ProviderId, string> = {
        apple: 'gpt-4',
        openai: 'gpt-4',
        openrouter: 'claude-3',
        ollama: 'llama2',
      };
      return models[provider];
    });
  });

  it('should return next provider after error', () => {
    const error = new Error('API key not configured');
    const result = getNextFallbackProvider('openai', [], error);

    expect(result).toEqual({
      provider: 'apple',
      model: 'gpt-4',
    });
  });

  it('should return null when error should not fallback', () => {
    const error = new Error('Some error') as any;
    error.isRetryable = false;
    
    const classification = classifyError(error);
    expect(classification.shouldFallback).toBe(true);
  });

  it('should skip failed providers', () => {
    const error = new Error('API error');
    const result = getNextFallbackProvider('openai', ['openai', 'apple'], error);

    expect(result?.provider).not.toBe('openai');
    expect(result?.provider).not.toBe('apple');
  });

  it('should return null when all providers failed', () => {
    const error = new Error('Error');
    const result = getNextFallbackProvider('openai', ['openai', 'apple', 'openrouter', 'ollama'], error);

    expect(result).toBeNull();
  });

  it('should skip unavailable providers', () => {
    mockedIsProviderAvailable.mockImplementation((provider: ProviderId) => {
      return provider === 'apple';
    });

    const error = new Error('Error');
    const result = getNextFallbackProvider('openai', ['openai'], error);

    expect(result?.provider).toBe('apple');
  });

  it('should use classifyError for fallback decision', () => {
    const error = new Error('Rate limit exceeded') as any;
    error.statusCode = 429;

    const result = getNextFallbackProvider('openai', [], error);

    expect(result).not.toBeNull();
  });
});

describe('hasFallbackAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsProviderAvailable.mockReturnValue(true);
  });

  it('should return true when fallback providers exist', () => {
    const result = hasFallbackAvailable('openai');

    expect(result).toBe(true);
  });

  it('should return false when all providers failed', () => {
    mockedIsProviderAvailable.mockReturnValue(false);

    const result = hasFallbackAvailable('openai', ['apple', 'openrouter', 'ollama']);

    expect(result).toBe(false);
  });

  it('should exclude current provider', () => {
    mockedIsProviderAvailable.mockImplementation((provider: ProviderId) => {
      return provider !== 'openai';
    });

    const result = hasFallbackAvailable('openai');

    expect(result).toBe(true);
  });

  it('should exclude failed providers', () => {
    mockedIsProviderAvailable.mockImplementation((provider: ProviderId) => {
      return provider === 'apple';
    });

    const result = hasFallbackAvailable('openai', ['apple', 'openrouter']);

    expect(result).toBe(false);
  });
});

describe('getAvailableProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsProviderConfigured.mockReturnValue(true);
  });

  it('should return all providers with configuration status', () => {
    const result = getAvailableProviders();

    expect(result).toHaveLength(4);
    expect(result.every((p) => p.provider && typeof p.isConfigured === 'boolean')).toBe(true);
  });

  it('should return providers in fallback order', () => {
    const result = getAvailableProviders();

    expect(result[0].provider).toBe('apple');
    expect(result[1].provider).toBe('openai');
    expect(result[2].provider).toBe('openrouter');
    expect(result[3].provider).toBe('ollama');
  });

  it('should reflect actual configuration status', () => {
    mockedIsProviderConfigured.mockImplementation((provider: ProviderId) => {
      return provider === 'apple' || provider === 'openai';
    });

    const result = getAvailableProviders();

    const appleProvider = result.find((p) => p.provider === 'apple');
    const openaiProvider = result.find((p) => p.provider === 'openai');
    const ollamaProvider = result.find((p) => p.provider === 'ollama');

    expect(appleProvider?.isConfigured).toBe(true);
    expect(openaiProvider?.isConfigured).toBe(true);
    expect(ollamaProvider?.isConfigured).toBe(false);
  });
});
