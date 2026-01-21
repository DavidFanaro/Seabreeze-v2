import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getCachedModel, invalidateProviderCache, getProviderCache, resetProviderCache } from '../provider-cache';
import { LanguageModel } from 'ai';
import type { ProviderId } from '@/types/provider.types';

describe('ProviderCache', () => {
  beforeEach(() => {
    resetProviderCache();
  });

  describe('getProviderCache', () => {
    it('should return singleton instance', () => {
      const cache1 = getProviderCache();
      const cache2 = getProviderCache();
      expect(cache1).toBe(cache2);
    });
  });

  describe('getCachedModel', () => {
    it('should return null when no model is cached', () => {
      const result = getCachedModel('apple', 'gpt-4', () => null);
      expect(result).toBeNull();
    });

    it('should create and cache model when not exists', () => {
      const mockModel = {} as LanguageModel;
      const createModel = jest.fn(() => mockModel);
      
      const result = getCachedModel('apple', 'gpt-4', createModel);
      
      expect(createModel).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockModel);
    });

    it('should return cached model when it exists', () => {
      const mockModel = {} as LanguageModel;
      const createModel = jest.fn(() => mockModel);
      
      const result1 = getCachedModel('apple', 'gpt-4', createModel);
      const result2 = getCachedModel('apple', 'gpt-4', createModel);
      
      expect(createModel).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should cache different models separately', () => {
      const mockModel1 = {} as LanguageModel;
      const mockModel2 = {} as LanguageModel;
      
      const createModel1 = jest.fn(() => mockModel1);
      const createModel2 = jest.fn(() => mockModel2);
      
      const result1 = getCachedModel('apple', 'gpt-4', createModel1);
      const result2 = getCachedModel('openai', 'gpt-3.5', createModel2);
      
      expect(result1).toBe(mockModel1);
      expect(result2).toBe(mockModel2);
      expect(createModel1).toHaveBeenCalledTimes(1);
      expect(createModel2).toHaveBeenCalledTimes(1);
    });

    it('should return null if createModel returns null', () => {
      const createModel = jest.fn(() => null);
      
      const result = getCachedModel('apple', 'gpt-4', createModel);
      
      expect(result).toBeNull();
      expect(createModel).toHaveBeenCalledTimes(1);
    });

    it('should not cache if createModel returns null', () => {
      const mockModel = {} as LanguageModel;
      const createModelNull = jest.fn(() => null);
      const createModel = jest.fn(() => mockModel);
      
      getCachedModel('apple', 'gpt-4', createModelNull);
      getCachedModel('apple', 'gpt-4', createModel);
      
      expect(createModel).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateProviderCache', () => {
    it('should remove cached model for specific provider', () => {
      const mockModel = {} as LanguageModel;
      getCachedModel('apple', 'gpt-4', () => mockModel);
      
      invalidateProviderCache('apple');
      
      const createModel = jest.fn(() => mockModel);
      getCachedModel('apple', 'gpt-4', createModel);
      expect(createModel).toHaveBeenCalledTimes(1);
    });

    it('should only remove specified provider cache', () => {
      const mockModel1 = {} as LanguageModel;
      const mockModel2 = {} as LanguageModel;
      
      getCachedModel('apple', 'gpt-4', () => mockModel1);
      getCachedModel('openai', 'gpt-3.5', () => mockModel2);
      
      invalidateProviderCache('apple');
      
      const createApple = jest.fn(() => mockModel1);
      const createOpenAI = jest.fn(() => mockModel2);
      
      getCachedModel('apple', 'gpt-4', createApple);
      getCachedModel('openai', 'gpt-3.5', createOpenAI);
      
      expect(createApple).toHaveBeenCalledTimes(1);
      expect(createOpenAI).not.toHaveBeenCalled();
    });

    it('should handle invalidating non-existent provider', () => {
      expect(() => {
        invalidateProviderCache('ollama');
      }).not.toThrow();
    });
  });

  describe('ProviderCache class', () => {
    it('should set and get model correctly', () => {
      const cache = getProviderCache();
      const mockModel = {} as LanguageModel;
      
      cache.set('openai', 'gpt-4', mockModel);
      expect(cache.get('openai', 'gpt-4')).toBe(mockModel);
    });

    it('should remove model correctly', () => {
      const cache = getProviderCache();
      const mockModel = {} as LanguageModel;
      
      cache.set('openai', 'gpt-4', mockModel);
      cache.invalidate('openai', 'gpt-4');
      
      expect(cache.get('openai', 'gpt-4')).toBeNull();
    });

    it('should clear all models', () => {
      const cache = getProviderCache();
      const mockModel = {} as LanguageModel;
      
      cache.set('apple', 'gpt-4', mockModel);
      cache.set('openai', 'gpt-3.5', mockModel);
      cache.set('openrouter', 'claude-3', mockModel);
      
      cache.clear();
      
      expect(cache.get('apple', 'gpt-4')).toBeNull();
      expect(cache.get('openai', 'gpt-3.5')).toBeNull();
      expect(cache.get('openrouter', 'claude-3')).toBeNull();
    });

    it('should have model for provider check', () => {
      const cache = getProviderCache();
      const mockModel = {} as LanguageModel;
      
      cache.set('openai', 'gpt-4', mockModel);
      
      expect(cache.has('openai', 'gpt-4')).toBe(true);
      expect(cache.has('ollama', 'llama2')).toBe(false);
    });

    it('should invalidate all models for a provider', () => {
      const cache = getProviderCache();
      const mockModel = {} as LanguageModel;
      
      cache.set('openai', 'gpt-4', mockModel);
      cache.set('openai', 'gpt-3.5', mockModel);
      cache.set('apple', 'gpt-4', mockModel);
      
      cache.invalidateProvider('openai');
      
      expect(cache.has('openai', 'gpt-4')).toBe(false);
      expect(cache.has('openai', 'gpt-3.5')).toBe(false);
      expect(cache.has('apple', 'gpt-4')).toBe(true);
    });

    it('should return cache statistics', () => {
      const cache = getProviderCache();
      const mockModel = {} as LanguageModel;
      
      cache.set('openai', 'gpt-4', mockModel);
      cache.set('apple', 'gpt-4', mockModel);
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.providers.openai).toBe(1);
      expect(stats.providers.apple).toBe(1);
      expect(stats.providers.openrouter).toBe(0);
      expect(stats.providers.ollama).toBe(0);
      expect(stats.oldestEntry).not.toBeNull();
      expect(stats.newestEntry).not.toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle setting same model multiple times', () => {
      const cache = getProviderCache();
      const mockModel1 = {} as LanguageModel;
      const mockModel2 = {} as LanguageModel;
      
      cache.set('openai', 'gpt-4', mockModel1);
      cache.set('openai', 'gpt-4', mockModel2);
      
      expect(cache.get('openai', 'gpt-4')).toBe(mockModel2);
    });

    it('should handle removing non-existent model', () => {
      const cache = getProviderCache();
      expect(() => {
        cache.invalidate('ollama', 'llama2');
      }).not.toThrow();
    });

    it('should handle getting model after clearing', () => {
      const cache = getProviderCache();
      const mockModel = {} as LanguageModel;
      
      cache.set('openai', 'gpt-4', mockModel);
      cache.clear();
      
      expect(cache.get('openai', 'gpt-4')).toBeNull();
    });
  });
});
