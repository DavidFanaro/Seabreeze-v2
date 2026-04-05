import * as FileSystem from "expo-file-system/legacy";
import type { ModelMessage } from "ai";

import { isDataUri, isLocalAssetUri } from "@/lib/chat-attachments";
import type { UserMessageContent } from "@/hooks/chat/chatSendUtils";

const stripDataUriPrefix = (value: string): string => {
    const marker = ";base64,";
    const markerIndex = value.indexOf(marker);

    if (markerIndex === -1) {
        return value;
    }

    return value.slice(markerIndex + marker.length);
};

const messageNeedsPreparation = (message: ModelMessage): boolean => {
    if (message.role !== "user" || !Array.isArray(message.content)) {
        return false;
    }

    return message.content.some((part) => {
        if (!part || typeof part !== "object") {
            return false;
        }

        const partRecord = part as unknown as Record<string, unknown>;

        if (partRecord.type === "image" && typeof partRecord.image === "string") {
            return isDataUri(partRecord.image) || isLocalAssetUri(partRecord.image);
        }

        if (partRecord.type === "file" && typeof partRecord.data === "string") {
            return isDataUri(partRecord.data) || isLocalAssetUri(partRecord.data);
        }

        return false;
    });
};

export const needsProviderMessagePreparation = (messages: ModelMessage[]): boolean => {
    return messages.some(messageNeedsPreparation);
};

export async function prepareMessagesForProvider(
    sourceMessages: ModelMessage[],
    attachmentDataCache: Map<string, string>,
): Promise<ModelMessage[]> {
    const readAttachmentAsBase64 = async (uri: string): Promise<string> => {
        const cached = attachmentDataCache.get(uri);
        if (cached) {
            return cached;
        }

        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        attachmentDataCache.set(uri, base64);
        return base64;
    };

    const preparePart = async (part: unknown): Promise<unknown> => {
        if (!part || typeof part !== "object") {
            return part;
        }

        const partRecord = part as Record<string, unknown>;

        if (partRecord.type === "image" && typeof partRecord.image === "string") {
            if (isDataUri(partRecord.image)) {
                return {
                    ...partRecord,
                    image: stripDataUriPrefix(partRecord.image),
                };
            }

            if (isLocalAssetUri(partRecord.image)) {
                return {
                    ...partRecord,
                    image: await readAttachmentAsBase64(partRecord.image),
                };
            }
        }

        if (partRecord.type === "file" && typeof partRecord.data === "string") {
            if (isDataUri(partRecord.data)) {
                return {
                    ...partRecord,
                    data: stripDataUriPrefix(partRecord.data),
                };
            }

            if (isLocalAssetUri(partRecord.data)) {
                return {
                    ...partRecord,
                    data: await readAttachmentAsBase64(partRecord.data),
                };
            }
        }

        return part;
    };

    return Promise.all(sourceMessages.map(async (message): Promise<ModelMessage> => {
        if (message.role !== "user" || !Array.isArray(message.content)) {
            return message;
        }

        const preparedContent = await Promise.all(message.content.map(preparePart));
        return {
            ...message,
            content: preparedContent as unknown as UserMessageContent,
        };
    }));
}
