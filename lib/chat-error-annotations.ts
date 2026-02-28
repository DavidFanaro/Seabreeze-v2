import type { ModelMessage } from "ai";

import type {
  AnnotatedModelMessage,
  ChatErrorAnnotation,
  ChatErrorAnnotationSource,
  ChatMessageAnnotation,
} from "@/types/chat.types";
import type { ProviderId } from "@/types/provider.types";

interface CreateErrorAnnotationOptions {
  error: string;
  fixes?: string[];
  source: ChatErrorAnnotationSource;
  provider?: ProviderId;
}

const normalizeFixes = (fixes: string[]): string[] => {
  return fixes
    .map((fix) => fix.trim())
    .filter((fix) => fix.length > 0)
    .slice(0, 3);
};

export const createErrorAnnotation = (
  options: CreateErrorAnnotationOptions,
): ChatErrorAnnotation => {
  return {
    type: "error",
    error: options.error.trim(),
    fixes: normalizeFixes(options.fixes ?? []),
    source: options.source,
    provider: options.provider,
  };
};

export const getMessageAnnotations = (
  message: ModelMessage,
): ChatMessageAnnotation[] => {
  const annotated = message as AnnotatedModelMessage;
  return Array.isArray(annotated.annotations) ? annotated.annotations : [];
};

export const getErrorAnnotation = (
  message: ModelMessage,
): ChatErrorAnnotation | null => {
  const annotation = getMessageAnnotations(message).find(
    (candidate) => candidate.type === "error",
  );

  return annotation ?? null;
};

export const withErrorAnnotation = (
  message: ModelMessage,
  annotation: ChatErrorAnnotation,
): AnnotatedModelMessage => {
  const annotations = getMessageAnnotations(message).filter(
    (candidate) => candidate.type !== "error",
  );

  return {
    ...(message as AnnotatedModelMessage),
    annotations: [...annotations, annotation],
  };
};
