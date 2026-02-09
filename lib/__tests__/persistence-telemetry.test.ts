import type { PersistenceAlertEvent } from "../persistence-telemetry";

type PersistenceTelemetryModule = typeof import("../persistence-telemetry");

function loadPersistenceTelemetryModule(): PersistenceTelemetryModule {
  jest.resetModules();

  let telemetry: PersistenceTelemetryModule | null = null;
  jest.isolateModules(() => {
    telemetry = jest.requireActual("../persistence-telemetry") as PersistenceTelemetryModule;
  });

  if (!telemetry) {
    throw new Error("Failed to load persistence telemetry module");
  }

  return telemetry;
}

describe("persistence-telemetry alert hooks", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("emits failure-rate spike alerts for critical persistence flows", () => {
    const telemetry = loadPersistenceTelemetryModule();
    const alerts: PersistenceAlertEvent[] = [];
    telemetry.registerPersistenceAlertHook((event) => {
      alerts.push(event);
    });

    for (let index = 0; index < 10; index += 1) {
      const operation = telemetry.startPersistenceOperation("save");

      if (index < 3) {
        telemetry.failPersistenceOperation(operation, new Error("save failed"));
      } else {
        telemetry.succeedPersistenceOperation(operation);
      }
    }

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "failure_rate_spike",
          operation: "save",
        }),
      ])
    );
  });

  it("emits latency regression alerts when operation latency exceeds SLA", () => {
    const telemetry = loadPersistenceTelemetryModule();
    const alerts: PersistenceAlertEvent[] = [];
    telemetry.registerPersistenceAlertHook((event) => {
      alerts.push(event);
    });

    const operation = telemetry.startPersistenceOperation("save");
    operation.startedAtMs = Date.now() - 2000;
    telemetry.succeedPersistenceOperation(operation);

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "latency_regression",
          operation: "save",
        }),
      ])
    );
  });

  it("emits repeated softlock-signature alerts for recurring signatures", () => {
    const telemetry = loadPersistenceTelemetryModule();
    const alerts: PersistenceAlertEvent[] = [];
    telemetry.registerPersistenceAlertHook((event) => {
      alerts.push(event);
    });

    telemetry.reportSoftlockSignatureEvent("save-queue-softlock", "save", {
      source: "test",
    });
    telemetry.reportSoftlockSignatureEvent("save-queue-softlock", "save", {
      source: "test",
    });
    telemetry.reportSoftlockSignatureEvent("save-queue-softlock", "save", {
      source: "test",
    });

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "repeated_softlock_signature",
          signature: "save-queue-softlock",
          operation: "save",
        }),
      ])
    );
  });
});
