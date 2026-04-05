import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";

import { useChatHydration } from "../useChatHydration";
import { createTestQueryClient } from "@/test/renderWithQueryClient";

const mockGet: any = jest.fn();
const mockWhere = jest.fn(() => ({
  get: mockGet,
}));
const mockFrom = jest.fn(() => ({
  where: mockWhere,
}));
const mockSelect = jest.fn(() => ({
  from: mockFrom,
}));
const mockUpdateWhere = jest.fn(() => Promise.resolve());
const mockUpdateSet = jest.fn(() => ({
  where: mockUpdateWhere,
}));
const mockUpdate = jest.fn(() => ({
  set: mockUpdateSet,
}));

const mockDb = {
  select: mockSelect,
  update: mockUpdate,
};

jest.mock("@/hooks/useDatabase", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((column, value) => ({ column, value })),
}));

function createWrapper() {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useChatHydration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("hydrates an existing chat from the database", async () => {
    const setMessages = jest.fn();
    const setThinkingOutput = jest.fn();
    const setTitle = jest.fn();
    const setText = jest.fn();
    const clearPendingAttachments = jest.fn();
    const clearOverride = jest.fn();
    const resetAutoTitleState = jest.fn();
    const syncAutoTitleState = jest.fn();
    const syncFromDatabase = jest.fn();

    mockGet.mockResolvedValue({
      id: 42,
      messages: [{ role: "user", content: "Hello" }],
      thinkingOutput: ["thinking"],
      title: "Loaded chat",
      providerId: "openai",
      modelId: "gpt-4o",
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    const { result } = renderHook(
      () => useChatHydration({
        chatIdParam: "42",
        db: mockDb as any,
        clearOverride,
        syncFromDatabase,
        setMessages,
        setThinkingOutput,
        setTitle,
        setText,
        clearPendingAttachments,
        resetAutoTitleState,
        syncAutoTitleState,
      }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.chatID).toBe(42);
    });

    expect(setMessages).toHaveBeenLastCalledWith([{ role: "user", content: "Hello" }]);
    expect(setThinkingOutput).toHaveBeenLastCalledWith(["thinking"]);
    expect(setTitle).toHaveBeenLastCalledWith("Loaded chat");
    expect(syncAutoTitleState).toHaveBeenCalledWith("Loaded chat");
    expect(syncFromDatabase).toHaveBeenCalledWith("openai", "gpt-4o");
    expect(result.current.hydrationError).toBeNull();
  });

  it("surfaces an invalid chat id as a hydration error", async () => {
    const { result } = renderHook(
      () => useChatHydration({
        chatIdParam: "invalid",
        db: mockDb as any,
        clearOverride: jest.fn(),
        syncFromDatabase: jest.fn(),
        setMessages: jest.fn(),
        setThinkingOutput: jest.fn(),
        setTitle: jest.fn(),
        setText: jest.fn(),
        clearPendingAttachments: jest.fn(),
        resetAutoTitleState: jest.fn(),
        syncAutoTitleState: jest.fn(),
      }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.hydrationError).toBe("Invalid chat id. Please reopen from chat history.");
    });

    expect(mockGet).not.toHaveBeenCalled();
  });
});
