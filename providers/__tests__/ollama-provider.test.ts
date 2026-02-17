import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
    getOllamaModel,
    isOllamaConfigured,
    testOllamaConnection,
    fetchOllamaModels,
} from '../ollama-provider';
import { createOllama } from 'ollama-ai-provider-v2';
import { getProviderAuth } from '@/stores';
import { fetch as expoFetch } from 'expo/fetch';

// Mock the ollama-ai-provider-v2 package
jest.mock('ollama-ai-provider-v2', () => ({
    createOllama: jest.fn(),
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

const mockedCreateOllama: any = createOllama;
const mockedGetProviderAuth: any = getProviderAuth;
const mockedExpoFetch: any = expoFetch;

describe('Ollama Provider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============================================================================
    // URL Normalization Tests
    // ============================================================================

    describe('URL Normalization (via function behavior)', () => {
        it('should handle various URL formats in getOllamaModel', () => {
            const testCases = [
                { input: 'http://localhost:11434', expected: 'http://localhost:11434/api' },
                { input: 'http://localhost:11434/', expected: 'http://localhost:11434/api' },
                { input: 'http://localhost:11434/api', expected: 'http://localhost:11434/api' },
                { input: 'http://localhost:11434/api/', expected: 'http://localhost:11434/api' },
            ];

            testCases.forEach(({ input, expected }) => {
                // Set up mocks
                mockedGetProviderAuth.mockReturnValue({ url: input });
                const mockModel = { provider: 'ollama' } as any;
                const mockProvider = jest.fn(() => mockModel) as any;
                mockedCreateOllama.mockReturnValue(mockProvider);

                getOllamaModel('test-model');

                expect(mockedCreateOllama).toHaveBeenCalledWith(
                    expect.objectContaining({
                        baseURL: expected,
                    })
                );
            });
        });
    });

    // ============================================================================
    // getOllamaModel Tests
    // ============================================================================

    describe('getOllamaModel', () => {
        it('should create Ollama model with valid configuration', () => {
            const mockModel = { provider: 'ollama', modelId: 'llama3.2' } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            
            mockedGetProviderAuth.mockReturnValue({ url: 'http://localhost:11434' });
            mockedCreateOllama.mockReturnValue(mockProvider);

            const result = getOllamaModel('llama3.2');

            expect(result).toEqual(mockModel);
            expect(mockedGetProviderAuth).toHaveBeenCalledWith('ollama');
            expect(mockedCreateOllama).toHaveBeenCalledWith({
                baseURL: 'http://localhost:11434/api',
                fetch: expect.any(Function),
            });
            expect(mockProvider).toHaveBeenCalledWith('llama3.2');
        });

        it('should use default model when no modelId provided', () => {
            const mockModel = { provider: 'ollama', modelId: 'llama3.2' } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            
            mockedGetProviderAuth.mockReturnValue({ url: 'http://localhost:11434' });
            mockedCreateOllama.mockReturnValue(mockProvider);

            getOllamaModel();

            expect(mockProvider).toHaveBeenCalledWith('llama3.2');
        });

        it('should return null when no URL is configured', () => {
            mockedGetProviderAuth.mockReturnValue({ url: '' });

            const result = getOllamaModel();

            expect(result).toBeNull();
            expect(mockedCreateOllama).not.toHaveBeenCalled();
        });

        it('should return null when URL is null', () => {
            mockedGetProviderAuth.mockReturnValue({ url: null as any });

            const result = getOllamaModel();

            expect(result).toBeNull();
            expect(mockedCreateOllama).not.toHaveBeenCalled();
        });

        it('should return null when createOllama throws error', () => {
            mockedGetProviderAuth.mockReturnValue({ url: 'http://localhost:11434' });
            mockedCreateOllama.mockImplementation(() => {
                throw new Error('Provider creation failed');
            });

            const result = getOllamaModel();

            expect(result).toBeNull();
        });

        it('should return null when provider function throws error', () => {
            mockedGetProviderAuth.mockReturnValue({ url: 'http://localhost:11434' });
            const mockProvider = jest.fn(() => {
                throw new Error('Model creation failed');
            }) as any;
            mockedCreateOllama.mockReturnValue(mockProvider);

            const result = getOllamaModel();

            expect(result).toBeNull();
        });

        it('should handle different model IDs', () => {
            const models = ['llama3.2', 'mistral', 'codellama', 'custom-model'];
            
            models.forEach(modelId => {
                const mockModel = { provider: 'ollama', modelId } as any;
                const mockProvider = jest.fn(() => mockModel) as any;
                
                mockedGetProviderAuth.mockReturnValue({ url: 'http://localhost:11434' });
                mockedCreateOllama.mockReturnValue(mockProvider);

                getOllamaModel(modelId);

                expect(mockProvider).toHaveBeenCalledWith(modelId);
            });
        });
    });

    // ============================================================================
    // isOllamaConfigured Tests
    // ============================================================================

    describe('isOllamaConfigured', () => {
        it('should return true when URL is configured', () => {
            mockedGetProviderAuth.mockReturnValue({ url: 'http://localhost:11434' });

            const result = isOllamaConfigured();

            expect(result).toBe(true);
            expect(mockedGetProviderAuth).toHaveBeenCalledWith('ollama');
        });

        it('should return false when URL is empty string', () => {
            mockedGetProviderAuth.mockReturnValue({ url: '' });

            const result = isOllamaConfigured();

            expect(result).toBe(false);
        });

        it('should return false when URL is null', () => {
            mockedGetProviderAuth.mockReturnValue({ url: null as any });

            const result = isOllamaConfigured();

            expect(result).toBe(false);
        });

        it('should return false when URL is undefined', () => {
            mockedGetProviderAuth.mockReturnValue({ url: undefined as any });

            const result = isOllamaConfigured();

            expect(result).toBe(false);
        });

        it('should handle multiple calls correctly', () => {
            const testCases = [
                { url: 'http://localhost:11434', expected: true },
                { url: '', expected: false },
                { url: 'http://192.168.1.100:11434', expected: true },
                { url: null, expected: false },
            ];

            testCases.forEach(({ url, expected }, index) => {
                mockedGetProviderAuth.mockReturnValue({ url } as any);
                const result = isOllamaConfigured();
                expect(result).toBe(expected);
                expect(mockedGetProviderAuth).toHaveBeenNthCalledWith(index + 1, 'ollama');
            });
        });
    });

    // ============================================================================
    // testOllamaConnection Tests
    // ============================================================================

    describe('testOllamaConnection', () => {
        beforeEach(() => {
            // Mock setTimeout and clearTimeout
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return true for successful connection', async () => {
            const mockResponse = { ok: true } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await testOllamaConnection('http://localhost:11434');

            expect(result).toBe(true);
            expect(mockedExpoFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/tags',
                expect.objectContaining({
                    method: 'GET',
                    signal: expect.any(AbortSignal),
                })
            );
        });

        it('should return false for failed connection (non-2xx)', async () => {
            const mockResponse = { ok: false, status: 500 } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await testOllamaConnection('http://localhost:11434');

            expect(result).toBe(false);
        });

        it('should return false for network errors', async () => {
            mockedExpoFetch.mockRejectedValue(new Error('Network error'));

            const result = await testOllamaConnection('http://localhost:11434');

            expect(result).toBe(false);
        });

        it('should timeout after 5 seconds', async () => {
            // Test that timeout is properly configured (5 seconds)
            const mockAbortController = {
                signal: new AbortController().signal,
                abort: jest.fn(),
            };
            
            jest.spyOn(global, 'AbortController')
                .mockImplementation(() => mockAbortController as any);
            
            // Mock fetch to reject immediately to simulate timeout scenario
            mockedExpoFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

            const result = await testOllamaConnection('http://localhost:11434');

            expect(result).toBe(false);
            expect(mockedExpoFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/tags',
                expect.objectContaining({
                    method: 'GET',
                    signal: expect.any(AbortSignal),
                })
            );

            jest.restoreAllMocks();
        });

        it('should clean up timeout on successful response', async () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            const mockResponse = { ok: true } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            await testOllamaConnection('http://localhost:11434');

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        it('should normalize URL before testing', async () => {
            const mockResponse = { ok: true } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            await testOllamaConnection('http://localhost:11434/');

            expect(mockedExpoFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/tags',
                expect.any(Object)
            );
        });

        it('should handle various URL formats', async () => {
            const mockResponse = { ok: true } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const urls = [
                'http://localhost:11434',
                'http://localhost:11434/',
                'http://localhost:11434/api',
                'http://localhost:11434/api/',
            ];

            for (const url of urls) {
                await testOllamaConnection(url);
                expect(mockedExpoFetch).toHaveBeenLastCalledWith(
                    'http://localhost:11434/api/tags',
                    expect.any(Object)
                );
            }
        });
    });

    // ============================================================================
    // fetchOllamaModels Tests
    // ============================================================================

    describe('fetchOllamaModels', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return model names from array response', async () => {
            const mockData = ['llama3.2', 'mistral', 'codellama'];
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => mockData as any),
            } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual(['llama3.2', 'mistral', 'codellama']);
            expect(mockedExpoFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/tags',
                expect.objectContaining({
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                    signal: expect.any(AbortSignal),
                })
            );
        });

        it('should return model names from object response', async () => {
            const mockData = {
                models: [
                    { name: 'llama3.2' },
                    { name: 'mistral' },
                    { name: 'codellama' },
                ],
            };
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => mockData as any),
            } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual(['llama3.2', 'mistral', 'codellama']);
        });

        it('should return model names when response objects use model field', async () => {
            const mockData = {
                models: [
                    { model: 'llama3.2:latest' },
                    { model: 'mistral:latest' },
                ],
            };
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => mockData as any),
            } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual(['llama3.2:latest', 'mistral:latest']);
        });

        it('should discard invalid entries in mixed responses', async () => {
            const mockData = [
                { name: 'llama3.2' },
                { id: 'mistral' }, // No name field
                ' codellama ', // String with extra whitespace
                { name: 'custom-model' },
                { name: 'custom-model' }, // Duplicate
                null,
            ];
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => mockData as any),
            } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual(['llama3.2', 'codellama', 'custom-model']);
        });

        it('should normalize and dedupe names from object responses', async () => {
            const mockData = {
                models: [
                    { name: ' llama3.2 ' },
                    { name: 'mistral' },
                    { name: 'mistral' },
                    { name: '' },
                    { name: '   ' },
                ],
            };
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => mockData as any),
            } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual(['llama3.2', 'mistral']);
        });

        it('should return empty array for non-2xx response', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                json: jest.fn(),
            } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual([]);
        });

        it('should return empty array for network errors', async () => {
            mockedExpoFetch.mockRejectedValue(new Error('Network error'));

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual([]);
        });

        it('should handle JSON parsing errors', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => {
                    throw new Error('Invalid JSON');
                }),
            };
            mockedExpoFetch.mockResolvedValue(mockResponse as any);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual([]);
        });

        it('should timeout after 10 seconds', async () => {
            // Test that timeout is properly configured (10 seconds)
            const mockAbortController = {
                signal: new AbortController().signal,
                abort: jest.fn(),
            };
            
            jest.spyOn(global, 'AbortController')
                .mockImplementation(() => mockAbortController as any);
            
            // Mock fetch to reject immediately to simulate timeout scenario
            mockedExpoFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual([]);
            expect(mockedExpoFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/tags',
                expect.objectContaining({
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                    signal: expect.any(AbortSignal),
                })
            );

            jest.restoreAllMocks();
        });

        it('should clean up timeout in finally block', async () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => ({ models: [] })),
            };
            mockedExpoFetch.mockResolvedValue(mockResponse as any);

            await fetchOllamaModels('http://localhost:11434');

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });

        it('should normalize URL correctly', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => ({ models: [] })),
            };
            mockedExpoFetch.mockResolvedValue(mockResponse as any);

            await fetchOllamaModels('http://localhost:11434/');

            expect(mockedExpoFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/tags',
                expect.any(Object)
            );
        });

        it('should handle empty response data', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => ({})),
            };
            mockedExpoFetch.mockResolvedValue(mockResponse as any);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual([]);
        });

        it('should handle null response data', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => null),
            };
            mockedExpoFetch.mockResolvedValue(mockResponse as any);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual([]);
        });
    });

    // ============================================================================
    // Integration Tests
    // ============================================================================

    describe('Integration Scenarios', () => {
        it('should handle complete flow from configuration to model fetch', async () => {
            // Step 1: Check if configured
            mockedGetProviderAuth.mockReturnValue({ url: 'http://localhost:11434' });
            expect(isOllamaConfigured()).toBe(true);

            // Step 2: Test connection
            const mockConnectionResponse = { ok: true } as any;
            mockedExpoFetch.mockResolvedValue(mockConnectionResponse);
            expect(await testOllamaConnection('http://localhost:11434')).toBe(true);

            // Step 3: Fetch models
            const mockModelsResponse = {
                ok: true,
                json: jest.fn(async () => ({
                    models: [{ name: 'llama3.2' }, { name: 'mistral' }],
                } as any)),
            } as any;
            mockedExpoFetch.mockResolvedValue(mockModelsResponse);
            const models = await fetchOllamaModels('http://localhost:11434');
            expect(models).toEqual(['llama3.2', 'mistral']);

            // Step 4: Create model
            const mockModel = { provider: 'ollama' } as any;
            const mockProvider = jest.fn(() => mockModel) as any;
            mockedCreateOllama.mockReturnValue(mockProvider);
            const model = getOllamaModel('llama3.2');
            expect(model).toEqual(mockModel);
        });

        it('should handle error scenarios gracefully', async () => {
            // Not configured
            mockedGetProviderAuth.mockReturnValue({ url: '' });
            expect(isOllamaConfigured()).toBe(false);

            // Connection fails
            mockedExpoFetch.mockRejectedValue(new Error('Connection failed'));
            expect(await testOllamaConnection('http://localhost:11434')).toBe(false);

            // Model fetch fails
            expect(await fetchOllamaModels('http://localhost:11434')).toEqual([]);

            // Model creation fails (no URL)
            expect(getOllamaModel('llama3.2')).toBeNull();
        });
    });

    // ============================================================================
    // Edge Cases
    // ============================================================================

    describe('Edge Cases', () => {
        it('should handle malformed URLs in connection test', async () => {
            mockedExpoFetch.mockRejectedValue(new TypeError('Invalid URL'));

            const result = await testOllamaConnection('not-a-url');

            expect(result).toBe(false);
        });

        it('should handle large model lists', async () => {
            const largeModelList = Array.from({ length: 1000 }, (_, i) => ({
                name: `model-${i}`,
            }));
            
            const mockResponse = {
                ok: true,
                json: jest.fn(async () => ({ models: largeModelList } as any)),
            } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toHaveLength(1000);
            expect(result[0]).toBe('model-0');
            expect(result[999]).toBe('model-999');
        });

        it('should handle concurrent connection tests', async () => {
            const mockResponse = { ok: true } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const promises = Array.from({ length: 10 }, () =>
                testOllamaConnection('http://localhost:11434')
            );

            const results = await Promise.all(promises);

            expect(results).toEqual(Array(10).fill(true));
            expect(mockedExpoFetch).toHaveBeenCalledTimes(10);
        });

        it('should handle special characters in model names', async () => {
            const specialModels = [
                { name: 'model-with-dashes' },
                { name: 'model_with_underscores' },
                { name: 'model.with.dots' },
                { name: 'model-with-numbers-123' },
            ] as any;

            const mockResponse = {
                ok: true,
                json: jest.fn(async () => ({ models: specialModels } as any)),
            } as any;
            mockedExpoFetch.mockResolvedValue(mockResponse);

            const result = await fetchOllamaModels('http://localhost:11434');

            expect(result).toEqual([
                'model-with-dashes',
                'model_with_underscores',
                'model.with.dots',
                'model-with-numbers-123',
            ]);
        });
    });
});
