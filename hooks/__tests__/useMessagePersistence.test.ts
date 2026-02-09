import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ModelMessage } from "ai";

import { useMessagePersistence } from "../useMessagePersistence";
import useDatabase from "../useDatabase";
import { executeWithRetry } from "../useErrorRecovery";

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
  const executeWithRetryMock = executeWithRetry as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    insertReturningMock.mockResolvedValue([{ id: 101 }]);

    (useDatabase as jest.Mock).mockReturnValue({
      insert: insertMock,
      update: updateMock,
    });

    executeWithRetryMock.mockImplementation(async (runner: () => Promise<unknown>) => {
      try {
        const data = await runner();
        return {
          success: true,
          data,
          attempts: 1,
          shouldFallback: false,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            category: "unknown",
            isRetryable: true,
            shouldFallback: true,
            message: error instanceof Error ? error.message : String(error),
          },
          attempts: 1,
          shouldFallback: true,
        };
      }
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

  it("automatically persists when stream transitions to completed", async () => {
    const baseProps = {
      chatIdParam: "new",
      messages: [{ role: "user", content: "persist me" }] as ModelMessage[],
      thinkingOutput: [] as string[],
      providerId: "apple" as const,
      modelId: "apple.on.device",
      title: "Chat",
      enabled: true,
    };

    let streamState: "streaming" | "completed" = "streaming";

    const { rerender } = renderHook(() =>
      useMessagePersistence({
        ...baseProps,
        streamState,
      })
    );

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(0);
    });

    streamState = "completed";
    rerender(undefined);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
    });
  });

  it("persists meaningful partial assistant output when stream errors", async () => {
    const baseProps = {
      chatIdParam: "new",
      thinkingOutput: [] as string[],
      providerId: "apple" as const,
      modelId: "apple.on.device",
      title: "Chat",
      enabled: true,
    };

    const messages = [
      { role: "user", content: "write a http server in zig" },
      { role: "assistant", content: "```zig\nconst std = @import(\"std\");" },
    ] as ModelMessage[];

    let streamState: "streaming" | "error" = "streaming";

    const { rerender } = renderHook(() =>
      useMessagePersistence({
        ...baseProps,
        messages,
        streamState,
      })
    );

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(0);
    });

    streamState = "error";
    rerender(undefined);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
    });
  });

  it("does not persist placeholder-only assistant output on stream error", async () => {
    const baseProps = {
      chatIdParam: "new",
      thinkingOutput: [] as string[],
      providerId: "apple" as const,
      modelId: "apple.on.device",
      title: "Chat",
      enabled: true,
    };

    const messages = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "..." },
    ] as ModelMessage[];

    let streamState: "streaming" | "error" = "streaming";

    const { rerender } = renderHook(() =>
      useMessagePersistence({
        ...baseProps,
        messages,
        streamState,
      })
    );

    streamState = "error";
    rerender(undefined);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(insertMock).toHaveBeenCalledTimes(0);
    expect(updateMock).toHaveBeenCalledTimes(0);
  });

  it("ignores stale save completion after chat scope changes", async () => {
    const deferredInsert = createDeferred<{ id: number }[]>();
    insertReturningMock.mockReturnValue(deferredInsert.promise);

    const baseProps = {
      streamState: "idle" as const,
      thinkingOutput: [] as string[],
      providerId: "apple" as const,
      modelId: "apple.on.device",
      title: "Chat",
      enabled: true,
    };

    let chatIdParam = "new";
    let messages: ModelMessage[] = [{ role: "user", content: "old chat message" }];

    const { result, rerender } = renderHook(() =>
      useMessagePersistence({
        ...baseProps,
        chatIdParam,
        messages,
      })
    );

    let oldSave!: Promise<void>;
    act(() => {
      oldSave = result.current.triggerSave();
    });

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    chatIdParam = "42";
    messages = [{ role: "user", content: "loaded chat" }];
    rerender(undefined);

    deferredInsert.resolve([{ id: 777 }]);

    await act(async () => {
      await oldSave;
    });

    expect(result.current.lastSavedChatId).toBe(42);
    expect(result.current.lastSavedChatId).not.toBe(777);
  });

  it("surfaces save failure as non-blocking error state and allows recovery", async () => {
    executeWithRetryMock.mockResolvedValueOnce({
      success: false,
      error: {
        category: "unknown",
        isRetryable: true,
        shouldFallback: true,
        message: "disk write failed",
      },
      attempts: 3,
      shouldFallback: true,
    });

    const { result } = renderHook(() =>
      useMessagePersistence({
        streamState: "idle",
        chatIdParam: "42",
        messages: [{ role: "user", content: "hello" }],
        thinkingOutput: [],
        providerId: "apple",
        modelId: "apple.on.device",
        title: "Chat",
        enabled: true,
      })
    );

    await act(async () => {
      await result.current.triggerSave();
    });

    expect(result.current.hasSaveError).toBe(true);
    expect(result.current.saveStatus).toBe("error");

    act(() => {
      result.current.clearError();
    });

    expect(result.current.saveStatus).toBe("idle");
    expect(result.current.hasSaveError).toBe(false);

    await act(async () => {
      await result.current.triggerSave();
    });

    expect(result.current.saveStatus).toBe("saved");
    expect(updateMock).toHaveBeenCalled();
  });

  it("persists a manual rename after starting from an untitled chat", async () => {
    const baseProps = {
      streamState: "idle" as const,
      chatIdParam: "42",
      messages: [{ role: "user", content: "hello" }] as ModelMessage[],
      thinkingOutput: [] as string[],
      providerId: "apple" as const,
      modelId: "apple.on.device",
      enabled: true,
    };

    let title = "Chat";

    const { result, rerender } = renderHook(() =>
      useMessagePersistence({
        ...baseProps,
        title,
      })
    );

    await act(async () => {
      await result.current.triggerSave();
    });

    expect(updateSetMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: null,
      })
    );

    title = "Renamed Chat";
    rerender(undefined);

    await act(async () => {
      await result.current.triggerSave();
    });

    expect(updateSetMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "Renamed Chat",
      })
    );
  });
});
