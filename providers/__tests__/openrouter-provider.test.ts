import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
    getOpenRouterModel,
    createOpenRouterProvider,
    isOpenRouterConfigured,
    testOpenRouterConnection,
} from '../openrouter-provider';
import { createOpenRouter, type OpenRouterProvider } from '@openrouter/ai-sdk-provider';
import { getProviderAuth } from '@/stores';
import { fetch as expoFetch } from 'expo/fetch';

// Mock the @openrouter/ai-sdk-provider package
jest.mock('@openrouter/ai-sdk-provider', () => ({
    createOpenRouter: jest.fn(),
}));

// Mock the ai package
jest.mock('ai', () => ({
    LanguageModel: {},
}));

// Mock the auth store
jest.mock('@/stores', () => ({
    getProviderAuth: jest.fn(),
}));

// Mock expo/fetch
jest.mock('expo/fetch', () => ({
    fetch: jest.fn(),
}));

const mockedCreateOpenRouter = createOpenRouter as jest.MockedFunction<typeof createOpenRouter>;
const mockedGetProviderAuth = getProviderAuth as jest.MockedFunction<typeof getProviderAuth>;
const mockedExpoFetch = expoFetch as jest.MockedFunction<typeof expoFetch>;

describe('OpenRouter Provider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============================================================================
    // getOpenRouterModel Tests
    // ============================================================================

    describe('getOpenRouterModel', () => {
        it('should create OpenRouter model with valid API key', () => {
            const mockModel = { provider: 'openrouter', modelId: 'openai/gpt-4o' } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            
            mockedGetProviderAuth.mockReturnValue({ apiKey: 'sk-or-v1-test-key' });
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            const result = getOpenRouterModel('openai/gpt-4o');

            expect(result).toEqual(mockModel);
            expect(mockedGetProviderAuth).toHaveBeenCalledWith('openrouter');
            expect(mockedCreateOpenRouter).toHaveBeenCalledWith({
                apiKey: 'sk-or-v1-test-key',
                fetch: expect.any(Function),
            });
            expect(mockProvider).toHaveBeenCalledWith('openai/gpt-4o');
        });

        it('should use default model when no modelId provided', () => {
            const mockModel = { provider: 'openrouter', modelId: 'openai/gpt-4o' } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            
            mockedGetProviderAuth.mockReturnValue({ apiKey: 'sk-or-v1-test-key' });
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            getOpenRouterModel();

            expect(mockProvider).toHaveBeenCalledWith('openai/gpt-4o');
        });

        it('should return null when no API key is configured', () => {
            mockedGetProviderAuth.mockReturnValue({ apiKey: '' });

            const result = getOpenRouterModel();

            expect(result).toBeNull();
            expect(mockedCreateOpenRouter).not.toHaveBeenCalled();
        });

        it('should return null when API key is null', () => {
            mockedGetProviderAuth.mockReturnValue({ apiKey: null as any });

            const result = getOpenRouterModel();

            expect(result).toBeNull();
            expect(mockedCreateOpenRouter).not.toHaveBeenCalled();
        });

        it('should return null when createOpenRouter throws error', () => {
            mockedGetProviderAuth.mockReturnValue({ apiKey: 'sk-or-v1-test-key' });
            mockedCreateOpenRouter.mockImplementation(() => {
                throw new Error('Provider creation failed');
            });

            const result = getOpenRouterModel();

            expect(result).toBeNull();
        });

        it('should return null when provider function throws error', () => {
            mockedGetProviderAuth.mockReturnValue({ apiKey: 'sk-or-v1-test-key' });
            const mockProvider = jest.fn(() => {
                throw new Error('Model creation failed');
            }) as any;
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            const result = getOpenRouterModel();

            expect(result).toBeNull();
        });

        it('should handle different model IDs', () => {
            const models = [
                'openai/gpt-4o',
                'anthropic/claude-3-sonnet',
                'meta/llama-3.1-70b-instruct',
                'google/gemini-pro-1.5',
            ];
            
            models.forEach(modelId => {
                const mockModel = { provider: 'openrouter', modelId } as any;
                const mockProvider = jest.fn(() => mockModel) as any;
                
                mockedGetProviderAuth.mockReturnValue({ apiKey: 'sk-or-v1-test-key' });
                mockedCreateOpenRouter.mockReturnValue(mockProvider);

                getOpenRouterModel(modelId);

                expect(mockProvider).toHaveBeenCalledWith(modelId);
            });
        });

        it('should pass expoFetch to provider configuration', () => {
            const mockModel = { provider: 'openrouter' } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            
            mockedGetProviderAuth.mockReturnValue({ apiKey: 'sk-or-v1-test-key' });
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            getOpenRouterModel();

            expect(mockedCreateOpenRouter).toHaveBeenCalledWith({
                apiKey: 'sk-or-v1-test-key',
                fetch: expoFetch,
            });
        });
    });

    // ============================================================================
    // createOpenRouterProvider Tests
    // ============================================================================

    describe('createOpenRouterProvider', () => {
        it('should create OpenRouter provider with API key', () => {
            const mockProvider = {} as OpenRouterProvider;
            
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            const result = createOpenRouterProvider('sk-or-v1-test-key');

            expect(result).toEqual(mockProvider);
            expect(mockedCreateOpenRouter).toHaveBeenCalledWith({
                apiKey: 'sk-or-v1-test-key',
                fetch: expect.any(Function),
            });
        });

        it('should pass expoFetch to provider configuration', () => {
            const mockProvider = {} as OpenRouterProvider;
            
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            createOpenRouterProvider('sk-or-v1-test-key');

            expect(mockedCreateOpenRouter).toHaveBeenCalledWith({
                apiKey: 'sk-or-v1-test-key',
                fetch: expoFetch,
            });
        });

        it('should handle empty API key', () => {
            const mockProvider = {} as OpenRouterProvider;
            
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            const result = createOpenRouterProvider('');

            expect(result).toEqual(mockProvider);
            expect(mockedCreateOpenRouter).toHaveBeenCalledWith({
                apiKey: '',
                fetch: expect.any(Function),
            });
        });

        it('should handle different API key formats', () => {
            const apiKeys = [
                'sk-or-v1-abc123',
                'sk-or-v1-def456-xyz789',
                'sk-or-v1-long-key-with-many-characters',
            ];
            
            apiKeys.forEach(apiKey => {
                const mockProvider = {} as OpenRouterProvider;
                mockedCreateOpenRouter.mockReturnValue(mockProvider);

                const result = createOpenRouterProvider(apiKey);

                expect(result).toEqual(mockProvider);
                expect(mockedCreateOpenRouter).toHaveBeenCalledWith({
                    apiKey,
                    fetch: expect.any(Function),
                });
            });
        });
    });

    // ============================================================================
    // isOpenRouterConfigured Tests
    // ============================================================================

    describe('isOpenRouterConfigured', () => {
        it('should return true when API key is configured', () => {
            mockedGetProviderAuth.mockReturnValue({ apiKey: 'sk-or-v1-test-key' });

            const result = isOpenRouterConfigured();

            expect(result).toBe(true);
            expect(mockedGetProviderAuth).toHaveBeenCalledWith('openrouter');
        });

        it('should return false when API key is empty string', () => {
            mockedGetProviderAuth.mockReturnValue({ apiKey: '' });

            const result = isOpenRouterConfigured();

            expect(result).toBe(false);
        });

        it('should return false when API key is null', () => {
            mockedGetProviderAuth.mockReturnValue({ apiKey: null as any });

            const result = isOpenRouterConfigured();

            expect(result).toBe(false);
        });

        it('should return false when API key is undefined', () => {
            mockedGetProviderAuth.mockReturnValue({ apiKey: undefined as any });

            const result = isOpenRouterConfigured();

            expect(result).toBe(false);
        });

        it('should handle multiple calls correctly', () => {
            const testCases = [
                { apiKey: 'sk-or-v1-test-key', expected: true },
                { apiKey: '', expected: false },
                { apiKey: 'sk-or-v1-another-key', expected: true },
                { apiKey: null, expected: false },
            ];

            testCases.forEach(({ apiKey, expected }, index) => {
                mockedGetProviderAuth.mockReturnValue({ apiKey } as any);
                const result = isOpenRouterConfigured();
                expect(result).toBe(expected);
                expect(mockedGetProviderAuth).toHaveBeenNthCalledWith(index + 1, 'openrouter');
            });
        });
    });

    // ============================================================================
    // testOpenRouterConnection Tests
    // ============================================================================

    describe('testOpenRouterConnection', () => {
        it('should return true for successful connection', async () => {
            const mockResponse = { ok: true } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await testOpenRouterConnection('sk-or-v1-test-key');

            expect(result).toBe(true);
            expect(mockedExpoFetch).toHaveBeenCalledWith(
                'https://openrouter.ai/api/v1/models',
                {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer sk-or-v1-test-key',
                        'Content-Type': 'application/json',
                    },
                }
            );
        });

        it('should return false for failed connection (non-2xx)', async () => {
            const mockResponse = { ok: false, status: 401 } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await testOpenRouterConnection('invalid-key');

            expect(result).toBe(false);
        });

        it('should return false for network errors', async () => {
            mockedExpoFetch.mockRejectedValue(new Error('Network error'));

            const result = await testOpenRouterConnection('sk-or-v1-test-key');

            expect(result).toBe(false);
        });

        it('should return false for timeout errors', async () => {
            mockedExpoFetch.mockRejectedValue(new Error('Request timeout'));

            const result = await testOpenRouterConnection('sk-or-v1-test-key');

            expect(result).toBe(false);
        });

        it('should handle malformed API key gracefully', async () => {
            const mockResponse = { ok: false, status: 401 } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await testOpenRouterConnection('invalid-key-format');

            expect(result).toBe(false);
        });

        it('should handle different API key formats', async () => {
            const apiKeys = [
                'sk-or-v1-abc123',
                'sk-or-v1-def456-xyz789',
                'sk-or-v1-long-key-with-many-characters',
            ];
            
            for (const apiKey of apiKeys) {
                const mockResponse = { ok: true } as any;
                mockedExpoFetch.mockResolvedValue(mockResponse);

                const result = await testOpenRouterConnection(apiKey);

                expect(result).toBe(true);
                expect(mockedExpoFetch).toHaveBeenCalledWith(
                    'https://openrouter.ai/api/v1/models',
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
            }
        });

        it('should return false for empty API key', async () => {
            const mockResponse = { ok: false, status: 401 } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await testOpenRouterConnection('');

            expect(result).toBe(false);
            expect(mockedExpoFetch).toHaveBeenCalledWith(
                'https://openrouter.ai/api/v1/models',
                {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ',
                        'Content-Type': 'application/json',
                    },
                }
            );
        });
    });

    // ============================================================================
    // Integration Tests
    // ============================================================================

    describe('Integration Scenarios', () => {
        it('should handle complete flow from configuration to model creation', async () => {
            // Step 1: Check if configured
            mockedGetProviderAuth.mockReturnValue({ apiKey: 'sk-or-v1-test-key' });
            expect(isOpenRouterConfigured()).toBe(true);

            // Step 2: Test connection
            const mockConnectionResponse = { ok: true } as any;
            mockedExpoFetch.mockResolvedValue(mockConnectionResponse);
            expect(await testOpenRouterConnection('sk-or-v1-test-key')).toBe(true);

            // Step 3: Create model
            const mockModel = { provider: 'openrouter' } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            mockedCreateOpenRouter.mockReturnValue(mockProvider);
            const model = getOpenRouterModel('openai/gpt-4o');
            expect(model).toEqual(mockModel);
        });

        it('should handle error scenarios gracefully', async () => {
            // Not configured
            mockedGetProviderAuth.mockReturnValue({ apiKey: '' });
            expect(isOpenRouterConfigured()).toBe(false);

            // Connection fails
            mockedExpoFetch.mockRejectedValue(new Error('Connection failed'));
            expect(await testOpenRouterConnection('sk-or-v1-test-key')).toBe(false);

            // Model creation fails (no API key)
            expect(getOpenRouterModel('openai/gpt-4o')).toBeNull();
        });

        it('should handle provider creation and model usage together', () => {
            const apiKey = 'sk-or-v1-test-key';
            const modelId = 'anthropic/claude-3-sonnet';
            const mockModel = { provider: 'openrouter', modelId } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            // Create provider directly
            const provider = createOpenRouterProvider(apiKey);
            expect(provider).toEqual(mockProvider);

            // Use provider to create model
            const model = provider(modelId);
            expect(model).toEqual(mockModel);
            expect(mockProvider).toHaveBeenCalledWith(modelId);

            // Reset mocks for getOpenRouterModel test
            jest.clearAllMocks();
            mockedGetProviderAuth.mockReturnValue({ apiKey });
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            // Create model through getOpenRouterModel
            const model2 = getOpenRouterModel(modelId);
            expect(model2).toEqual(mockModel);
            expect(mockProvider).toHaveBeenCalledWith(modelId);
        });
    });

    // ============================================================================
    // Edge Cases
    // ============================================================================

    describe('Edge Cases', () => {
        it('should handle very long API keys', () => {
            const longApiKey = 'sk-or-v1-' + 'a'.repeat(1000);
            const mockModel = { provider: 'openrouter' } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            
            mockedGetProviderAuth.mockReturnValue({ apiKey: longApiKey });
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            const result = getOpenRouterModel();

            expect(result).toEqual(mockModel);
            expect(mockedCreateOpenRouter).toHaveBeenCalledWith({
                apiKey: longApiKey,
                fetch: expect.any(Function),
            });
        });

        it('should handle special characters in API keys', () => {
            const specialApiKey = 'sk-or-v1-abc123-xyz789-_+/=';
            const mockModel = { provider: 'openrouter' } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            
            mockedGetProviderAuth.mockReturnValue({ apiKey: specialApiKey });
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            const result = getOpenRouterModel();

            expect(result).toEqual(mockModel);
            expect(mockedCreateOpenRouter).toHaveBeenCalledWith({
                apiKey: specialApiKey,
                fetch: expect.any(Function),
            });
        });

        it('should handle malformed model IDs gracefully', () => {
            const malformedModelIds = [
                '',
                'not-a-valid-model-id',
                'invalid-format',
                'openai/',
                '/gpt-4o',
            ];
            
            malformedModelIds.forEach(modelId => {
                const mockModel = { provider: 'openrouter', modelId } as any;
                const mockProvider = jest.fn(() => mockModel) as any;
                
                mockedGetProviderAuth.mockReturnValue({ apiKey: 'sk-or-v1-test-key' });
                mockedCreateOpenRouter.mockReturnValue(mockProvider);

                const result = getOpenRouterModel(modelId);

                expect(result).toEqual(mockModel);
                expect(mockProvider).toHaveBeenCalledWith(modelId);
            });
        });

        it('should handle concurrent model creation', () => {
            const mockModel = { provider: 'openrouter' } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            
            mockedGetProviderAuth.mockReturnValue({ apiKey: 'sk-or-v1-test-key' });
            mockedCreateOpenRouter.mockReturnValue(mockProvider);

            // Create multiple models concurrently
            const models = Array.from({ length: 10 }, () => 
                getOpenRouterModel('openai/gpt-4o')
            );

            expect(models).toEqual(Array(10).fill(mockModel));
            expect(mockProvider).toHaveBeenCalledTimes(10);
        });

        it('should handle concurrent connection tests', async () => {
            const mockResponse = { ok: true } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const promises = Array.from({ length: 10 }, () =>
                testOpenRouterConnection('sk-or-v1-test-key')
            );

            const results = await Promise.all(promises);

            expect(results).toEqual(Array(10).fill(true));
            expect(mockedExpoFetch).toHaveBeenCalledTimes(10);
        });
    });
});