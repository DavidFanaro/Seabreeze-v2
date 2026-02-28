type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const fallbackStore = new Map<string, string>();

let secureStoreModulePromise: Promise<SecureStoreModule | null> | null = null;

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
