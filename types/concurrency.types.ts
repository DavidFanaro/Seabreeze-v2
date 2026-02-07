export interface RequestToken {
  scope: string;
  sequence: number;
  createdAt: number;
}

export interface SequenceGuard {
  next(): RequestToken;
  current(): RequestToken | null;
  isCurrent(token: RequestToken): boolean;
}

export interface AbortLease {
  signal: AbortSignal;
  abort(reason?: string): void;
  isAborted(): boolean;
}

export interface AbortManager {
  begin(reason?: string): AbortLease;
  abortActive(reason?: string): void;
  withAbort<T>(runner: (signal: AbortSignal) => Promise<T>): Promise<T>;
  hasActive(): boolean;
}

export type IdempotencyPart = string | number | boolean | null | undefined;

export interface IdempotencyRegistry<T> {
  run(key: string, task: () => Promise<T>): Promise<T>;
  has(key: string): boolean;
  clear(key?: string): void;
  size(): number;
}
