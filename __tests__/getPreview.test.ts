import { ModelMessage } from "ai";

const getPreview = (messages: unknown): string | null => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return null;
  }
  const lastMessage = messages[messages.length - 1] as ModelMessage;
  if (!lastMessage?.content) return null;
  const content =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : String(lastMessage.content);
  return content.length > 80 ? content.slice(0, 80) + "..." : content;
};

describe("getPreview", () => {
  test("returns null for undefined messages", () => {
    expect(getPreview(undefined)).toBeNull();
  });

  test("returns null for null messages", () => {
    expect(getPreview(null)).toBeNull();
  });

  test("returns null for empty array", () => {
    expect(getPreview([])).toBeNull();
  });

  test("returns null for non-array input", () => {
    expect(getPreview("not an array" as unknown)).toBeNull();
  });

  test("returns null for message without content", () => {
    const messages = [{ role: "user", content: null }];
    expect(getPreview(messages)).toBeNull();
  });

  test("returns full content when shorter than 80 characters", () => {
    const messages = [{ role: "user", content: "Hello, this is a short message" }];
    expect(getPreview(messages)).toBe("Hello, this is a short message");
  });

  test("returns truncated content with ellipsis when longer than 80 characters", () => {
    const longText = "This is a very long message that exceeds the eighty character limit for the preview text";
    const messages = [{ role: "user", content: longText }];
    expect(getPreview(messages)).toBe("This is a very long message that exceeds the eighty character limit for the prev...");
  });

  test("handles string content correctly", () => {
    const messages = [{ role: "user", content: "String content" }];
    expect(getPreview(messages)).toBe("String content");
  });

  test("handles non-string content by converting to string", () => {
    const messages = [{ role: "user", content: 12345 as unknown as string }];
    expect(getPreview(messages)).toBe("12345");
  });

  test("takes last message from array", () => {
    const messages = [
      { role: "user", content: "First message" },
      { role: "assistant", content: "Second message" },
      { role: "user", content: "Last message" },
    ];
    expect(getPreview(messages)).toBe("Last message");
  });
});
