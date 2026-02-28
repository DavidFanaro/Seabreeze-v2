/**
 * @file useChatStreaming.ts
 * @purpose Streaming text logic with fallback and retry handling
 * @connects-to useChat, provider-factory, fallback-chain
 * 
 * =============================================================================
 * COMPREHENSIVE HOOK OVERVIEW
 * =============================================================================
 * 
 * Purpose:
 * -------
 * The useChatStreaming hook is a critical component of the Seabreeze chat application
 * that manages real-time AI text generation with robust error handling. It provides
 * seamless streaming responses from multiple AI providers while automatically handling
 * failures through intelligent retry mechanisms and provider fallback chains.
 * 
 * Core Responsibilities:
 * ----------------------
 * 1. **Real-time Streaming**: Processes AI-generated text chunks and updates the UI
 *    in real-time as the response is being generated, providing immediate feedback
 *    to users rather than waiting for the complete response.
 * 
 * 2. **Error Classification**: Analyzes errors from AI providers to determine if
 *    they are transient (network issues, rate limits) or permanent (configuration
 *    errors), enabling appropriate handling strategies.
 * 
 * 3. **Automatic Retry**: Implements exponential backoff retry logic for transient
 *    errors, with configurable retry attempts, delays, and backoff multipliers.
 * 
 * 4. **Provider Fallback**: Automatically switches to alternative AI providers
 *    when the current provider fails, following a priority order (Apple → OpenAI → 
 *    OpenRouter → Ollama) to maximize service availability.
 * 
 * 5. **User Experience**: Provides user-friendly error messages with actionable
 *    tips, maintains conversation context during failures, and preserves partial
 *    responses when possible.
 * 
 * Key Features:
 * ------------
 * - **Streaming Text Generation**: Uses AI SDK's streamText for real-time responses
 * - **Intelligent Error Handling**: Classifies errors and applies appropriate strategies
 * - **Provider Resilience**: Automatic fallback ensures service continuity
 * - **Configurable Behavior**: Retry and fallback can be enabled/disabled per request
 * - **Real-time UI Updates**: Callbacks for chunk-by-chunk response updates
 * - **Comprehensive Callbacks**: Events for errors, fallbacks, and provider changes
 * 
 * Integration Points:
 * -------------------
 * - **useChat**: Main orchestrator that calls this hook for message streaming
 * - **provider-factory**: Supplies AI models and handles provider initialization
 * - **fallback-chain**: Manages provider priority and error classification
 * - **error-messages**: Formats user-friendly error messages and hints
 * - **useErrorRecovery**: Provides retry logic with exponential backoff
 * 
 * Flow Overview:
 * --------------
 * 1. User sends message → useChat calls executeStreaming()
 * 2. Stream operation begins with current provider
 * 3. If error occurs → classify error → attempt retry (if enabled)
 * 4. If retry fails → attempt fallback to next provider
 * 5. Update UI in real-time throughout the process
 * 6. Handle final success or display user-friendly error
 * 
 * Usage Pattern:
 * --------------
 * ```typescript
 * const { executeStreaming, handleStreamingError } = useChatStreaming();
 * 
 * const result = await executeStreaming(
 *   {
 *     model: fallbackResult,
 *     enableRetry: true,
 *     enableFallback: true,
 *     activeProvider: 'openai',
 *     onChunk: (chunk, accumulated) => updateUI(accumulated),
 *     onError: (error) => showError(error),
 *     onFallback: (from, to, reason) => notifyFallback(from, to, reason)
 *   },
 *   messages,
 *   setMessages,
 *   assistantIndex,
 *   failedProvidersRef
 * );
 * ```
 * 
 * Error Handling Strategy:
 * -----------------------
 * 1. **Transient Errors** (network, rate limits, server errors): Retry with backoff
 * 2. **Configuration Errors** (API keys, model not found): Skip retry, attempt fallback
 * 3. **Unknown Errors**: Fallback to next provider if available
 * 4. **No Fallback Available**: Display user-friendly error with troubleshooting tips
 * 
 * Performance Considerations:
 * ---------------------------
 * - Uses React.useCallback for function memoization to prevent unnecessary re-renders
 * - Efficient message array updates preserve conversation context
 * - Streaming reduces perceived latency by showing responses as they generate
 * - Failed providers tracking prevents repeated attempts at broken providers
 * =============================================================================
 */

