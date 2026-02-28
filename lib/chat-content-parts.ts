import { isImageMediaType, isVideoMediaType } from "@/lib/chat-attachments";

interface PartRecord extends Record<string, unknown> {
  type?: unknown;
}

export interface ParsedImagePart {
  uri: string;
  mediaType: string;
}

export interface ParsedFilePart {
  uri: string;
  mediaType: string;
  filename?: string;
}

export interface ParsedMessageContent {
  text: string;
  images: ParsedImagePart[];
  files: ParsedFilePart[];
}

const DEFAULT_IMAGE_MEDIA_TYPE = "image/jpeg";
const DEFAULT_FILE_MEDIA_TYPE = "application/octet-stream";

const resolvePartUri = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (value instanceof URL) {
    return value.toString();
  }

  if (value && typeof value === "object" && typeof (value as { href?: unknown }).href === "string") {
    return (value as { href: string }).href;
  }

  return null;
};

const getPartText = (part: PartRecord): string => {
  if (typeof part.text === "string") {
    return part.text;
  }

  if (typeof part.content === "string") {
    return part.content;
  }

  return "";
};

export const parseMessageContent = (content: unknown): ParsedMessageContent => {
  if (typeof content === "string") {
    return {
      text: content,
      images: [],
      files: [],
    };
  }

  if (!Array.isArray(content)) {
    return {
      text: "",
      images: [],
      files: [],
    };
  }

  const textParts: string[] = [];
  const images: ParsedImagePart[] = [];
  const files: ParsedFilePart[] = [];

  content.forEach((part) => {
    if (!part || typeof part !== "object") {
      return;
    }

    const partRecord = part as PartRecord;
    const type = partRecord.type;

    if (type === "text") {
      textParts.push(getPartText(partRecord));
      return;
    }

    if (type === "image") {
      const uri = resolvePartUri(partRecord.image);
      if (!uri) {
        return;
      }

      images.push({
        uri,
        mediaType: typeof partRecord.mediaType === "string" && partRecord.mediaType.length > 0
          ? partRecord.mediaType
          : DEFAULT_IMAGE_MEDIA_TYPE,
      });
      return;
    }

    if (type === "file") {
      const uri = resolvePartUri(partRecord.data ?? partRecord.url);
      if (!uri) {
        return;
      }

      files.push({
        uri,
        mediaType: typeof partRecord.mediaType === "string" && partRecord.mediaType.length > 0
          ? partRecord.mediaType
          : DEFAULT_FILE_MEDIA_TYPE,
        filename: typeof partRecord.filename === "string" ? partRecord.filename : undefined,
      });
      return;
    }

    const fallbackText = getPartText(partRecord);
    if (fallbackText.length > 0) {
      textParts.push(fallbackText);
    }
  });

  return {
    text: textParts.join(""),
    images,
    files,
  };
};

const truncatePreview = (value: string): string => {
  return value.length > 80 ? `${value.slice(0, 80)}...` : value;
};

export const getMessagePreviewText = (content: unknown): string | null => {
  const parsed = parseMessageContent(content);
  const trimmedText = parsed.text.trim();

  if (trimmedText.length > 0) {
    return truncatePreview(trimmedText);
  }

  const imageFromFileCount = parsed.files.filter((file) => isImageMediaType(file.mediaType)).length;
  const videoCount = parsed.files.filter((file) => isVideoMediaType(file.mediaType)).length;
  const imageCount = parsed.images.length + imageFromFileCount;

  if (videoCount > 0 && imageCount > 0) {
    return `${imageCount} image + ${videoCount} video attachment${videoCount > 1 ? "s" : ""}`;
  }

  if (videoCount > 0) {
    return `${videoCount} video attachment${videoCount > 1 ? "s" : ""}`;
  }

  if (imageCount > 0) {
    return `${imageCount} image attachment${imageCount > 1 ? "s" : ""}`;
  }

  if (parsed.files.length > 0) {
    return `${parsed.files.length} file attachment${parsed.files.length > 1 ? "s" : ""}`;
  }

  return null;
};
