import { fetch as expoFetch } from "expo/fetch";
import type { ModelMessage } from "ai";

import { isDataUri, isVideoMediaType } from "@/lib/chat-attachments";
import type { ThinkingLevel } from "@/types/chat.types";

type OpenRouterChatRole = "system" | "user" | "assistant";

type OpenRouterChatContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
    | { type: "video_url"; video_url: { url: string } }
    | { type: "file"; file: { filename: string; file_data: string } };

interface OpenRouterChatMessage {
    role: OpenRouterChatRole;
    content: string | OpenRouterChatContentPart[];
}

interface StreamOpenRouterVideoMessagesOptions {
    apiKey: string;
    modelId: string;
    messages: ModelMessage[];
    thinkingLevel?: ThinkingLevel;
    shouldRequestThinking: boolean;
    onChunkReceived?: () => void;
    onTextDelta: (textDelta: string) => void;
    onReasoningDelta?: (reasoningDelta: string) => void;
    onDone?: () => void;
    abortSignal?: AbortSignal;
}

const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

const isHttpUrl = (value: string): boolean => {
    return /^https?:\/\//i.test(value);
};

const isSupportedOpenRouterRole = (role: ModelMessage["role"]): role is OpenRouterChatRole => {
    return role === "system" || role === "user" || role === "assistant";
};

const asDataUrlIfNeeded = (value: string, mediaType: string): string => {
    if (isDataUri(value) || isHttpUrl(value)) {
        return value;
    }

    return `data:${mediaType};base64,${value}`;
};

