import { LanguageModel } from "ai";
import { ProviderId } from "@/lib/types/provider-types";

/**
 * Cache entry with metadata
 */
interface CacheEntry {
  model: LanguageModel;
  createdAt: number;
  lastUsed: number;
  hitCount: number;
}

/**
 * Cache key format: providerId:modelId
 */
type CacheKey = string;

function createCacheKey(providerId: ProviderId, modelId: string): CacheKey {
  return `${providerId}:${modelId}`;
}

function parseCacheKey(key: CacheKey): { providerId: ProviderId; modelId: string } | null {
  const parts = key.split(":");
  if (parts.length < 2) return null;
  return {
    providerId: parts[0] as ProviderId,
    modelId: parts.slice(1).join(":"), // Handle model IDs with colons
  };
}

/**
 * Configuration for the provider cache
 */
export interface ProviderCacheConfig {
  maxEntries: number;
  maxAgeMs: number;
  cleanupIntervalMs: number;
}

const DEFAULT_CONFIG: ProviderCacheConfig = {
  maxEntries: 10,
  maxAgeMs: 5 * 60 * 1000, // 5 minutes
  cleanupIntervalMs: 60 * 1000, // 1 minute
};

/**
 * Singleton provider cache for reusing model instances
 */
class ProviderCache {
  private cache: Map<CacheKey, CacheEntry> = new Map();
  private config: ProviderCacheConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<ProviderCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Start periodic cleanup of expired entries
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
   * Get a cached model or null if not found/expired
   */
  get(providerId: ProviderId, modelId: string): LanguageModel | null {
    const key = createCacheKey(providerId, modelId);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.createdAt > this.config.maxAgeMs) {
      this.cache.delete(key);
      return null;
    }

    // Update usage stats
    entry.lastUsed = now;
    entry.hitCount += 1;

    return entry.model;
  }

  /**
   * Cache a model instance
   */
  set(providerId: ProviderId, modelId: string, model: LanguageModel): void {
    const key = createCacheKey(providerId, modelId);
    const now = Date.now();

    // Evict if at capacity
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
   * Useful when API key changes
   */
  invalidateProvider(providerId: ProviderId): void {
    const keysToDelete: CacheKey[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${providerId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Invalidate a specific model
   */
  invalidate(providerId: ProviderId, modelId: string): void {
    const key = createCacheKey(providerId, modelId);
    this.cache.delete(key);
  }

  /**
   * Clear all cached models
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
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: CacheKey[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > this.config.maxAgeMs) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Evict the least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey: CacheKey | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastUsed < lruTime) {
        lruTime = entry.lastUsed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Stop the cleanup timer (for testing/cleanup)
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
 * Invalidate cache when provider credentials change
 */
export function invalidateProviderCache(providerId: ProviderId): void {
  const cache = getProviderCache();
  cache.invalidateProvider(providerId);
}
