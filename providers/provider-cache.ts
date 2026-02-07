import { LanguageModel } from "ai";
import { ProviderId } from "@/types/provider.types";
import { createIdempotencyKey, createIdempotencyRegistry } from "@/lib/concurrency";

/**
 * @file provider-cache.ts
 * @purpose AI Provider Model Caching System
 * 
 * This module implements a sophisticated caching system for AI language models
 * that optimizes performance in chat applications by re expensive model recreation.
 * 
 * ## Key Features
 * 
 * ### Performance Optimization
 * - **Model Reuse**: Caches initialized model instances to avoid repeated setup costs
 * - **Memory Management**: LRU eviction prevents memory bloat
 * - **Automatic Cleanup**: Time-based expiration ensures fresh model instances
 * 
 * ### Provider Isolation
 * - **Separate Caches**: Each provider maintains independent cache entries
 * - **Selective Invalidation**: Clear specific provider caches without affecting others
 * - **Credential Safety**: Automatic cache invalidation when provider keys change
 * 
 * ### Usage Analytics
 * - **Hit Rate Tracking**: Monitor cache effectiveness
 * - **Access Patterns**: LRU algorithm keeps frequently used models
 * - **Statistics**: Entry age and hit count for performance monitoring
 * 
 * ## Architecture
 * 
 * The cache uses a singleton pattern to ensure consistent caching across
 * the application. Each entry contains:
 * 
 * - **Model Instance**: The actual AI model object
 * - **Creation Timestamp**: For TTL enforcement
 * - **Last Used**: For LRU eviction decisions  
 * - **Hit Count**: For usage statistics
 * 
 * ## Usage Examples
 * 
 * ```typescript
 * // Cache a model
 * providerCache.set('openai', 'gpt-4', model);
 * 
 * // Retrieve from cache
 * const cached = providerCache.get('openai', 'gpt-4');
 * 
 * // Invalidate provider (e.g., after API key change)
 * providerCache.invalidateProvider('openai');
 * 
 * // Get usage statistics
 * const stats = providerCache.getStats();
 * ```
 * 
 * ## Configuration
 * 
 * Default settings balance performance and memory usage:
 * - Maximum entries: 10 models
 * - TTL: 5 minutes  
 * - Cleanup interval: 1 minute
 * 
 * These can be customized per deployment requirements.
 */

/**
 * Cache entry with metadata for tracking usage patterns
 * 
 * This interface defines the structure of each cached item, including
 * the actual model instance and metadata for cache management.
 */
interface CacheEntry {
  model: LanguageModel;           // The cached AI language model instance
  createdAt: number;              // Timestamp when entry was created (ms since epoch)
  lastUsed: number;               // Timestamp of last access (ms since epoch)
  hitCount: number;               // Number of times this entry has been accessed
}

/**
 * Internal cache key format: providerId:modelId
 * 
 * Uses a simple string format to uniquely identify cached models
 * across different providers and model types.
 */
type CacheKey = string;

/**
 * Creates a cache key from provider and model identifiers
 * 
 * @param providerId - The AI provider (apple, openai, openrouter, ollama)
 * @param modelId - The specific model identifier
 * @returns A unique cache key string
 */
function createCacheKey(providerId: ProviderId, modelId: string): CacheKey {
  return `${providerId}:${modelId}`;
}

/**
 * Parses a cache key back into provider and model components
 * 
 * Handles model IDs that may contain colons (e.g., "anthropic:claude-3-sonnet")
 * by joining all parts after the first colon.
 * 
 * @param key - The cache key to parse
 * @returns Object with providerId and modelId, or null if invalid format
 */
function parseCacheKey(key: CacheKey): { providerId: ProviderId; modelId: string } | null {
  const parts = key.split(":");
  if (parts.length < 2) return null;
  return {
    providerId: parts[0] as ProviderId,
    modelId: parts.slice(1).join(":"), // Handle model IDs with colons
  };
}

/**
 * Configuration interface for the provider cache system
 * 
 * Allows customization of cache behavior for different use cases
 * and deployment environments.
 */
export interface ProviderCacheConfig {
  maxEntries: number;          // Maximum number of cached models to store
  maxAgeMs: number;            // Maximum age before automatic expiry (ms)
  cleanupIntervalMs: number;   // Interval for periodic cleanup (ms)
}

