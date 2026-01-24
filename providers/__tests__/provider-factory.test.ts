import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  getProviderModel,
  getConfiguredProviders,
  testProviderConnectionReal,
  testProviderConnection,
  isProviderAvailable,
  testAllProviders,
  getBestAvailableProvider,
  invalidateProvider,
  getProviderInfo,
  getProviderCapabilities,
  getAllProviders,
  type ConnectionTestResult,
} from '../provider-factory';
import { isProviderConfigured, getDefaultModelForProvider } from '@/stores';
import type { ProviderId } from '@/types/provider.types';

jest.mock('@/stores');
jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

jest.mock('../apple-provider', () => ({
  createAppleModel: jest.fn(() => ({})),
}));

jest.mock('../openai-provider', () => ({
  getOpenAIModel: jest.fn(() => ({})),
}));

jest.mock('../openrouter-provider', () => ({
  getOpenRouterModel: jest.fn(() => ({})),
}));

jest.mock('../ollama-provider', () => ({
  getOllamaModel: jest.fn(() => ({})),
}));

interface MockGenerateTextResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

const mockGenerateTextResult: MockGenerateTextResult = {
  text: 'test',
  usage: { promptTokens: 0, completionTokens: 0 },
};

const mockGenerateText = jest
  .fn<() => Promise<MockGenerateTextResult>>()
  .mockResolvedValue(mockGenerateTextResult);

// @ts-ignore - TypeScript strict mode issue with jest.mock and ai SDK
jest.mock('ai', () => ({
  generateText: mockGenerateText,
  LanguageModel: {},
}));

const mockedIsProviderConfigured = isProviderConfigured as jest.MockedFunction<typeof isProviderConfigured>;
const mockedGetDefaultModelForProvider = getDefaultModelForProvider as jest.MockedFunction<typeof getDefaultModelForProvider>;

describe('getProviderModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDefaultModelForProvider.mockImplementation((provider: ProviderId) => {
      const models: Record<ProviderId, string> = {
        apple: 'gpt-4',
        openai: 'gpt-4',
        openrouter: 'claude-3',
        ollama: 'llama2',
      };
      return models[provider];
    });
    mockedIsProviderConfigured.mockReturnValue(true);
  });

  it('should return model for apple provider', () => {
    const result = getProviderModel('apple');

    expect(result.model).toBeDefined();
    expect(result.isConfigured).toBe(true);
  });

  it('should return model for openai provider', () => {
    const result = getProviderModel('openai');

    expect(result.model).toBeDefined();
    expect(result.isConfigured).toBe(true);
  });

  it('should return model for openrouter provider', () => {
    const result = getProviderModel('openrouter');

    expect(result.model).toBeDefined();
    expect(result.isConfigured).toBe(true);
  });

  it('should return model for ollama provider', () => {
    const result = getProviderModel('ollama');

    expect(result.model).toBeDefined();
    expect(result.isConfigured).toBe(true);
  });

  it('should use provided modelId', () => {
    const result = getProviderModel('apple', 'gpt-3.5');

    expect(result.model).toBeDefined();
    expect(result.isConfigured).toBe(true);
  });

  it('should return null model for invalid provider', () => {
    const result = getProviderModel('invalid' as ProviderId);

    expect(result.model).toBeNull();
    expect(result.isConfigured).toBe(false);
    expect(result.error).toContain('Unknown provider');
  });

});

describe('getConfiguredProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsProviderConfigured.mockImplementation((provider: ProviderId) => {
      return provider === 'apple' || provider === 'openai';
    });
  });

  it('should return only configured providers', () => {
    const result = getConfiguredProviders();

    expect(result).toHaveLength(2);
    expect(result).toContain('apple');
    expect(result).toContain('openai');
    expect(result).not.toContain('openrouter');
    expect(result).not.toContain('ollama');
  });

  it('should return apple when only apple is available', () => {
    mockedIsProviderConfigured.mockImplementation((provider: ProviderId) => provider === 'apple');

    const result = getConfiguredProviders();

    expect(result).toHaveLength(1);
    expect(result).toContain('apple');
  });

  it('should return all providers when all configured', () => {
    mockedIsProviderConfigured.mockReturnValue(true);

    const result = getConfiguredProviders();

    expect(result).toHaveLength(4);
    expect(result).toContain('apple');
    expect(result).toContain('openai');
    expect(result).toContain('openrouter');
    expect(result).toContain('ollama');
  });
});

