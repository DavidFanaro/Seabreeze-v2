import type { ImagePickerAsset } from "expo-image-picker";

import { createIdempotencyKey } from "@/lib/concurrency";
import type { ChatAttachment, ChatAttachmentKind } from "@/types/chat.types";

export const MAX_CHAT_ATTACHMENTS = 3;
export const MAX_CHAT_ATTACHMENT_BYTES = 30 * 1024 * 1024;

const MODEL_SUPPORTED_IMAGE_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const DEFAULT_IMAGE_MEDIA_TYPE = "image/jpeg";
const DEFAULT_VIDEO_MEDIA_TYPE = "video/mp4";

export const isImageMediaType = (mediaType: string): boolean => {
  return mediaType.toLowerCase().startsWith("image/");
};

export const isVideoMediaType = (mediaType: string): boolean => {
  return mediaType.toLowerCase().startsWith("video/");
};

export const isModelSupportedImageType = (mediaType: string): boolean => {
  return MODEL_SUPPORTED_IMAGE_MEDIA_TYPES.has(mediaType.toLowerCase());
};

export const isDataUri = (value: string): boolean => {
  return value.startsWith("data:");
};

export const isLocalAssetUri = (value: string): boolean => {
  return /^(file|content|ph|assets-library):\/\//i.test(value);
};

export const asDataUri = (value: string, mediaType: string): string => {
  if (isDataUri(value)) {
    return value;
  }

  if (/^https?:\/\//i.test(value) || isLocalAssetUri(value)) {
    return value;
  }

  return `data:${mediaType};base64,${value}`;
};

const inferKind = (asset: ImagePickerAsset): ChatAttachmentKind => {
  if (asset.type === "video") {
    return "video";
  }

  if (asset.mimeType && isVideoMediaType(asset.mimeType)) {
    return "video";
  }

  return "image";
};

const inferMediaType = (
  asset: ImagePickerAsset,
  kind: ChatAttachmentKind,
): string => {
  if (typeof asset.mimeType === "string" && asset.mimeType.length > 0) {
    return asset.mimeType;
  }

  return kind === "video" ? DEFAULT_VIDEO_MEDIA_TYPE : DEFAULT_IMAGE_MEDIA_TYPE;
};

const inferFileName = (asset: ImagePickerAsset, kind: ChatAttachmentKind): string => {
  if (typeof asset.fileName === "string" && asset.fileName.trim().length > 0) {
    return asset.fileName;
  }

  if (asset.assetId) {
    return `${asset.assetId}.${kind === "video" ? "mp4" : "jpg"}`;
  }

  return `attachment-${Date.now()}.${kind === "video" ? "mp4" : "jpg"}`;
};

export const attachmentLabel = (attachment: ChatAttachment): string => {
  if (attachment.fileName) {
    return attachment.fileName;
  }

  return attachment.kind === "video" ? "Video attachment" : "Image attachment";
};

export const normalizePickerAsset = (
  asset: ImagePickerAsset,
  index: number,
): ChatAttachment => {
  const kind = inferKind(asset);
  const mediaType = inferMediaType(asset, kind);

  return {
    id: createIdempotencyKey("chat-attachment", [
      String(Date.now()),
      String(index),
      asset.assetId ?? asset.uri,
    ]),
    uri: asset.uri,
    kind,
    mediaType,
    fileName: inferFileName(asset, kind),
    fileSize: asset.fileSize,
    width: asset.width,
    height: asset.height,
    durationMs: typeof asset.duration === "number" ? asset.duration : null,
  };
};