/**
 * Default cache configuration optimized for typical usage
 * 
 * - maxEntries: 10 models balances memory usage with performance
 * - maxAgeMs: 5 minutes ensures models stay fresh while avoiding expensive recreations
 * - cleanupIntervalMs: 1 minute provides responsive cleanup without excessive overhead
 */
const DEFAULT_CONFIG: ProviderCacheConfig = {
  maxEntries: 10,
  maxAgeMs: 5 * 60 * 1000, // 5 minutes
  cleanupIntervalMs: 60 * 1000, // 1 minute
};

/**
 * Singleton provider cache for reusing AI model instances
 * 
 * This class implements a sophisticated caching system for AI language models
 * with the following features:
 * 
 * 1. **Memory Management**: LRU (Least Recently Used) eviction strategy
 * 2. **Time-based Expiry**: Automatic cleanup of stale cache entries
 * 3. **Usage Statistics**: Track cache hit rates and access patterns
 * 4. **Provider Isolation**: Separate cache invalidation per provider
 * 5. **Configurable Limits**: Customizable cache size and TTL
 * 
 * The cache is designed to optimize performance in chat applications by
 * avoiding expensive model recreation while managing memory constraints.
 */
class ProviderCache {
  private cache: Map<CacheKey, CacheEntry> = new Map();           // Main storage
  private config: ProviderCacheConfig;                             // Cache settings
  private cleanupTimer: ReturnType<typeof setInterval> | null = null; // Periodic cleanup

