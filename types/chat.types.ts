/**
 * @file chat.types.ts
 * @purpose Chat-related type definitions
 * @connects-to useChat, components
 */

import type { ModelMessage, LanguageModel } from "ai";
import type { ProviderId } from "./provider.types";

type ChunkHandler = (chunk: string, accumulated: string) => void;

export interface UseChatOptions {
  initialMessages?: ModelMessage[];
  initialText?: string;
  placeholder?: string;
  /** @deprecated Use chatId instead for unified state management */
  providerId?: ProviderId;
  /** @deprecated Use chatId instead for unified state management */
  modelId?: string;
  /** Chat ID for unified state management (use "new" for new chats) */
  chatId?: string;
  model?: LanguageModel;
  onChunk?: ChunkHandler;
  onThinkingChunk?: ChunkHandler;
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
