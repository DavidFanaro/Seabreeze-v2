import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
    createAppleModel,
    isAppleModel,
    testAppleIntelligence,
    type AppleLanguageModel,
} from '../apple-provider';
import { isAppleIntelligenceCompatible } from '@/lib/deviceCapabilities';

// Mock the device capabilities module
jest.mock('@/lib/deviceCapabilities');
const mockedIsAppleIntelligenceCompatible = isAppleIntelligenceCompatible as jest.MockedFunction<typeof isAppleIntelligenceCompatible>;

// Mock the @react-native-ai/apple package
jest.mock('@react-native-ai/apple', () => ({
    apple: jest.fn(() => ({
        provider: 'apple',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
    })),
}));

describe('Apple Provider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Set up default mock behavior
        const { apple } = require('@react-native-ai/apple');
        apple.mockReturnValue({
            provider: 'apple',
            doGenerate: jest.fn(),
            doStream: jest.fn(),
        });
    });

    describe('createAppleModel', () => {
        it('should create an Apple language model instance', () => {
            const model = createAppleModel();

            expect(model).toBeDefined();
            expect(model).toHaveProperty('provider', 'apple');
            
            const { apple } = require('@react-native-ai/apple');
            expect(apple).toHaveBeenCalledTimes(1);
        });

        it('should return a new instance on each call', () => {
            const model1 = createAppleModel();
            const model2 = createAppleModel();

            // Mock returns same object reference, so we check it's a distinct call
            expect(model1).toBeDefined();
            expect(model2).toBeDefined();
            
            const { apple } = require('@react-native-ai/apple');
            expect(apple).toHaveBeenCalledTimes(2);
        });
    });

    describe('isAppleModel', () => {
        it('should return true for valid Apple model', () => {
            const appleModel = createAppleModel();
            const result = isAppleModel(appleModel);

            expect(result).toBe(true);
        });

        it('should return false for null', () => {
            const result = isAppleModel(null);

            expect(result).toBe(false);
        });

        it('should return false for undefined', () => {
            const result = isAppleModel(undefined);

            expect(result).toBe(false);
        });

        it('should return false for non-object types', () => {
            expect(isAppleModel('string')).toBe(false);
            expect(isAppleModel(123)).toBe(false);
            expect(isAppleModel(true)).toBe(false);
            expect(isAppleModel([])).toBe(false);
        });

        it('should return false for object without provider property', () => {
            const fakeModel = { name: 'fake-model' };
            const result = isAppleModel(fakeModel);

            expect(result).toBe(false);
        });

        it('should return false for object with non-apple provider', () => {
            const fakeModel = { provider: 'openai' };
            const result = isAppleModel(fakeModel);

            expect(result).toBe(false);
        });

        it('should return false for object with apple provider but null', () => {
            const fakeModel = { provider: null };
            const result = isAppleModel(fakeModel);

            expect(result).toBe(false);
        });
    });

    describe('testAppleIntelligence', () => {
        it('should return true when device is compatible and model creation succeeds', async () => {
            mockedIsAppleIntelligenceCompatible.mockReturnValue(true);

            const result = await testAppleIntelligence();

            expect(result).toBe(true);
            expect(mockedIsAppleIntelligenceCompatible).toHaveBeenCalledTimes(1);
            
            const { apple } = require('@react-native-ai/apple');
            expect(apple).toHaveBeenCalledTimes(1);
        });

        it('should return false when device is not compatible', async () => {
            mockedIsAppleIntelligenceCompatible.mockReturnValue(false);

            const result = await testAppleIntelligence();

            expect(result).toBe(false);
            expect(mockedIsAppleIntelligenceCompatible).toHaveBeenCalledTimes(1);
            
            const { apple } = require('@react-native-ai/apple');
            expect(apple).not.toHaveBeenCalled();
        });

        it('should return false when model creation throws an error', async () => {
            mockedIsAppleIntelligenceCompatible.mockReturnValue(true);
            
            const { apple } = require('@react-native-ai/apple');
            apple.mockImplementation(() => {
                throw new Error('Apple Intelligence not available');
            });

            const result = await testAppleIntelligence();

            expect(result).toBe(false);
            expect(mockedIsAppleIntelligenceCompatible).toHaveBeenCalledTimes(1);
            expect(apple).toHaveBeenCalledTimes(1);
        });

        it('should return false when model creation returns falsy value', async () => {
            mockedIsAppleIntelligenceCompatible.mockReturnValue(true);
            
            const { apple } = require('@react-native-ai/apple');
            apple.mockReturnValue(null);

            const result = await testAppleIntelligence();

            expect(result).toBe(false);
            expect(mockedIsAppleIntelligenceCompatible).toHaveBeenCalledTimes(1);
            expect(apple).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple calls gracefully', async () => {
            mockedIsAppleIntelligenceCompatible.mockReturnValue(true);

            const results = await Promise.all([
                testAppleIntelligence(),
                testAppleIntelligence(),
                testAppleIntelligence(),
            ]);

            expect(results).toEqual([true, true, true]);
            expect(mockedIsAppleIntelligenceCompatible).toHaveBeenCalledTimes(3);
            
            const { apple } = require('@react-native-ai/apple');
            expect(apple).toHaveBeenCalledTimes(3);
        });
    });

    describe('AppleLanguageModel Type', () => {
        it('should correctly type the Apple model', () => {
            const model: AppleLanguageModel = createAppleModel();

            // This should compile without TypeScript errors
            expect(model).toBeDefined();
            expect(model).toHaveProperty('provider', 'apple');
        });
    });

    describe('Integration with Type Guard', () => {
        it('should work with type narrowing in conditional logic', () => {
            const unknownModel: unknown = createAppleModel();

            if (isAppleModel(unknownModel)) {
                // TypeScript should know this is AppleLanguageModel
                expect(unknownModel.provider).toBe('apple');
                expect(typeof unknownModel.doGenerate).toBe('function');
                expect(typeof unknownModel.doStream).toBe('function');
            } else {
                // This should not happen in this test
                expect(false).toBe(true);
            }
        });

        it('should handle mixed provider models correctly', () => {
            const models: unknown[] = [
                createAppleModel(),
                { provider: 'openai' },
                null,
                'not-a-model',
                createAppleModel(),
            ];

            const appleModels = models.filter(isAppleModel);

            expect(appleModels).toHaveLength(2);
            appleModels.forEach(model => {
                expect(model.provider).toBe('apple');
            });
        });
    });

    describe('Error Scenarios', () => {
        it('should handle device compatibility check throwing error', async () => {
            mockedIsAppleIntelligenceCompatible.mockImplementation(() => {
                throw new Error('Device check failed');
            });

            const result = await testAppleIntelligence();

            expect(result).toBe(false);
            expect(mockedIsAppleIntelligenceCompatible).toHaveBeenCalledTimes(1);
            
            const { apple } = require('@react-native-ai/apple');
            expect(apple).not.toHaveBeenCalled();
        });

        it('should handle sync errors gracefully', async () => {
            mockedIsAppleIntelligenceCompatible.mockReturnValue(true);
            
            const { apple } = require('@react-native-ai/apple');
            apple.mockImplementation(() => {
                throw new Error('Sync initialization failed');
            });

            const result = await testAppleIntelligence();

            expect(result).toBe(false);
        });
    });
});