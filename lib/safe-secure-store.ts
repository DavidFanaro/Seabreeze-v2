/**
 * @file safe-secure-store.ts
 * @purpose SecureStore wrapper with fallback for development/testing
 * @connects-to useAuthStore, provider credentials storage
 */

/** Minimal interface for expo-secure-store module */
type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

/** Fallback in-memory storage when SecureStore unavailable */
const fallbackStore = new Map<string, string>();

/** Cached promise for lazy module loading */
let secureStoreModulePromise: Promise<SecureStoreModule | null> | null = null;

/**
 * Lazily loads expo-secure-store module with validation.
 * Returns null if module unavailable or missing required methods.
 */
const loadSecureStoreModule = async (): Promise<SecureStoreModule | null> => {
  if (!secureStoreModulePromise) {
    secureStoreModulePromise = (async () => {
      try {
        const module = (await import("expo-secure-store")) as Partial<SecureStoreModule>;

        if (
          typeof module.getItemAsync === "function" &&
          typeof module.setItemAsync === "function" &&
          typeof module.deleteItemAsync === "function"
        ) {
          return module as SecureStoreModule;
        }
      } catch {
        // Intentionally fall back to in-memory storage.
      }

      return null;
    })();
  }

  return secureStoreModulePromise;
};

export const safeSecureStore = {
  getItemAsync: async (key: string): Promise<string | null> => {
    const module = await loadSecureStoreModule();
    if (!module) {
      return fallbackStore.get(key) ?? null;
    }

    return module.getItemAsync(key);
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    const module = await loadSecureStoreModule();
    if (!module) {
      fallbackStore.set(key, value);
      return;
    }

    await module.setItemAsync(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    const module = await loadSecureStoreModule();
    if (!module) {
      fallbackStore.delete(key);
      return;
    }

    await module.deleteItemAsync(key);
  },
};
