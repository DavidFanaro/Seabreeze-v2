import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useStreamLifecycle } from "../useStreamLifecycle";

describe("useStreamLifecycle", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("fails stalled streams via inactivity timeout when no chunks arrive", async () => {
    jest.useFakeTimers();

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useStreamLifecycle({
        timeoutMs: 1000,
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
    expect(onError.mock.calls[0][0].message).toContain(
      "Stream timed out while waiting for data"
    );
  });

  it("does not error on long-running streams that receive periodic chunks", async () => {
    jest.useFakeTimers();

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useStreamLifecycle({
        timeoutMs: 5000,
        completionGraceMs: 8000,
        onError,
      })
    );

    act(() => {
      result.current.initializeStream();
    });

    expect(result.current.streamState).toBe("streaming");

    // Simulate periodic chunks well past the old 45s expected-completion window.
    // Each iteration advances 4s (< 5s inactivity timeout) and sends a chunk.
    for (let i = 0; i < 15; i++) {
      await act(async () => {
        jest.advanceTimersByTime(4000);
        await Promise.resolve();
      });

      act(() => {
        result.current.markChunkReceived();
      });
    }

    // 60s total elapsed — stream should still be active.
    expect(result.current.streamState).toBe("streaming");
    expect(onError).not.toHaveBeenCalled();
  });

  it("forces completion after grace period when done signal was received", async () => {
    jest.useFakeTimers();

    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useStreamLifecycle({
        timeoutMs: 120000,
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
