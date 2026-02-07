type PersistedStoreId = "auth" | "provider" | "settings" | "chatOverride";

const STORE_DEPENDENCIES: Record<PersistedStoreId, PersistedStoreId[]> = {
  auth: [],
  provider: [],
  settings: [],
  chatOverride: ["provider"],
};

const hydrationStatus: Record<PersistedStoreId, boolean> = {
  auth: false,
  provider: false,
  settings: false,
  chatOverride: false,
};

export interface HydrationMetaState {
  writeVersion: number;
  hasHydrated: boolean;
}

export const INITIAL_HYDRATION_META: HydrationMetaState = {
  writeVersion: 0,
  hasHydrated: false,
};

export function markStoreHydrated(storeId: PersistedStoreId): void {
  hydrationStatus[storeId] = true;
}

export function isStoreHydrated(storeId: PersistedStoreId): boolean {
  return hydrationStatus[storeId];
}

export function areStoreDependenciesHydrated(storeId: PersistedStoreId): boolean {
  return STORE_DEPENDENCIES[storeId].every((dependencyStoreId) => {
    return hydrationStatus[dependencyStoreId];
  });
}

export function markHydrationReady(
  currentMeta: HydrationMetaState,
  storeId: PersistedStoreId,
): HydrationMetaState {
  markStoreHydrated(storeId);
  return {
    ...currentMeta,
    hasHydrated: true,
  };
}

export function resolveHydrationMerge<TState extends { __meta: HydrationMetaState }>(
  persistedState: unknown,
  currentState: TState,
): TState {
  const parsedPersistedState = (persistedState ?? {}) as Partial<TState>;
  const persistedWriteVersion = parsedPersistedState.__meta?.writeVersion ?? 0;
  const currentWriteVersion = currentState.__meta.writeVersion;

  if (persistedWriteVersion < currentWriteVersion) {
    return currentState;
  }

  return {
    ...currentState,
    ...parsedPersistedState,
    __meta: {
      writeVersion: Math.max(persistedWriteVersion, currentWriteVersion),
      hasHydrated: currentState.__meta.hasHydrated,
    },
  };
}

export function applyRuntimeWriteVersion<TState extends { __meta: HydrationMetaState }>(
  currentState: TState,
  partialState: Partial<TState> | TState,
): TState {
  if (partialState === currentState) {
    return currentState;
  }

  return {
    ...partialState,
    __meta: {
      ...currentState.__meta,
      writeVersion: currentState.__meta.writeVersion + 1,
    },
  } as TState;
}

export function resetHydrationRegistryForTests(): void {
  hydrationStatus.auth = false;
  hydrationStatus.provider = false;
  hydrationStatus.settings = false;
  hydrationStatus.chatOverride = false;
}