// Core React hooks for memoization
import { useCallback } from "react";
// AI SDK for streaming text generation and type definitions
import { streamText, type ModelMessage } from "ai";
import { fetch as expoFetch } from "expo/fetch";
// Provider type definitions for the fallback system
import { isThinkingCapableModel, type ProviderId } from "@/types/provider.types";
import type { ThinkingLevel } from "@/types/chat.types";
// Fallback chain utilities for provider switching and error classification
import { getNextFallbackProvider, classifyError, type FallbackResult } from "@/providers/fallback-chain";
// Error message formatting utilities for user-friendly error display
import { formatErrorForChat, getErrorFixes, getProviderErrorHint } from "@/lib/error-messages";
// Retry mechanism with exponential backoff for handling transient errors
import { executeWithRetry, DEFAULT_RETRY_CONFIG, type RetryConfig } from "@/hooks/useErrorRecovery";
import { getProviderAuth } from "@/stores";
import { isDataUri, isVideoMediaType } from "@/lib/chat-attachments";
import {
    createErrorAnnotation,
    withErrorAnnotation,
} from "@/lib/chat-error-annotations";
import type { ChatErrorAnnotation } from "@/types/chat.types";

/**
 * Configuration options for the streaming operation
 */
export interface StreamingOptions {
    /** The resolved model to use for streaming (may be a fallback) */
    model: FallbackResult;
    /** Whether to enable automatic retry on transient errors */
    enableRetry: boolean;
    /** Custom retry configuration to override defaults */
    retryConfig: Partial<RetryConfig>;
    /** Whether to enable automatic fallback to other providers on errors */
    enableFallback: boolean;
    /** The currently selected provider from user preferences */
    activeProvider: ProviderId;
    /** The effective provider ID actually being used (may differ due to fallback) */
    effectiveProviderId: ProviderId;
    /** Callback fired when a new text chunk is received */
    onChunk?: (chunk: string, accumulated: string) => void;
    /** Callback fired when any stream chunk arrives (text or reasoning) */
    onChunkReceived?: () => void;
    /** Callback fired when a new thinking/reasoning chunk is received */
    onThinkingChunk?: (chunk: string, accumulated: string) => void;
    /** Callback fired when stream emits a terminal done signal */
    onDoneSignalReceived?: () => void;
    /** Callback fired when stream has fully completed */
    onStreamCompleted?: () => void;
    /** Control reasoning effort for supported providers */
    thinkingLevel?: ThinkingLevel;
    /** Callback fired when an error occurs during streaming */
    onError?: (error: unknown) => void;
    /** Callback fired when falling back to another provider */
    onFallback?: (from: ProviderId, to: ProviderId, reason: string) => void;
    /** Callback fired when the provider changes (due to fallback or explicit change) */
    onProviderChange?: (provider: ProviderId, model: string, isFallback: boolean) => void;
    /** Abort signal for cancelling the stream */
    abortSignal?: AbortSignal;
    /** Gate used to block stale/cancelled state mutation */
    canMutateState?: () => boolean;
}

/**
 * Result of a streaming operation
 */
export interface StreamingResult {
    /** Whether the streaming completed successfully without needing fallback */
    success: boolean;
    /** Whether the operation should be retried with a different provider */
    shouldRetryWithFallback: boolean;
    /** The complete accumulated text from the stream */
    accumulated: string;
    /** Whether the stream was cancelled */
    wasCancelled: boolean;
    /** Provider selected for the next fallback attempt, if any */
    nextProvider?: ProviderId;
    /** Model selected for the next fallback attempt, if any */
    nextModel?: string;
}

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

