import type { ModelMessage } from "ai";

import { createIdempotencyKey } from "@/lib/concurrency";
import { isVideoMediaType } from "@/lib/chat-attachments";
import type {
    ChatAttachment,
    ChatSendInput,
    ChatSendPayload,
} from "@/types/chat.types";

export interface RetryableOperation {
    operationKey: string;
    payload: ChatSendPayload;
    messageSignature: string;
}

type UserMessage = Extract<ModelMessage, { role: "user" }>;
export type UserMessageContent = UserMessage["content"];

export interface ResolvedSendPayload {
    text: string;
    attachments: ChatAttachment[];
    usedOverrideText: boolean;
}

export const normalizePossibleFixes = (fixes: string[]): string[] => {
    return fixes
        .map((fix) => fix.trim())
        .filter((fix) => fix.length > 0)
        .slice(0, 3);
};

export const getErrorMessageText = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "object" && error !== null && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string" && message.length > 0) {
            return message;
        }
    }

    return String(error);
};

export const formatAnnotatedErrorContent = (
    title: string,
    errorMessage: string,
    fixes: string[],
): string => {
    const normalizedFixes = normalizePossibleFixes(fixes);
    const lines = [`**${title}**`, "", errorMessage.trim()];

    if (normalizedFixes.length > 0) {
        lines.push(
            "",
            "**Possible fixes:**",
            ...normalizedFixes.map((fix) => `- ${fix}`),
        );
    }

    return lines.join("\n");
};

const serializeContentForSignature = (content: ModelMessage["content"]): string => {
    if (typeof content === "string") {
        return content;
    }

    try {
        return JSON.stringify(content);
    } catch {
        return String(content);
    }
};

export const buildMessageSignature = (content: ModelMessage["content"]): string => {
    return createIdempotencyKey("chat-message-signature", [
        serializeContentForSignature(content),
    ]);
};

export const isSameMessageContent = (
    left: ModelMessage["content"],
    right: ModelMessage["content"],
): boolean => {
    return buildMessageSignature(left) === buildMessageSignature(right);
};

export const normalizeAttachments = (
    attachments: ChatSendPayload["attachments"],
): ChatAttachment[] => {
    if (!Array.isArray(attachments)) {
        return [];
    }

    return attachments.filter((attachment) => (
        typeof attachment?.uri === "string"
        && attachment.uri.length > 0
        && typeof attachment.mediaType === "string"
        && attachment.mediaType.length > 0
    ));
};

export const resolveSendPayload = (
    input: ChatSendInput | undefined,
    currentText: string,
): ResolvedSendPayload => {
    if (typeof input === "string") {
        return {
            text: input.trim(),
            attachments: [],
            usedOverrideText: true,
        };
    }

    if (input && typeof input === "object") {
        const rawText = typeof input.text === "string" ? input.text : currentText;
        return {
            text: rawText.trim(),
            attachments: normalizeAttachments(input.attachments),
            usedOverrideText: false,
        };
    }

    return {
        text: currentText.trim(),
        attachments: [],
        usedOverrideText: false,
    };
};

export const createUserMessageContent = (
    payload: Pick<ResolvedSendPayload, "text" | "attachments">,
): UserMessageContent => {
    if (payload.attachments.length === 0) {
        return payload.text;
    }

    const parts: Record<string, unknown>[] = [];

    if (payload.text.length > 0) {
        parts.push({
            type: "text",
            text: payload.text,
        });
    }

    payload.attachments.forEach((attachment) => {
        if (attachment.kind === "image") {
            parts.push({
                type: "image",
                image: attachment.uri,
                mediaType: attachment.mediaType,
            });
            return;
        }

        parts.push({
            type: "file",
            data: attachment.uri,
            mediaType: attachment.mediaType,
            filename: attachment.fileName,
        });
    });

    return parts as unknown as UserMessageContent;
};

export const hasSendableContent = (
    payload: Pick<ResolvedSendPayload, "text" | "attachments">,
): boolean => {
    return payload.text.length > 0 || payload.attachments.length > 0;
};

export const hasVideoAttachment = (attachments: ChatAttachment[]): boolean => {
    return attachments.some((attachment) => (
        attachment.kind === "video"
        || isVideoMediaType(attachment.mediaType)
    ));
};

const contentHasVideoPart = (content: ModelMessage["content"]): boolean => {
    if (!Array.isArray(content)) {
        return false;
    }

    return content.some((part) => {
        if (!part || typeof part !== "object") {
            return false;
        }

        const partRecord = part as Record<string, unknown>;
        return partRecord.type === "file"
            && typeof partRecord.mediaType === "string"
            && isVideoMediaType(partRecord.mediaType);
    });
};

export const conversationHasVideoContent = (messages: ModelMessage[]): boolean => {
    return messages.some((message) => (
        message.role === "user" && contentHasVideoPart(message.content)
    ));
};
