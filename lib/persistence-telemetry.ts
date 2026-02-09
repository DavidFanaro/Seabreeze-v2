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

interface FailureRateWindowState {
  outcomes: boolean[];
  lastAlertedSampleSize: number;
}

interface SoftlockSignatureWindowState {
  timestampsMs: number[];
  lastAlertedCount: number;
}

type PersistenceAlertSeverity = "warning" | "critical";
export type PersistenceAlertType =
  | "failure_rate_spike"
  | "latency_regression"
  | "repeated_softlock_signature";

interface BasePersistenceAlertEvent {
  domain: "persistence";
  type: PersistenceAlertType;
  severity: PersistenceAlertSeverity;
  timestamp: string;
}

export interface PersistenceFailureRateAlertEvent extends BasePersistenceAlertEvent {
  type: "failure_rate_spike";
  operation: PersistenceOperation;
  failureRate: number;
  threshold: number;
  sampleSize: number;
  successCount: number;
  failureCount: number;
}

export interface PersistenceLatencyAlertEvent extends BasePersistenceAlertEvent {
  type: "latency_regression";
  operation: PersistenceOperation;
  latencyMs: number;
  thresholdMs: number;
}

export interface PersistenceSoftlockAlertEvent extends BasePersistenceAlertEvent {
  type: "repeated_softlock_signature";
  signature: string;
  threshold: number;
  occurrenceCount: number;
  windowMs: number;
  operation: PersistenceOperation;
}

export type PersistenceAlertEvent =
  | PersistenceFailureRateAlertEvent
  | PersistenceLatencyAlertEvent
  | PersistenceSoftlockAlertEvent;

export type PersistenceAlertHook = (event: PersistenceAlertEvent) => void;

export interface PersistenceOperationContext {
  operation: PersistenceOperation;
  correlationId: string;
  startedAtMs: number;
  metadata?: Record<string, unknown>;
}

const LATENCY_BUCKETS_MS = [50, 100, 250, 500, 1000, 2000, 5000] as const;
const CRITICAL_FAILURE_RATE_OPERATIONS: readonly PersistenceOperation[] = ["save", "load", "list"];
const FAILURE_RATE_WINDOW_SIZE = 20;
const FAILURE_RATE_MIN_SAMPLE_SIZE = 10;
const FAILURE_RATE_ALERT_THRESHOLD = 0.25;
const LATENCY_SLA_THRESHOLDS_MS: Record<PersistenceOperation, number> = {
  save: 1500,
  load: 1000,
  list: 800,
  title_generation: 2500,
  manual_rename: 700,
};
const SOFTLOCK_SIGNATURE_WINDOW_MS = 5 * 60 * 1000;
const SOFTLOCK_SIGNATURE_ALERT_THRESHOLD = 3;

const metricsStore: Record<PersistenceOperation, OperationMetrics> = {
  save: createEmptyMetrics(),
  load: createEmptyMetrics(),
  list: createEmptyMetrics(),
  title_generation: createEmptyMetrics(),
  manual_rename: createEmptyMetrics(),
};

const failureRateWindows: Record<PersistenceOperation, FailureRateWindowState> = {
  save: createEmptyFailureRateWindow(),
  load: createEmptyFailureRateWindow(),
  list: createEmptyFailureRateWindow(),
  title_generation: createEmptyFailureRateWindow(),
  manual_rename: createEmptyFailureRateWindow(),
};

const softlockSignatureWindows = new Map<string, SoftlockSignatureWindowState>();
const alertHooks = new Set<PersistenceAlertHook>();

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

