import type { ModelMessage } from "ai";

import {
  coerceMessageContentToString,
  normalizePersistedMessages,
} from "@/lib/chat-message-normalization";

describe("chat-message-normalization", () => {
  it("coerces legacy message part arrays into plain text", () => {
    const content = [
      { type: "text", text: "hello " },
      { type: "text", text: "world" },
    ];

    expect(coerceMessageContentToString(content)).toBe("hello world");
  });

  it("falls back to JSON text for unknown legacy objects", () => {
    const content = { unknown: { nested: true } };

    expect(coerceMessageContentToString(content)).toBe(JSON.stringify(content));
  });

  it("normalizes persisted messages and drops invalid roles", () => {
    const persisted = [
      { role: "assistant", content: [{ type: "text", text: "legacy assistant" }] },
      { role: "user", content: "new message" },
      { role: "invalid", content: "ignore me" },
      { foo: "bar" },
    ];

    const result = normalizePersistedMessages(persisted);

    expect(result.didCoerceContent).toBe(true);
    expect(result.droppedMessages).toBe(2);
    expect(result.messages).toEqual([
      expect.objectContaining<ModelMessage>({
        role: "assistant",
        content: "legacy assistant",
      }),
      expect.objectContaining<ModelMessage>({
        role: "user",
        content: "new message",
      }),
    ]);
  });
});
