/**
 * @file chat.types.ts
 * @purpose Chat-related type definitions
 * @connects-to useChat, components
 */

import type { ModelMessage, LanguageModel } from "ai";
import type { ProviderId } from "./provider.types";

type ChunkHandler = (chunk: string, accumulated: string) => void;

export type ChatAttachmentKind = "image" | "video";

export interface ChatAttachment {
  id: string;
  uri: string;
  kind: ChatAttachmentKind;
  mediaType: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  durationMs?: number | null;
}

export interface ChatSendPayload {
  text?: string;
  attachments?: ChatAttachment[];
}

export type ChatSendInput = string | ChatSendPayload;

export type StreamState = "idle" | "streaming" | "completing" | "completed" | "error" | "cancelled";

export type ThinkingLevel = "low" | "medium" | "high";

export type ChatErrorAnnotationSource = "streaming" | "attachment" | "compatibility";

export type ChatWebSearchStatus = "searching" | "success" | "error";

export interface ChatWebSearchSource {
  title: string;
  url: string;
  snippet?: string;
  engine?: string;
  publishedDate?: string;
}

export interface ChatWebSearchQueryRun {
  query: string;
  provider: ProviderId;
  status: ChatWebSearchStatus;
  resultCount: number;
  sources: ChatWebSearchSource[];
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface ChatWebSearchAnnotation {
  type: "web-search";
  status: ChatWebSearchStatus;
  queries: ChatWebSearchQueryRun[];
  totalSources: number;
}

export interface ChatActiveWebSearchState {
  messageIndex: number;
  annotation: ChatWebSearchAnnotation;
}

export interface ChatErrorAnnotation {
  type: "error";
  error: string;
  fixes: string[];
  source: ChatErrorAnnotationSource;
  provider?: ProviderId;
}

export type ChatMessageAnnotation = ChatErrorAnnotation | ChatWebSearchAnnotation;

export type AnnotatedModelMessage = ModelMessage & {
  annotations?: ChatMessageAnnotation[];
};

export interface UseChatOptions {
  initialMessages?: ModelMessage[];
  initialText?: string;
  /** Enable placeholder text for assistant responses */
  placeholder?: boolean;
  /** @deprecated Use chatId instead for unified state management */
  providerId?: ProviderId;
  /** @deprecated Use chatId instead for unified state management */
  modelId?: string;
  /** Chat ID for unified state management (use "new" for new chats) */
  chatId?: string;
  model?: LanguageModel;
  onChunk?: ChunkHandler;
  onThinkingChunk?: ChunkHandler;
  /** Enable streaming thinking output updates */
  enableThinking?: boolean;
  /** Control reasoning effort for supported providers */
  thinkingLevel?: ThinkingLevel;
  /** Enable manual app-wide web search tool access */
  enableWebSearch?: boolean;
  /** SearXNG instance URL used for web search */
  searxngUrl?: string | null;
  onError?: (error: unknown) => void;
  onComplete?: () => void;
  onFallback?: (from: ProviderId, to: ProviderId, reason: string) => void;
  /** Enable automatic fallback to other providers on error */
  enableFallback?: boolean;
  /** Enable automatic retry with exponential backoff */
  enableRetry?: boolean;
  /** Custom retry configuration */
  retryConfig?: Partial<any>;
}