const hasVideoMessageContent = (messages: ModelMessage[]): boolean => {
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

        if (partRecord.type === "file") {
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
        }
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

const getErrorMessageText = (error: unknown): string => {
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

export function useChatStreaming() {
    /**
     * Handles streaming errors by determining if fallback should be attempted
     * 
     * This function implements the core error handling logic for streaming operations.
     * It classifies the error to determine if it's suitable for fallback, finds the next
     * available provider, and triggers the appropriate callbacks.
     * 
     * @param error - The error that occurred during streaming
     * @param activeProvider - The provider that was being used when the error occurred
     * @param enableFallback - Whether fallback is enabled for this operation
     * @param onError - Callback to trigger when error cannot be handled by fallback
     * @param onFallback - Callback to trigger when fallback is being attempted
     * @param onProviderChange - Callback to trigger when switching to a new provider
     * @param failedProviders - List of providers that have already failed in this session
     * @returns Promise resolving to whether retry should be attempted and with which provider
     */
    const handleStreamingError = useCallback(async (
        error: unknown,
        activeProvider: ProviderId,
        enableFallback: boolean,
        onError?: (error: unknown) => void,
        onFallback?: (from: ProviderId, to: ProviderId, reason: string) => void,
        onProviderChange?: (provider: ProviderId, model: string, isFallback: boolean) => void,
        failedProviders?: ProviderId[]
    ): Promise<{ 
        shouldRetry: boolean; 
        nextProvider?: ProviderId; 
        nextModel?: string;
    }> => {
        // Classify the error to determine appropriate handling strategy
        const classification = classifyError(error);

        // If fallback is enabled and the error type warrants fallback
        if (enableFallback && classification.shouldFallback) {
            // Find the next available provider that hasn't failed yet
            const nextProvider = getNextFallbackProvider(
                activeProvider,
                failedProviders || [],
                error
            );

            // If we found a suitable fallback provider
            if (nextProvider) {
                // Notify the UI that we're switching providers
                onProviderChange?.(nextProvider.provider, nextProvider.model, true);
                // Notify the UI that fallback is happening
                onFallback?.(activeProvider, nextProvider.provider, classification.message);
                return { 
                    shouldRetry: true,
                    nextProvider: nextProvider.provider,
                    nextModel: nextProvider.model
                };
            }
        }

        // No fallback possible or enabled, trigger error callback
        onError?.(error);
        return { shouldRetry: false };
    }, []);

    /**
     * Executes a streaming operation with retry logic and fallback handling
     * 
     * This is the core streaming function that manages the entire lifecycle of a chat message:
     * 1. Sets up the streaming operation with the provided model and messages
     * 2. Handles real-time text generation and UI updates
     * 3. Implements retry logic for transient errors
     * 4. Falls back to alternative providers when appropriate
     * 5. Formats and displays user-friendly error messages
     * 
     * @param options - Configuration for the streaming operation
     * @param messages - Current conversation history
     * @param setMessages - State setter to update the conversation in real-time
     * @param assistantIndex - Index in messages array where the assistant response should go
     * @param failedProvidersRef - Ref tracking providers that have already failed
     * @returns Promise resolving to the streaming result
     */
    const executeStreaming = useCallback(async (
        options: StreamingOptions,
        messages: ModelMessage[],
        setMessages: React.Dispatch<React.SetStateAction<ModelMessage[]>>,
        assistantIndex: number,
        failedProvidersRef: React.MutableRefObject<ProviderId[]>
    ): Promise<StreamingResult> => {
        // Extract options for easier access
        const {
            model: currentModel,
            enableRetry,
            retryConfig,
            enableFallback,
            activeProvider,
            effectiveProviderId,
            onChunk,
            onChunkReceived,
            onThinkingChunk,
            onDoneSignalReceived,
            onStreamCompleted,
            thinkingLevel,
            onError,
            onFallback,
            onProviderChange,
            abortSignal,
            canMutateState,
        } = options;

        const canCommit = (): boolean => {
            if (abortSignal?.aborted) {
                return false;
            }

            return canMutateState ? canMutateState() : true;
        };

        const updateAssistantMessage = (
            content: string,
            errorAnnotation?: ChatErrorAnnotation,
        ): void => {
            if (!canCommit()) {
                return;
            }

            setMessages((prev) => {
                const next = [...prev];
                const previousMessage = next[assistantIndex];
                const baseAssistantMessage = previousMessage?.role === "assistant"
                    ? previousMessage
                    : ({ role: "assistant", content: "" } as Extract<ModelMessage, { role: "assistant" }>);
                const updatedAssistantMessage: ModelMessage = {
                    ...baseAssistantMessage,
                    role: "assistant",
                    content,
                };

                next[assistantIndex] = errorAnnotation
                    ? withErrorAnnotation(updatedAssistantMessage, errorAnnotation)
                    : updatedAssistantMessage;
                return next;
            });
        };

        // Accumulator for the complete response text
        let accumulated = "";
        // Accumulator for the complete reasoning output
        let reasoningAccumulated = "";
        // Flag indicating whether we should retry with a different provider
        let shouldRetryWithFallback = false;
        let nextProvider: ProviderId | undefined;
        let nextModel: string | undefined;

        // Merge default retry config with any custom overrides
        const mergedRetryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

        /**
         * Core streaming operation that handles the AI text generation
         * This function processes the text stream and updates the UI in real-time
         */
        const streamOperation = async () => {
            let hasSignaledCompletion = false;

            const signalCompletion = () => {
                if (hasSignaledCompletion) {
                    return;
                }

                hasSignaledCompletion = true;
                onDoneSignalReceived?.();
                onStreamCompleted?.();
            };

            const canModelThink = currentModel.provider === "ollama"
                || isThinkingCapableModel(
                    currentModel.provider,
                    currentModel.modelId ?? "",
                );
            const thinkingChunkHandler = canModelThink ? onThinkingChunk : undefined;
            const shouldRequestThinking = Boolean(thinkingChunkHandler);
            const effectiveThinkingLevel: ThinkingLevel = thinkingLevel ?? "medium";
            let providerOptions: Parameters<typeof streamText>[0]["providerOptions"];

            if (shouldRequestThinking && currentModel.provider === "openai") {
                providerOptions = {
                    openai: {
                        reasoningEffort: effectiveThinkingLevel,
                        reasoningSummary: "auto",
                    },
                };
            } else if (shouldRequestThinking && currentModel.provider === "openrouter") {
                providerOptions = {
                    openrouter: {
                        includeReasoning: true,
                        reasoning: {
                            effort: effectiveThinkingLevel,
                        },
                    },
                };
            } else if (shouldRequestThinking && currentModel.provider === "ollama") {
                providerOptions = {
                    ollama: {
                        think: true,
                    },
                };
            }

            const shouldUseOpenRouterVideoTransport = currentModel.provider === "openrouter"
                && hasVideoMessageContent(messages);

            const streamViaOpenRouterVideoTransport = async (): Promise<void> => {
                const { apiKey } = getProviderAuth("openrouter");
                if (!apiKey) {
                    throw new Error("OpenRouter API key is required for video messages.");
                }

                if (!currentModel.modelId) {
                    throw new Error("OpenRouter model is required for video messages.");
                }

                const requestBody: Record<string, unknown> = {
                    model: currentModel.modelId,
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
                    if (reasoningDelta && thinkingChunkHandler) {
                        onChunkReceived?.();
                        reasoningAccumulated += reasoningDelta;
                        if (canCommit()) {
                            thinkingChunkHandler(reasoningDelta, reasoningAccumulated);
                        }
                    }

                    const textDelta = getOpenRouterChunkTextDelta(parsedPayload);
                    if (textDelta) {
                        onChunkReceived?.();
                        accumulated += textDelta;
                        updateAssistantMessage(accumulated);

                        if (canCommit()) {
                            onChunk?.(textDelta, accumulated);
                        }
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
            };

            if (shouldUseOpenRouterVideoTransport) {
                await streamViaOpenRouterVideoTransport();
                return;
            }

            // Initialize the streaming text generation.
            // Forward the abort signal so lifecycle timeouts and user
            // cancellations terminate provider I/O immediately.
            const result = streamText({
                model: currentModel.model!,
                messages: messages,
                providerOptions,
                abortSignal,
            });

            try {
                if (result.fullStream) {
                    for await (const part of result.fullStream) {
                        // Check for abort signal
                        if (abortSignal?.aborted) {
                            return;
                        }

                        if (part.type === "finish" || part.type === "finish-step") {
                            signalCompletion();
                            break;
                        }

                        if (part.type === "reasoning-delta") {
                            if (!thinkingChunkHandler) {
                                continue;
                            }

                            const reasoningDelta = typeof (part as { text?: unknown }).text === "string"
                                ? (part as { text: string }).text
                                : typeof (part as { delta?: unknown }).delta === "string"
                                    ? (part as { delta?: string }).delta ?? ""
                                    : "";

                            if (!reasoningDelta) {
                                continue;
                            }

                            onChunkReceived?.();
                            reasoningAccumulated += reasoningDelta;
                            if (canCommit()) {
                                thinkingChunkHandler?.(reasoningDelta, reasoningAccumulated);
                            }
                            continue;
                        }

                        if (part.type === "text-delta") {
                            const textDelta = typeof part.text === "string" ? part.text : "";

                            if (!textDelta) {
                                continue;
                            }

                            onChunkReceived?.();
                            accumulated += textDelta;
                            updateAssistantMessage(accumulated);

                            if (canCommit()) {
                                onChunk?.(textDelta, accumulated);
                            }
                        }
                    }

                    signalCompletion();
                    return;
                }

                // Fallback for older SDKs without fullStream
                for await (const chunk of result.textStream) {
                    // Check for abort signal
                    if (abortSignal?.aborted) {
                        return;
                    }

                    if (!chunk) {
                        continue;
                    }

                    onChunkReceived?.();

                    accumulated += chunk;
                    updateAssistantMessage(accumulated);

                    if (canCommit()) {
                        onChunk?.(chunk, accumulated);
                    }
                }

                signalCompletion();
            } catch (streamError: unknown) {
                // When the abort signal fires (lifecycle timeout or user cancel),
                // the SDK throws an AbortError.  Treat this as a clean exit so
                // the error doesn't cascade into retry/fallback logic.
                if (abortSignal?.aborted) {
                    return;
                }

                // Non-abort errors should propagate for retry/fallback handling.
                throw streamError;
            }
        };

        try {
            // If retry is enabled, wrap the stream operation with retry logic
            if (enableRetry) {
                const retryResult = await executeWithRetry(
                    streamOperation,
                    mergedRetryConfig
                );

                // If retry failed but we have an error to handle
                if (!retryResult.success && retryResult.error) {
                    if (!canCommit()) {
                        return {
                            success: true,
                            shouldRetryWithFallback: false,
                            accumulated,
                            wasCancelled: options.abortSignal?.aborted ?? false,
                            nextProvider,
                            nextModel,
                        };
                    }

                    // Log detailed error info for debugging
                    console.error("[useChatStreaming] Streaming error after retries:", {
                        provider: effectiveProviderId,
                        model: currentModel.modelId,
                        errorType: retryResult.error.category,
                        errorMessage: retryResult.error.message,
                        attempts: retryResult.attempts,
                        accumulatedLength: accumulated.length,
                        timestamp: new Date().toISOString(),
                        hasFallbackAvailable: enableFallback,
                    });

                    const errorResult = await handleStreamingError(
                        retryResult.error,
                        activeProvider,
                        enableFallback,
                        onError,
                        onFallback,
                        onProviderChange,
                        failedProvidersRef.current
                    );

                    if (errorResult.shouldRetry && errorResult.nextProvider && errorResult.nextModel) {
                        // Mark current provider as failed
                        if (!failedProvidersRef.current.includes(activeProvider)) {
                            failedProvidersRef.current.push(activeProvider);
                        }
                        shouldRetryWithFallback = true;
                        nextProvider = errorResult.nextProvider;
                        nextModel = errorResult.nextModel;

                        console.log("[useChatStreaming] Falling back to provider:", {
                            from: activeProvider,
                            to: errorResult.nextProvider,
                            reason: retryResult.error.message,
                            timestamp: new Date().toISOString(),
                        });
                    } else {
                        // No fallback available, show user-friendly error
                        const errorMessage = formatErrorForChat(retryResult.error, activeProvider);
                        const providerHint = getProviderErrorHint(retryResult.error, activeProvider);
                        const fullErrorMessage = providerHint
                            ? `${errorMessage}\n\n*Tip: ${providerHint}*`
                            : errorMessage;
                        const errorAnnotation = createErrorAnnotation({
                            error: getErrorMessageText(retryResult.error),
                            fixes: getErrorFixes(retryResult.error, activeProvider),
                            source: "streaming",
                            provider: activeProvider,
                        });

                        // Preserve partial content and append error message
                        const partialContent = accumulated.length > 0
                            ? `${accumulated}\n\n---\n\n**Error:** ${fullErrorMessage}`
                            : fullErrorMessage;

                        updateAssistantMessage(partialContent, errorAnnotation);
                    }
                }
            } else {
                // No retry enabled, execute the stream operation directly
                await streamOperation();
            }
        } catch (err) {
            // Log detailed error info for debugging
            const classification = classifyError(err);
            console.error("[useChatStreaming] Unexpected streaming error:", {
                provider: effectiveProviderId,
                model: currentModel.modelId,
                errorType: classification.category,
                errorMessage: classification.message,
                accumulatedLength: accumulated.length,
                timestamp: new Date().toISOString(),
                stack: err instanceof Error ? err.stack : undefined,
            });

            // Handle unexpected errors that weren't caught by the retry mechanism
            const errorResult = await handleStreamingError(
                err,
                activeProvider,
                enableFallback,
                onError,
                onFallback,
                onProviderChange,
                failedProvidersRef.current
            );

            if (!canCommit()) {
                return {
                    success: true,
                    shouldRetryWithFallback: false,
                    accumulated,
                    wasCancelled: options.abortSignal?.aborted ?? false,
                };
            }

            if (errorResult.shouldRetry && errorResult.nextProvider) {
                // We have a fallback provider available
                if (!failedProvidersRef.current.includes(activeProvider)) {
                    failedProvidersRef.current.push(activeProvider);
                }
                shouldRetryWithFallback = true;
                nextProvider = errorResult.nextProvider;
                nextModel = errorResult.nextModel;
                
                console.log("[useChatStreaming] Falling back to provider after error:", {
                    from: activeProvider,
                    to: errorResult.nextProvider,
                    reason: classification.message,
                    timestamp: new Date().toISOString(),
                });
            } else {
                // No fallback available, format and display the error
                const errorMessage = formatErrorForChat(err, activeProvider);
                const providerHint = getProviderErrorHint(err, activeProvider);
                const fullErrorMessage = providerHint
                    ? `${errorMessage}\n\n*Tip: ${providerHint}*`
                    : errorMessage;
                const errorAnnotation = createErrorAnnotation({
                    error: getErrorMessageText(err),
                    fixes: getErrorFixes(err, activeProvider),
                    source: "streaming",
                    provider: activeProvider,
                });

                // Preserve partial content and append error message
                const partialContent = accumulated.length > 0
                    ? `${accumulated}\n\n---\n\n**Error:** ${fullErrorMessage}`
                    : fullErrorMessage;

                updateAssistantMessage(partialContent, errorAnnotation);
            }
        }

        return {
            success: !shouldRetryWithFallback,
            shouldRetryWithFallback,
            accumulated,
            wasCancelled: options.abortSignal?.aborted ?? false,
            nextProvider,
            nextModel,
        };
    }, [handleStreamingError]);

    return {
        executeStreaming,
        handleStreamingError,
    };
}
