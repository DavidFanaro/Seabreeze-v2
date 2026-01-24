/**
 * @file imageCache.ts
 * @purpose 100MB LRU image cache with lazy loading support
 */

import * as FileSystem from "expo-file-system";
import { generateImageCacheKey } from "../parsers";

const MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const CACHE_DIRECTORY = `${(FileSystem as any).documentDirectory || ""}markdown_images/`;

interface CacheEntry {
    key: string;
    url: string;
    localPath: string;
    size: number;
    lastAccessed: number;
    width?: number;
    height?: number;
}

interface CacheMetadata {
    entries: Record<string, CacheEntry>;
    totalSize: number;
    lastCleanup: number;
}

let cacheMetadata: CacheMetadata | null = null;
let isInitialized = false;

/**
 * Initialize image cache
 */
export const initializeImageCache = async (): Promise<void> => {
    if (isInitialized) return;

    try {
        // Ensure cache directory exists
        const dirInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
        }

        cacheMetadata = {
            entries: {},
            totalSize: 0,
            lastCleanup: Date.now(),
        };

        isInitialized = true;

        // Run cleanup if needed
        if (Date.now() - cacheMetadata.lastCleanup > 24 * 60 * 60 * 1000) {
            await cleanupCache();
        }
    } catch (error) {
        console.warn("Failed to initialize image cache:", error);
        cacheMetadata = {
            entries: {},
            totalSize: 0,
            lastCleanup: Date.now(),
        };
        isInitialized = true;
    }
};

/**
 * Get cached image path or null if not cached
 */
export const getCachedImagePath = async (url: string): Promise<string | null> => {
    await initializeImageCache();

    if (!cacheMetadata) return null;

    const key = generateImageCacheKey(url);
    const entry = cacheMetadata.entries[key];

    if (!entry) return null;

    // Check if file still exists
    try {
        const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
        if (!fileInfo.exists) {
            // File was deleted, remove from cache
            delete cacheMetadata.entries[key];
            cacheMetadata.totalSize -= entry.size;
            return null;
        }

        // Update last accessed time
        entry.lastAccessed = Date.now();

        return entry.localPath;
    } catch {
        return null;
    }
};

/**
 * Cache an image from URL
 */
export const cacheImage = async (
    url: string
): Promise<{ localPath: string; width?: number; height?: number } | null> => {
    await initializeImageCache();

    if (!cacheMetadata) return null;

    const key = generateImageCacheKey(url);

    // Check if already cached
    const existingPath = await getCachedImagePath(url);
    if (existingPath) {
        const entry = cacheMetadata.entries[key];
        return {
            localPath: existingPath,
            width: entry?.width,
            height: entry?.height,
        };
    }

    try {
        // Download image
        const extension = getExtensionFromUrl(url) || "png";
        const localPath = `${CACHE_DIRECTORY}${key}.${extension}`;

        const downloadResult = await FileSystem.downloadAsync(url, localPath);

        if (downloadResult.status !== 200) {
            return null;
        }

        // Get file size
        const fileInfo = await FileSystem.getInfoAsync(localPath) as { size?: number };
        const fileSize = fileInfo.size || 0;

        // Ensure we have space in cache
        await ensureCacheSpace(fileSize);

        // Add to cache
        const entry: CacheEntry = {
            key,
            url,
            localPath,
            size: fileSize,
            lastAccessed: Date.now(),
        };

        cacheMetadata.entries[key] = entry;
        cacheMetadata.totalSize += fileSize;

        return { localPath };
    } catch (error) {
        console.warn("Failed to cache image:", error);
        return null;
    }
};

/**
 * Ensure there's enough space in cache by removing old entries
 */
const ensureCacheSpace = async (neededBytes: number): Promise<void> => {
    if (!cacheMetadata) return;

    while (cacheMetadata.totalSize + neededBytes > MAX_CACHE_SIZE_BYTES) {
        // Find least recently used entry
        let oldestKey: string | null = null;
        let oldestTime = Date.now();

        for (const [key, entry] of Object.entries(cacheMetadata.entries)) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (!oldestKey) break;

        // Remove oldest entry
        const entry = cacheMetadata.entries[oldestKey];
        try {
            await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
        } catch {
            // Ignore deletion errors
        }

        cacheMetadata.totalSize -= entry.size;
        delete cacheMetadata.entries[oldestKey];
    }
};

/**
 * Clean up stale cache entries
 */
const cleanupCache = async (): Promise<void> => {
    if (!cacheMetadata) return;

    const keysToRemove: string[] = [];

    for (const [key, entry] of Object.entries(cacheMetadata.entries)) {
        try {
            const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
            if (!fileInfo.exists) {
                keysToRemove.push(key);
            }
        } catch {
            keysToRemove.push(key);
        }
    }

    for (const key of keysToRemove) {
        const entry = cacheMetadata.entries[key];
        cacheMetadata.totalSize -= entry.size;
        delete cacheMetadata.entries[key];
    }

    cacheMetadata.lastCleanup = Date.now();
};

/**
 * Clear all cached images
 */
export const clearImageCache = async (): Promise<void> => {
    try {
        await FileSystem.deleteAsync(CACHE_DIRECTORY, { idempotent: true });
        await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });

        cacheMetadata = {
            entries: {},
            totalSize: 0,
            lastCleanup: Date.now(),
        };
    } catch (error) {
        console.warn("Failed to clear image cache:", error);
    }
};

/**
 * Get current cache size in bytes
 */
export const getCacheSize = async (): Promise<number> => {
    await initializeImageCache();
    return cacheMetadata?.totalSize || 0;
};

/**
 * Get formatted cache size string
 */
export const getFormattedCacheSize = async (): Promise<string> => {
    const bytes = await getCacheSize();

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Preload images for a list of URLs
 */
export const preloadImages = async (urls: string[]): Promise<void> => {
    const promises = urls.map((url) => cacheImage(url).catch(() => null));
    await Promise.all(promises);
};

/**
 * Get file extension from URL
 */
const getExtensionFromUrl = (url: string): string | null => {
    try {
        const pathname = new URL(url).pathname;
        const match = pathname.match(/\.(\w+)$/);
        return match ? match[1].toLowerCase() : null;
    } catch {
        const match = url.match(/\.(\w+)(?:[?#]|$)/);
        return match ? match[1].toLowerCase() : null;
    }
};

/**
 * Check if URL is already cached
 */
export const isImageCached = async (url: string): Promise<boolean> => {
    const path = await getCachedImagePath(url);
    return path !== null;
};
