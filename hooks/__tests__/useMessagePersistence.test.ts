import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ModelMessage } from "ai";

import { useMessagePersistence } from "../useMessagePersistence";
import useDatabase from "../useDatabase";

jest.mock("../useDatabase", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../useErrorRecovery", () => ({
  DEFAULT_RETRY_CONFIG: {
    maxRetries: 3,
    baseDelayMs: 250,
    maxDelayMs: 5000,
    retryableCategories: ["unknown"],
  },
  executeWithRetry: jest.fn(async (runner: () => Promise<unknown>) => {
    try {
      const data = await runner();
      return {
        success: true,
        data,
        attempts: 1,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        attempts: 1,
      };
    }
  }),
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("useMessagePersistence", () => {
  const insertReturningMock = jest.fn();
  const insertValuesMock = jest.fn(() => ({ returning: insertReturningMock }));
  const insertMock = jest.fn(() => ({ values: insertValuesMock }));

  const updateWhereMock = jest.fn(async () => undefined);
  const updateSetMock = jest.fn(() => ({ where: updateWhereMock }));
  const updateMock = jest.fn(() => ({ set: updateSetMock }));

  beforeEach(() => {
    jest.clearAllMocks();

    insertReturningMock.mockResolvedValue([{ id: 101 }]);

    (useDatabase as jest.Mock).mockReturnValue({
      insert: insertMock,
      update: updateMock,
    });
  });

  it("deduplicates concurrent identical saves at the persistence boundary", async () => {
    const deferredInsert = createDeferred<{ id: number }[]>();
    insertReturningMock.mockReturnValue(deferredInsert.promise);

    const { result } = renderHook(() =>
      useMessagePersistence({
        streamState: "idle",
        chatIdParam: "new",
        messages: [{ role: "user", content: "hello" }],
        thinkingOutput: [],
        providerId: "apple",
        modelId: "apple.on.device",
        title: "Chat",
        enabled: true,
      })
    );

    let firstSave!: Promise<void>;
    let secondSave!: Promise<void>;

    act(() => {
      firstSave = result.current.triggerSave();
      secondSave = result.current.triggerSave();
    });

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    deferredInsert.resolve([{ id: 777 }]);

    await act(async () => {
      await Promise.all([firstSave, secondSave]);
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
    expect(result.current.lastSavedChatId).toBe(777);
  });

  it("serializes superseding writes and upgrades follow-up save to update", async () => {
    const deferredInsert = createDeferred<{ id: number }[]>();
    insertReturningMock.mockReturnValue(deferredInsert.promise);

    const baseProps = {
      streamState: "idle" as const,
      chatIdParam: "new",
      thinkingOutput: [] as string[],
      providerId: "apple" as const,
      modelId: "apple.on.device",
      title: "My Chat",
      enabled: true,
    };

    let currentMessages: ModelMessage[] = [{ role: "user", content: "first" }];

    const { result, rerender } = renderHook(() =>
      useMessagePersistence({
        ...baseProps,
        messages: currentMessages,
      })
    );

    let firstSave!: Promise<void>;
    let secondSave!: Promise<void>;

    act(() => {
      firstSave = result.current.triggerSave();
    });

    currentMessages = [{ role: "user", content: "second" }];
    rerender(undefined);

    act(() => {
      secondSave = result.current.triggerSave();
    });

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledTimes(0);
    });

    deferredInsert.resolve([{ id: 314 }]);

    await act(async () => {
      await Promise.all([firstSave, secondSave]);
    });

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "My Chat",
          messages: [{ role: "user", content: "second" }],
        })
      );
    });
  });
});
