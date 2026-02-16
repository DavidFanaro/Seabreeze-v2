import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useStreamLifecycle } from "../useStreamLifecycle";

describe("useStreamLifecycle", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("fails streams that exceed the expected completion window", async () => {
    jest.useFakeTimers();

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useStreamLifecycle({
        timeoutMs: 120000,
        expectedCompletionWindowMs: 1000,
        completionGraceMs: 8000,
        onError,
      })
    );

    act(() => {
      result.current.initializeStream();
    });

    expect(result.current.streamState).toBe("streaming");

    await act(async () => {
      jest.advanceTimersByTime(1001);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.streamState).toBe("error");
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toContain("expected completion window");
  });

  it("forces completion after grace period when done signal was received", async () => {
    jest.useFakeTimers();

    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useStreamLifecycle({
        timeoutMs: 120000,
        expectedCompletionWindowMs: 120000,
        completionGraceMs: 1000,
        onComplete,
      })
    );

    act(() => {
      result.current.initializeStream();
      result.current.markDoneSignalReceived();
    });

    expect(result.current.streamState).toBe("completing");

    await act(async () => {
      jest.advanceTimersByTime(1001);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.streamState).toBe("completed");
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
