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

type UserMessage = Extract<ModelMessage, { role: "user" }>;
type UserContent = UserMessage["content"];

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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object";
};

const isValidUserMultipartContent = (value: unknown): value is Extract<UserContent, unknown[]> => {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((part) => {
    if (!isRecord(part) || typeof part.type !== "string") {
      return false;
    }

    if (part.type === "text") {
      return typeof part.text === "string";
    }

    if (part.type === "image") {
      const imageValue = part.image;
      return typeof imageValue === "string" || imageValue instanceof URL;
    }

    if (part.type === "file") {
      const fileValue = part.data;
      const hasValidData = typeof fileValue === "string" || fileValue instanceof URL;
      return hasValidData && typeof part.mediaType === "string";
    }

    return false;
  });
};

const normalizeUserContent = (
  content: unknown,
): { content: UserContent; didCoerceContent: boolean } => {
  if (typeof content === "string") {
    return {
      content,
      didCoerceContent: false,
    };
  }

  if (isValidUserMultipartContent(content)) {
    return {
      content,
      didCoerceContent: false,
    };
  }

  if (isRecord(content) && isValidUserMultipartContent(content.parts)) {
    return {
      content: content.parts,
      didCoerceContent: true,
    };
  }

  return {
    content: coerceMessageContentToString(content),
    didCoerceContent: true,
  };
};

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

    let normalizedContent: ModelMessage["content"];

    if (role === "user") {
      const normalizedUserContent = normalizeUserContent(sourceContent);
      normalizedContent = normalizedUserContent.content;
      didCoerceContent = didCoerceContent || normalizedUserContent.didCoerceContent;
    } else {
      normalizedContent = coerceMessageContentToString(sourceContent);
      if (typeof sourceContent !== "string") {
        didCoerceContent = true;
      }
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