  /**
   * Initialize the cache with optional configuration overrides
   * 
   * @param config - Partial configuration to override defaults
   */
  constructor(config: Partial<ProviderCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Start periodic cleanup of expired entries
   * 
   * Initializes a timer that runs the cleanup operation at the configured
   * interval. This ensures stale entries are removed even without explicit
   * access attempts.
   * 
   * The timer is cleared and restarted if called multiple times.
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Retrieve a cached model instance
   * 
   * This method implements the core cache lookup logic with:
   * - Cache hit detection
   - TTL (Time To Live) validation
   - Usage statistics tracking
   * - Automatic cleanup of expired entries
   * 
   * @param providerId - The AI provider identifier
   * @param modelId - The model identifier
   * @returns The cached model or null if not found/expired
   */
  get(providerId: ProviderId, modelId: string): LanguageModel | null {
    const key = createCacheKey(providerId, modelId);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired based on TTL
    const now = Date.now();
    if (now - entry.createdAt > this.config.maxAgeMs) {
      this.cache.delete(key);
      return null;
    }

    // Update usage statistics for LRU tracking
    entry.lastUsed = now;
    entry.hitCount += 1;

    return entry.model;
  }

  /**
   * Cache a model instance
   * 
   * Stores the model in the cache with metadata. If the cache is at capacity
   * and this is a new entry (not updating existing), it will evict the LRU entry.
   * 
   * This method is idempotent - calling it multiple times with the same key
   * will update the entry without creating duplicates.
   * 
   * @param providerId - The AI provider identifier
   * @param modelId - The model identifier  
   * @param model - The model instance to cache
   */
  set(providerId: ProviderId, modelId: string, model: LanguageModel): void {
    const key = createCacheKey(providerId, modelId);
    const now = Date.now();

    // Evict if at capacity (but not if updating existing entry)
    if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      model,
      createdAt: now,
      lastUsed: now,
      hitCount: 0,
    });
  }

  /**
   * Check if a model is cached
   */
  has(providerId: ProviderId, modelId: string): boolean {
    const key = createCacheKey(providerId, modelId);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    // Check expiry
    if (Date.now() - entry.createdAt > this.config.maxAgeMs) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

/**
   * Invalidate all cached models for a specific provider
   * 
   * This method is crucial for scenarios where provider credentials change
   * or when a provider needs to be reset. It efficiently removes all entries
   * belonging to the specified provider without affecting other providers.
   * 
   * Common use cases:
   * - API key rotation
   * - Provider reinitialization
   * - Provider-specific error recovery
   * 
   * @param providerId - The provider whose cached models should be invalidated
   */
  invalidateProvider(providerId: ProviderId): void {
    const keysToDelete: CacheKey[] = [];
    
    // Collect keys that match the provider prefix
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${providerId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    // Delete collected keys (separate collection to avoid iterator issues)
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

/**
   * Clear the entire cache
   * 
   * Removes all cached models and resets the cache to its initial state.
   * This is a destructive operation that affects all providers.
   * 
   * Use cases:
   * - Memory cleanup in low-memory situations
   * - Application logout/user switch
   * - Complete cache reset after configuration changes
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    providers: Record<ProviderId, number>;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const providers: Record<ProviderId, number> = {
      apple: 0,
      openai: 0,
      openrouter: 0,
      ollama: 0,
    };

    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const [key, entry] of this.cache.entries()) {
      const parsed = parseCacheKey(key);
      if (parsed) {
        providers[parsed.providerId] = (providers[parsed.providerId] || 0) + 1;
      }

      if (oldestEntry === null || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      if (newestEntry === null || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }
    }

    return {
      size: this.cache.size,
      providers,
      oldestEntry,
      newestEntry,
    };
  }

/**
   * Remove expired entries based on TTL
   * 
   * This method is called periodically by the cleanup timer and manually
   * during cache operations. It efficiently removes stale entries that
   * have exceeded their maximum age.
   * 
   * The two-pass approach (collect then delete) avoids iterator invalidation
   * issues that can occur when modifying a Map during iteration.
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: CacheKey[] = [];

    // First pass: identify expired entries
    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > this.config.maxAgeMs) {
        keysToDelete.push(key);
      }
    }

    // Second pass: remove identified entries
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

/**
   * Evict the least recently used entry
   * 
   * Implements the LRU (Least Recently Used) eviction strategy by finding
   * the entry with the oldest lastUsed timestamp. This ensures we keep
   * the most frequently accessed models when the cache reaches capacity.
   * 
   * This method is called automatically when inserting a new entry would
   * exceed the configured maxEntries limit.
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey: CacheKey | null = null;
    let oldestAccess = Date.now();

    // Find entry with the oldest lastUsed timestamp
    for (const [key, entry] of this.cache) {
      if (entry.lastUsed < oldestAccess) {
        oldestAccess = entry.lastUsed;
        lruKey = key;
      }
    }

    // Remove the least recently used entry
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

/**
   * Dispose of the cache and clean up resources
   * 
   * This method should be called when the cache is no longer needed
   * to prevent memory leaks. It stops the cleanup timer and clears all
   * cached entries, releasing references to model instances.
   * 
   * Use cases:
   * - Application shutdown
   * - Memory cleanup during user logout
   * - Cache reset after major configuration changes
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Singleton instance
let cacheInstance: ProviderCache | null = null;
const modelCreationRegistry = createIdempotencyRegistry<LanguageModel | null>();

/**
 * Get the global provider cache instance
 */
export function getProviderCache(): ProviderCache {
  if (!cacheInstance) {
    cacheInstance = new ProviderCache();
  }
  return cacheInstance;
}

/**
 * Reset the cache (useful for testing)
 */
export function resetProviderCache(): void {
  if (cacheInstance) {
    cacheInstance.dispose();
    cacheInstance = null;
  }

  modelCreationRegistry.clear();
}

/**
 * Get a cached model or create and cache it
 * 
 * @param providerId - Provider ID
 * @param modelId - Model ID
 * @param createModel - Function to create the model if not cached
 * @returns The cached or newly created model
 */
export function getCachedModel(
  providerId: ProviderId,
  modelId: string,
  createModel: () => LanguageModel | null
): LanguageModel | null {
  const cache = getProviderCache();
  
  // Try to get from cache
  const cached = cache.get(providerId, modelId);
  if (cached) {
    return cached;
  }
  
  // Create new model
  const model = createModel();
  if (model) {
    cache.set(providerId, modelId, model);
  }
  
  return model;
}

/**
 * Get a cached model while deduplicating concurrent creation for the same key.
 */
export async function getCachedModelWithContentionProtection(
  providerId: ProviderId,
  modelId: string,
  createModel: () => Promise<LanguageModel | null>
): Promise<LanguageModel | null> {
  const cache = getProviderCache();
  const cached = cache.get(providerId, modelId);
  if (cached) {
    return cached;
  }

  const operationKey = createIdempotencyKey("provider-cache-model", [providerId, modelId]);
  return modelCreationRegistry.run(operationKey, async () => {
    const existing = cache.get(providerId, modelId);
    if (existing) {
      return existing;
    }

    const model = await createModel();
    if (model) {
      cache.set(providerId, modelId, model);
    }

    return model;
  });
}

/**
 * Invalidate cache when provider credentials change
 */
export function invalidateProviderCache(providerId: ProviderId): void {
  const cache = getProviderCache();
  cache.invalidateProvider(providerId);
}
