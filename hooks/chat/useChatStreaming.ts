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
import { streamText, type LanguageModel, type ModelMessage } from "ai";
// Provider type definitions for the fallback system
import { isThinkingCapableModel, type ProviderId } from "@/types/provider.types";
import type { ThinkingLevel } from "@/types/chat.types";
// Fallback chain utilities for provider switching and error classification
import { getModelWithFallback, getNextFallbackProvider, classifyError, hasFallbackAvailable, type FallbackResult } from "@/providers/fallback-chain";
// Error message formatting utilities for user-friendly error display
import { formatErrorForChat, getProviderErrorHint, shouldShowRetry } from "@/lib/error-messages";
// Retry mechanism with exponential backoff for handling transient errors
import { executeWithRetry, DEFAULT_RETRY_CONFIG, type RetryConfig } from "@/hooks/useErrorRecovery";

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
    /** Callback fired when a new thinking/reasoning chunk is received */
    onThinkingChunk?: (chunk: string, accumulated: string) => void;
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
}

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
            onThinkingChunk,
            thinkingLevel,
            onError,
            onFallback,
            onProviderChange,
            abortSignal,
        } = options;

        // Accumulator for the complete response text
        let accumulated = "";
        // Accumulator for the complete reasoning output
        let reasoningAccumulated = "";
        // Flag indicating whether we should retry with a different provider
        let shouldRetryWithFallback = false;

        // Merge default retry config with any custom overrides
        const mergedRetryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

        /**
         * Core streaming operation that handles the AI text generation
         * This function processes the text stream and updates the UI in real-time
         */
        const streamOperation = async () => {
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
            // Initialize the streaming text generation
            const result = streamText({
                model: currentModel.model!,
                messages: messages,
                providerOptions,
            });

            if (result.fullStream) {
                for await (const part of result.fullStream) {
                    // Check for abort signal
                    if (abortSignal?.aborted) {
                        return;
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

                        reasoningAccumulated += reasoningDelta;
                        thinkingChunkHandler?.(reasoningDelta, reasoningAccumulated);
                        continue;
                    }

                    if (part.type === "text-delta") {
                        accumulated += part.text;

                        setMessages((prev) => {
                            const next = [...prev];
                            next[assistantIndex] = {
                                role: "assistant",
                                content: accumulated,
                            };
                            return next;
                        });

                        onChunk?.(part.text, accumulated);
                    }
                }
                return;
            }

            // Fallback for older SDKs without fullStream
            for await (const chunk of result.textStream) {
                // Check for abort signal
                if (abortSignal?.aborted) {
                    return;
                }

                accumulated += chunk;

                setMessages((prev) => {
                    const next = [...prev];
                    next[assistantIndex] = {
                        role: "assistant",
                        content: accumulated,
                    };
                    return next;
                });

                onChunk?.(chunk, accumulated);
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
                    const errorResult = await handleStreamingError(
                        retryResult.error,
                        activeProvider,
                        enableFallback,
                        onError,
                        onFallback,
                        onProviderChange,
                        failedProvidersRef.current
                    );

                    if (errorResult.shouldRetry) {
                        // If we have a fallback provider available
                        if (errorResult.nextProvider) {
                            // Mark current provider as failed
                            failedProvidersRef.current.push(activeProvider);
                            shouldRetryWithFallback = true;
                        } else {
                            // No fallback available, show user-friendly error
                            const errorMessage = formatErrorForChat(retryResult.error, activeProvider);
                            const providerHint = getProviderErrorHint(retryResult.error, activeProvider);
                            const fullErrorMessage = providerHint 
                                ? `${errorMessage}\n\n*Tip: ${providerHint}*`
                                : errorMessage;

                            setMessages((prev) => {
                                const next = [...prev];
                                next[assistantIndex] = {
                                    role: "assistant",
                                    content: fullErrorMessage,
                                };
                                return next;
                            });
                        }
                    }
                }
            } else {
                // No retry enabled, execute the stream operation directly
                await streamOperation();
            }
        } catch (err) {
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

            if (errorResult.shouldRetry && errorResult.nextProvider) {
                // We have a fallback provider available
                failedProvidersRef.current.push(activeProvider);
                shouldRetryWithFallback = true;
            } else {
                // No fallback available, format and display the error
                const errorMessage = formatErrorForChat(err, activeProvider);
                const providerHint = getProviderErrorHint(err, activeProvider);
                const fullErrorMessage = providerHint 
                    ? `${errorMessage}\n\n*Tip: ${providerHint}*`
                    : errorMessage;

                setMessages((prev) => {
                    const next = [...prev];
                    next[assistantIndex] = {
                        role: "assistant",
                        content: fullErrorMessage,
                    };
                    return next;
                });
            }
        }

        return {
            success: !shouldRetryWithFallback,
            shouldRetryWithFallback,
            accumulated,
            wasCancelled: options.abortSignal?.aborted ?? false,
        };
    }, [handleStreamingError]);

    return {
        executeStreaming,
        handleStreamingError,
    };
}