function createEmptyFailureRateWindow(): FailureRateWindowState {
  return {
    outcomes: [],
    lastAlertedSampleSize: 0,
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

function emitPersistenceAlert(event: PersistenceAlertEvent): void {
  console.warn("[PersistenceAlert]", event);

  for (const hook of alertHooks) {
    try {
      hook(event);
    } catch (error) {
      console.error("[PersistenceAlert] Hook failed", error);
    }
  }
}

function recordOperationOutcome(operation: PersistenceOperation, succeeded: boolean): FailureRateWindowState {
  const window = failureRateWindows[operation];
  window.outcomes.push(succeeded);

  if (window.outcomes.length > FAILURE_RATE_WINDOW_SIZE) {
    window.outcomes.shift();
  }

  return window;
}

function maybeEmitFailureRateAlert(operation: PersistenceOperation): void {
  if (!CRITICAL_FAILURE_RATE_OPERATIONS.includes(operation)) {
    return;
  }

  const window = failureRateWindows[operation];
  const sampleSize = window.outcomes.length;
  if (sampleSize < FAILURE_RATE_MIN_SAMPLE_SIZE) {
    return;
  }

  const failureCount = window.outcomes.filter((succeeded) => !succeeded).length;
  const successCount = sampleSize - failureCount;
  const failureRate = failureCount / sampleSize;

  if (failureRate < FAILURE_RATE_ALERT_THRESHOLD || window.lastAlertedSampleSize === sampleSize) {
    return;
  }

  window.lastAlertedSampleSize = sampleSize;

  emitPersistenceAlert({
    domain: "persistence",
    type: "failure_rate_spike",
    severity: "critical",
    timestamp: new Date().toISOString(),
    operation,
    failureRate,
    threshold: FAILURE_RATE_ALERT_THRESHOLD,
    sampleSize,
    successCount,
    failureCount,
  });
}

function maybeEmitLatencyRegressionAlert(operation: PersistenceOperation, latencyMs: number): void {
  const thresholdMs = LATENCY_SLA_THRESHOLDS_MS[operation];
  if (latencyMs <= thresholdMs) {
    return;
  }

  emitPersistenceAlert({
    domain: "persistence",
    type: "latency_regression",
    severity: "warning",
    timestamp: new Date().toISOString(),
    operation,
    latencyMs,
    thresholdMs,
  });
}

function extractSoftlockSignature(metadata?: Record<string, unknown>): string | null {
  if (!metadata) {
    return null;
  }

  const signatureCandidate =
    metadata.softlockSignature
    ?? metadata.softlock_signature
    ?? metadata["softlock-signature"];

  if (typeof signatureCandidate !== "string") {
    return null;
  }

  const signature = signatureCandidate.trim();
  return signature.length > 0 ? signature : null;
}

function recordSoftlockSignatureOccurrence(
  operation: PersistenceOperation,
  signature: string,
  timestampMs: number
): void {
  const existing = softlockSignatureWindows.get(signature) ?? {
    timestampsMs: [],
    lastAlertedCount: 0,
  };

  existing.timestampsMs.push(timestampMs);
  existing.timestampsMs = existing.timestampsMs.filter(
    (value) => timestampMs - value <= SOFTLOCK_SIGNATURE_WINDOW_MS
  );

  const occurrenceCount = existing.timestampsMs.length;
  if (
    occurrenceCount >= SOFTLOCK_SIGNATURE_ALERT_THRESHOLD
    && occurrenceCount !== existing.lastAlertedCount
  ) {
    existing.lastAlertedCount = occurrenceCount;
    emitPersistenceAlert({
      domain: "persistence",
      type: "repeated_softlock_signature",
      severity: "critical",
      timestamp: new Date(timestampMs).toISOString(),
      signature,
      threshold: SOFTLOCK_SIGNATURE_ALERT_THRESHOLD,
      occurrenceCount,
      windowMs: SOFTLOCK_SIGNATURE_WINDOW_MS,
      operation,
    });
  }

  softlockSignatureWindows.set(signature, existing);
}

function evaluateAlertingRules(
  operation: PersistenceOperation,
  succeeded: boolean,
  latencyMs: number,
  metadata?: Record<string, unknown>
): void {
  recordOperationOutcome(operation, succeeded);
  maybeEmitFailureRateAlert(operation);
  maybeEmitLatencyRegressionAlert(operation, latencyMs);

  const softlockSignature = extractSoftlockSignature(metadata);
  if (softlockSignature) {
    recordSoftlockSignatureOccurrence(operation, softlockSignature, Date.now());
  }
}

export function registerPersistenceAlertHook(hook: PersistenceAlertHook): () => void {
  alertHooks.add(hook);

  return () => {
    alertHooks.delete(hook);
  };
}

export function reportSoftlockSignatureEvent(
  signature: string,
  operation: PersistenceOperation,
  metadata?: Record<string, unknown>
): void {
  const normalizedSignature = signature.trim();
  if (!normalizedSignature) {
    return;
  }

  const timestampMs = Date.now();
  emitPersistenceEvent({
    domain: "persistence",
    operation,
    status: "failed",
    correlationId: generateCorrelationId(operation),
    errorClassification: "unknown",
    latencyMs: 0,
    timestamp: new Date(timestampMs).toISOString(),
    metadata: {
      ...metadata,
      softlockSignature: normalizedSignature,
      softlockReportedAt: timestampMs,
    },
  });

  recordSoftlockSignatureOccurrence(operation, normalizedSignature, timestampMs);
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
  const mergedMetadata = {
    ...context.metadata,
    ...metadata,
  };

  updateSuccessMetrics(context.operation, latencyMs);
  evaluateAlertingRules(context.operation, true, latencyMs, mergedMetadata);

  emitPersistenceEvent({
    domain: "persistence",
    operation: context.operation,
    status: "succeeded",
    correlationId: context.correlationId,
    errorClassification: "none",
    latencyMs,
    timestamp: new Date().toISOString(),
    metadata: mergedMetadata,
  });
}

export function failPersistenceOperation(
  context: PersistenceOperationContext,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const latencyMs = Date.now() - context.startedAtMs;
  const classification = classifyError(error).category;
  const mergedMetadata = {
    ...context.metadata,
    ...metadata,
    errorMessage: error instanceof Error ? error.message : String(error),
  };

  updateFailureMetrics(context.operation, latencyMs);
  evaluateAlertingRules(context.operation, false, latencyMs, mergedMetadata);

  emitPersistenceEvent({
    domain: "persistence",
    operation: context.operation,
    status: "failed",
    correlationId: context.correlationId,
    errorClassification: classification,
    latencyMs,
    timestamp: new Date().toISOString(),
    metadata: mergedMetadata,
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
