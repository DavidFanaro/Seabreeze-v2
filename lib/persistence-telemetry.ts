import { classifyError, type ErrorCategory } from "@/providers/fallback-chain";

export type PersistenceOperation =
  | "save"
  | "load"
  | "list"
  | "title_generation"
  | "manual_rename";

export type PersistenceOperationStatus = "started" | "succeeded" | "failed";
export type ErrorClassification = ErrorCategory | "none";

interface PersistenceTelemetryEvent {
  domain: "persistence";
  operation: PersistenceOperation;
  status: PersistenceOperationStatus;
  correlationId: string;
  errorClassification: ErrorClassification;
  latencyMs: number | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface OperationMetrics {
  successCount: number;
  failureCount: number;
  latencyHistogram: Record<string, number>;
}

export interface PersistenceOperationContext {
  operation: PersistenceOperation;
  correlationId: string;
  startedAtMs: number;
  metadata?: Record<string, unknown>;
}

const LATENCY_BUCKETS_MS = [50, 100, 250, 500, 1000, 2000, 5000] as const;

const metricsStore: Record<PersistenceOperation, OperationMetrics> = {
  save: createEmptyMetrics(),
  load: createEmptyMetrics(),
  list: createEmptyMetrics(),
  title_generation: createEmptyMetrics(),
  manual_rename: createEmptyMetrics(),
};

function createEmptyMetrics(): OperationMetrics {
  const histogram = LATENCY_BUCKETS_MS.reduce<Record<string, number>>((acc, bucket) => {
    acc[`<=${bucket}ms`] = 0;
    return acc;
  }, {});
  histogram[">5000ms"] = 0;

  return {
    successCount: 0,
    failureCount: 0,
    latencyHistogram: histogram,
  };
}

function generateCorrelationId(operation: PersistenceOperation): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${operation}-${Date.now()}-${randomPart}`;
}

function classifyLatencyBucket(latencyMs: number): string {
  for (const bucket of LATENCY_BUCKETS_MS) {
    if (latencyMs <= bucket) {
      return `<=${bucket}ms`;
    }
  }

  return ">5000ms";
}

function emitPersistenceEvent(event: PersistenceTelemetryEvent): void {
  console.log("[PersistenceTelemetry]", event);
}

function updateSuccessMetrics(operation: PersistenceOperation, latencyMs: number): void {
  const metrics = metricsStore[operation];
  metrics.successCount += 1;
  metrics.latencyHistogram[classifyLatencyBucket(latencyMs)] += 1;
}

function updateFailureMetrics(operation: PersistenceOperation, latencyMs: number): void {
  const metrics = metricsStore[operation];
  metrics.failureCount += 1;
  metrics.latencyHistogram[classifyLatencyBucket(latencyMs)] += 1;
}

export function startPersistenceOperation(
  operation: PersistenceOperation,
  metadata?: Record<string, unknown>
): PersistenceOperationContext {
  const context: PersistenceOperationContext = {
    operation,
    correlationId: generateCorrelationId(operation),
    startedAtMs: Date.now(),
    metadata,
  };

  emitPersistenceEvent({
    domain: "persistence",
    operation,
    status: "started",
    correlationId: context.correlationId,
    errorClassification: "none",
    latencyMs: null,
    timestamp: new Date(context.startedAtMs).toISOString(),
    metadata,
  });

  return context;
}

export function succeedPersistenceOperation(
  context: PersistenceOperationContext,
  metadata?: Record<string, unknown>
): void {
  const latencyMs = Date.now() - context.startedAtMs;
  updateSuccessMetrics(context.operation, latencyMs);

  emitPersistenceEvent({
    domain: "persistence",
    operation: context.operation,
    status: "succeeded",
    correlationId: context.correlationId,
    errorClassification: "none",
    latencyMs,
    timestamp: new Date().toISOString(),
    metadata: {
      ...context.metadata,
      ...metadata,
    },
  });
}

export function failPersistenceOperation(
  context: PersistenceOperationContext,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const latencyMs = Date.now() - context.startedAtMs;
  const classification = classifyError(error).category;

  updateFailureMetrics(context.operation, latencyMs);

  emitPersistenceEvent({
    domain: "persistence",
    operation: context.operation,
    status: "failed",
    correlationId: context.correlationId,
    errorClassification: classification,
    latencyMs,
    timestamp: new Date().toISOString(),
    metadata: {
      ...context.metadata,
      ...metadata,
      errorMessage: error instanceof Error ? error.message : String(error),
    },
  });
}

export function getPersistenceMetricsSnapshot(): Record<PersistenceOperation, OperationMetrics> {
  return {
    save: {
      successCount: metricsStore.save.successCount,
      failureCount: metricsStore.save.failureCount,
      latencyHistogram: { ...metricsStore.save.latencyHistogram },
    },
    load: {
      successCount: metricsStore.load.successCount,
      failureCount: metricsStore.load.failureCount,
      latencyHistogram: { ...metricsStore.load.latencyHistogram },
    },
    list: {
      successCount: metricsStore.list.successCount,
      failureCount: metricsStore.list.failureCount,
      latencyHistogram: { ...metricsStore.list.latencyHistogram },
    },
    title_generation: {
      successCount: metricsStore.title_generation.successCount,
      failureCount: metricsStore.title_generation.failureCount,
      latencyHistogram: { ...metricsStore.title_generation.latencyHistogram },
    },
    manual_rename: {
      successCount: metricsStore.manual_rename.successCount,
      failureCount: metricsStore.manual_rename.failureCount,
      latencyHistogram: { ...metricsStore.manual_rename.latencyHistogram },
    },
  };
}