const contentHasVideoFilePart = (content: ModelMessage["content"]): boolean => {
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

export const hasOpenRouterVideoMessageContent = (messages: ModelMessage[]): boolean => {
    return messages.some((message) => (
        message.role === "user" && contentHasVideoFilePart(message.content)
    ));
};

const toOpenRouterChatContent = (content: ModelMessage["content"]): string | OpenRouterChatContentPart[] => {
    if (typeof content === "string") {
        return content;
    }

    if (!Array.isArray(content)) {
        return "";
    }

    const parts: OpenRouterChatContentPart[] = [];

    content.forEach((part) => {
        if (!part || typeof part !== "object") {
            return;
        }

        const partRecord = part as Record<string, unknown>;

        if (partRecord.type === "text" && typeof partRecord.text === "string") {
            parts.push({
                type: "text",
                text: partRecord.text,
            });
            return;
        }

        if (partRecord.type === "image" && typeof partRecord.image === "string") {
            const mediaType = typeof partRecord.mediaType === "string"
                ? partRecord.mediaType
                : "image/jpeg";

            parts.push({
                type: "image_url",
                image_url: {
                    url: asDataUrlIfNeeded(partRecord.image, mediaType),
                },
            });
            return;
        }

        if (partRecord.type !== "file") {
            return;
        }

        const mediaType = typeof partRecord.mediaType === "string"
            ? partRecord.mediaType
            : "application/octet-stream";
        const fileName = typeof partRecord.filename === "string" && partRecord.filename.length > 0
            ? partRecord.filename
            : "attachment";
        const fileDataSource = typeof partRecord.data === "string"
            ? partRecord.data
            : typeof partRecord.url === "string"
                ? partRecord.url
                : null;

        if (!fileDataSource) {
            return;
        }

        const resolvedSource = asDataUrlIfNeeded(fileDataSource, mediaType);

        if (isVideoMediaType(mediaType)) {
            parts.push({
                type: "video_url",
                video_url: {
                    url: resolvedSource,
                },
            });
            return;
        }

        if (mediaType.startsWith("image/")) {
            parts.push({
                type: "image_url",
                image_url: {
                    url: resolvedSource,
                },
            });
            return;
        }

        parts.push({
            type: "file",
            file: {
                filename: fileName,
                file_data: resolvedSource,
            },
        });
    });

    return parts;
};

const toOpenRouterChatMessages = (messages: ModelMessage[]): OpenRouterChatMessage[] => {
    return messages
        .filter((message): message is ModelMessage & { role: OpenRouterChatRole } => (
            isSupportedOpenRouterRole(message.role)
        ))
        .map((message) => ({
            role: message.role,
            content: toOpenRouterChatContent(message.content),
        }));
};

const getOpenRouterChunkTextDelta = (payload: Record<string, unknown>): string => {
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const firstChoice = choices[0] as Record<string, unknown> | undefined;
    const delta = firstChoice && typeof firstChoice.delta === "object"
        ? firstChoice.delta as Record<string, unknown>
        : null;

    if (!delta) {
        return "";
    }

    if (typeof delta.content === "string") {
        return delta.content;
    }

    if (!Array.isArray(delta.content)) {
        return "";
    }

    return delta.content
        .map((item) => {
            if (!item || typeof item !== "object") {
                return "";
            }

            const itemRecord = item as Record<string, unknown>;
            return typeof itemRecord.text === "string" ? itemRecord.text : "";
        })
        .join("");
};

const getOpenRouterChunkReasoningDelta = (payload: Record<string, unknown>): string => {
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const firstChoice = choices[0] as Record<string, unknown> | undefined;
    const delta = firstChoice && typeof firstChoice.delta === "object"
        ? firstChoice.delta as Record<string, unknown>
        : null;

    if (!delta) {
        return "";
    }

    return typeof delta.reasoning === "string" ? delta.reasoning : "";
};

const getOpenRouterFinishReason = (payload: Record<string, unknown>): string | null => {
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const firstChoice = choices[0] as Record<string, unknown> | undefined;
    const finishReason = firstChoice?.finish_reason;

    return typeof finishReason === "string" && finishReason.length > 0
        ? finishReason
        : null;
};

const getOpenRouterErrorMessage = (payload: Record<string, unknown>): string | null => {
    if (!payload.error || typeof payload.error !== "object") {
        return null;
    }

    const errorRecord = payload.error as Record<string, unknown>;
    return typeof errorRecord.message === "string"
        ? errorRecord.message
        : null;
};

const parseOpenRouterErrorBody = (bodyText: string): string => {
    if (!bodyText) {
        return "";
    }

    try {
        const parsed = JSON.parse(bodyText) as Record<string, unknown>;
        const message = getOpenRouterErrorMessage(parsed);
        return message ?? bodyText;
    } catch {
        return bodyText;
    }
};

export async function streamOpenRouterVideoMessages(
    options: StreamOpenRouterVideoMessagesOptions,
): Promise<void> {
    const {
        apiKey,
        modelId,
        messages,
        thinkingLevel,
        shouldRequestThinking,
        onChunkReceived,
        onTextDelta,
        onReasoningDelta,
        onDone,
        abortSignal,
    } = options;
    const effectiveThinkingLevel: ThinkingLevel = thinkingLevel ?? "medium";
    let hasSignaledCompletion = false;

    const signalCompletion = () => {
        if (hasSignaledCompletion) {
            return;
        }

        hasSignaledCompletion = true;
        onDone?.();
    };

    const requestBody: Record<string, unknown> = {
        model: modelId,
        stream: true,
        messages: toOpenRouterChatMessages(messages),
    };

    if (shouldRequestThinking) {
        requestBody.reasoning = {
            effort: effectiveThinkingLevel,
        };
        requestBody.include_reasoning = true;
    }

    const response = await expoFetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal,
    });

    if (!response.ok) {
        let errorBody = "";

        try {
            errorBody = await response.text();
        } catch {
            errorBody = "";
        }

        const parsedError = parseOpenRouterErrorBody(errorBody);
        const suffix = parsedError ? `: ${parsedError}` : "";
        throw new Error(`OpenRouter video request failed (${response.status})${suffix}`);
    }

    if (!response.body) {
        throw new Error("OpenRouter returned an empty streaming body.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handleDataPayload = (rawPayload: string): void => {
        const payload = rawPayload.trim();

        if (!payload) {
            return;
        }

        if (payload === "[DONE]") {
            signalCompletion();
            return;
        }

        let parsedPayload: Record<string, unknown>;
        try {
            parsedPayload = JSON.parse(payload) as Record<string, unknown>;
        } catch {
            return;
        }

        const upstreamError = getOpenRouterErrorMessage(parsedPayload);
        if (upstreamError) {
            throw new Error(upstreamError);
        }

        const reasoningDelta = getOpenRouterChunkReasoningDelta(parsedPayload);
        if (reasoningDelta && onReasoningDelta) {
            onChunkReceived?.();
            onReasoningDelta(reasoningDelta);
        }

        const textDelta = getOpenRouterChunkTextDelta(parsedPayload);
        if (textDelta) {
            onChunkReceived?.();
            onTextDelta(textDelta);
        }

        if (getOpenRouterFinishReason(parsedPayload)) {
            signalCompletion();
        }
    };

    const processSseEvent = (eventBlock: string): void => {
        const dataPayload = eventBlock
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n")
            .trim();

        if (!dataPayload) {
            return;
        }

        handleDataPayload(dataPayload);
    };

    while (true) {
        if (abortSignal?.aborted) {
            return;
        }

        const { done, value } = await reader.read();
        if (done) {
            buffer += decoder.decode();
            break;
        }

        if (!value) {
            continue;
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

        let separatorIndex = buffer.indexOf("\n\n");
        while (separatorIndex !== -1) {
            const rawEvent = buffer.slice(0, separatorIndex).trim();
            buffer = buffer.slice(separatorIndex + 2);

            if (rawEvent) {
                processSseEvent(rawEvent);
            }

            separatorIndex = buffer.indexOf("\n\n");
        }
    }

    const trailingEvent = buffer.trim();
    if (trailingEvent) {
        processSseEvent(trailingEvent);
    }

    signalCompletion();
}
