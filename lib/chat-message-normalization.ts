/**
 * @file chat-message-normalization.ts
 * @purpose Runtime-safe normalization for persisted chat message payloads.
 */

import type { ModelMessage } from "ai";

interface NormalizePersistedMessagesResult {
  messages: ModelMessage[];
  didCoerceContent: boolean;
  droppedMessages: number;
}

const SUPPORTED_ROLES = new Set<ModelMessage["role"]>([
  "assistant",
  "system",
  "tool",
  "user",
]);

const UNSERIALIZABLE_CONTENT_FALLBACK = "[Unserializable legacy message content]";

function stringifyUnknownContent(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return UNSERIALIZABLE_CONTENT_FALLBACK;
  }
}

function extractTextFromLegacyPart(part: unknown): string | null {
  if (typeof part === "string") {
    return part;
  }

  if (!part || typeof part !== "object") {
    return null;
  }

  const partRecord = part as Record<string, unknown>;

  if (typeof partRecord.text === "string") {
    return partRecord.text;
  }

  if (typeof partRecord.content === "string") {
    return partRecord.content;
  }

  return null;
}

/**
 * Coerce persisted/legacy message payload content into render-safe text.
 */
export function coerceMessageContentToString(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (typeof content === "number" || typeof content === "boolean" || typeof content === "bigint") {
    return String(content);
  }

  if (Array.isArray(content)) {
    const extractedParts = content
      .map(extractTextFromLegacyPart)
      .filter((part): part is string => typeof part === "string");

    if (extractedParts.length > 0) {
      return extractedParts.join("");
    }

    return stringifyUnknownContent(content);
  }

  if (content && typeof content === "object") {
    const contentRecord = content as Record<string, unknown>;

    if (typeof contentRecord.text === "string") {
      return contentRecord.text;
    }

    if (typeof contentRecord.content === "string") {
      return contentRecord.content;
    }

    if (Array.isArray(contentRecord.parts)) {
      const extractedParts = contentRecord.parts
        .map(extractTextFromLegacyPart)
        .filter((part): part is string => typeof part === "string");

      if (extractedParts.length > 0) {
        return extractedParts.join("");
      }
    }

    return stringifyUnknownContent(content);
  }

  return "";
}

export function normalizeMessageContentForRender(content: unknown): string {
  return coerceMessageContentToString(content);
}

/**
 * Normalize persisted message arrays while preserving valid roles.
 */
export function normalizePersistedMessages(value: unknown): NormalizePersistedMessagesResult {
  if (!Array.isArray(value)) {
    return {
      messages: [],
      didCoerceContent: false,
      droppedMessages: 0,
    };
  }

  const messages: ModelMessage[] = [];
  let didCoerceContent = false;
  let droppedMessages = 0;

  value.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      droppedMessages += 1;
      return;
    }

    const messageRecord = entry as Record<string, unknown>;
    const role = messageRecord.role;

    if (typeof role !== "string" || !SUPPORTED_ROLES.has(role as ModelMessage["role"])) {
      droppedMessages += 1;
      return;
    }

    const sourceContent = Object.prototype.hasOwnProperty.call(messageRecord, "content")
      ? messageRecord.content
      : messageRecord.parts;

    if (sourceContent === undefined) {
      droppedMessages += 1;
      return;
    }

    const normalizedContent = coerceMessageContentToString(sourceContent);
    if (typeof sourceContent !== "string") {
      didCoerceContent = true;
    }

    const normalizedMessage: ModelMessage = {
      ...(messageRecord as object),
      role: role as ModelMessage["role"],
      content: normalizedContent,
    } as ModelMessage;

    messages.push(normalizedMessage);
  });

  return {
    messages,
    didCoerceContent,
    droppedMessages,
  };
}