describe('getAllProviders', () => {
  it('should return all provider IDs', () => {
    const result = getAllProviders();

    expect(result).toHaveLength(4);
    expect(result).toEqual(['apple', 'openai', 'openrouter', 'ollama']);
  });
});

describe('isProviderAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsProviderConfigured.mockReturnValue(true);
  });

  it('should return true for apple provider', () => {
    const result = isProviderAvailable('apple');

    expect(result).toBe(true);
  });

  it('should return true for configured provider', () => {
    const result = isProviderAvailable('openai');

    expect(result).toBe(true);
  });

  it('should return false for unconfigured provider', () => {
    mockedIsProviderConfigured.mockReturnValue(false);

    const result = isProviderAvailable('openai');

    expect(result).toBe(false);
  });

  it('should return false for invalid provider', () => {
    const result = isProviderAvailable('invalid' as ProviderId);

    expect(result).toBe(false);
  });
});

describe('testProviderConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true for apple provider', async () => {
    const result = await testProviderConnection('apple', {});

    expect(result).toBe(true);
  });

  it('should return false for invalid provider', async () => {
    const result = await testProviderConnection('invalid' as ProviderId, {});

    expect(result).toBe(false);
  });

  it('should return false for openai without apiKey', async () => {
    const result = await testProviderConnection('openai', {});

    expect(result).toBe(false);
  });

  it('should return false for openrouter without apiKey', async () => {
    const result = await testProviderConnection('openrouter', {});

    expect(result).toBe(false);
  });

  it('should return false for ollama without url', async () => {
    const result = await testProviderConnection('ollama', {});

    expect(result).toBe(false);
  });
});

describe('testProviderConnectionReal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return result object for apple provider', async () => {
    const result = await testProviderConnectionReal('apple');

    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });

  it('should return failure for invalid provider', async () => {
    const result = await testProviderConnectionReal('invalid' as ProviderId);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Unknown provider');
  });
});

describe('getProviderInfo', () => {
  it('should return provider info for valid provider', () => {
    const result = getProviderInfo('apple');

    expect(result).toBeDefined();
    expect(result).toHaveProperty('id', 'apple');
  });

  it('should return undefined for invalid provider', () => {
    const result = getProviderInfo('invalid' as ProviderId);

    expect(result).toBeUndefined();
  });
});

describe('getProviderCapabilities', () => {
  it('should return capabilities for valid provider', () => {
    const result = getProviderCapabilities('apple');

    expect(result).toBeDefined();
  });

  it('should return undefined for invalid provider', () => {
    const result = getProviderCapabilities('invalid' as ProviderId);

    expect(result).toBeUndefined();
  });
});

describe('testAllProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsProviderConfigured.mockReturnValue(true);
  });

  it('should return results for all providers', async () => {
    const result = await testAllProviders();

    expect(result).toHaveProperty('apple');
    expect(result).toHaveProperty('openai');
    expect(result).toHaveProperty('openrouter');
    expect(result).toHaveProperty('ollama');
  });

  it('should mark openai as not tested when not configured', async () => {
    mockedIsProviderConfigured.mockImplementation((provider: ProviderId) => provider === 'apple');

    const result = await testAllProviders();

    expect(result.openai).toHaveProperty('error');
    expect(result.openrouter).toHaveProperty('error');
    expect(result.ollama).toHaveProperty('error');
  });
});

describe('getBestAvailableProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsProviderConfigured.mockReturnValue(true);
  });

  it('should return apple if configured', async () => {
    const result = await getBestAvailableProvider();

    expect(result).toBe('apple');
  });

  it('should return apple when available', async () => {
    mockedIsProviderConfigured.mockImplementation((provider: ProviderId) => provider === 'apple');

    const result = await getBestAvailableProvider();

    expect(result).toBe('apple');
  });
});

describe('invalidateProvider', () => {
  it('should invalidate provider cache', () => {
    expect(() => {
      invalidateProvider('openai');
    }).not.toThrow();
  });
});
