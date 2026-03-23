import type { ModelMessage } from "ai";

import { getMessageAnnotations } from "@/lib/chat-error-annotations";
import type {
  AnnotatedModelMessage,
  ChatMessageAnnotation,
  ChatWebSearchAnnotation,
} from "@/types/chat.types";

export const getWebSearchAnnotation = (
  message: ModelMessage,
): ChatWebSearchAnnotation | null => {
  const annotation = getMessageAnnotations(message).find(
    (candidate): candidate is ChatWebSearchAnnotation => candidate.type === "web-search",
  );

  return annotation ?? null;
};

export const withWebSearchAnnotation = (
  message: ModelMessage,
  annotation: ChatWebSearchAnnotation,
): AnnotatedModelMessage => {
  const annotations = getMessageAnnotations(message).filter(
    (candidate): candidate is ChatMessageAnnotation => candidate.type !== "web-search",
  );

  return {
    ...(message as AnnotatedModelMessage),
    annotations: [...annotations, annotation],
  };
};
