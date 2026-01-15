/**
 * @file useChatStreaming.ts
 * @purpose Streaming text logic with fallback and retry handling
 * @connects-to useChat, provider-factory, fallback-chain
 */

import { useCallback } from "react";
import { streamText, type LanguageModel, type ModelMessage } from "ai";
import { ProviderId } from "@/types/provider.types";
import { getModelWithFallback, getNextFallbackProvider, classifyError, hasFallbackAvailable, type FallbackResult } from "@/providers/fallback-chain";
import { formatErrorForChat, getProviderErrorHint, shouldShowRetry } from "@/lib/error-messages";
import { executeWithRetry, DEFAULT_RETRY_CONFIG, type RetryConfig } from "@/hooks/useErrorRecovery";

interface StreamingOptions {
    model: FallbackResult;
    enableRetry: boolean;
    retryConfig: Partial<RetryConfig>;
    enableFallback: boolean;
    activeProvider: ProviderId;
    effectiveProviderId: ProviderId;
    onChunk?: (chunk: string, accumulated: string) => void;
    onError?: (error: unknown) => void;
    onFallback?: (from: ProviderId, to: ProviderId, reason: string) => void;
    onProviderChange?: (provider: ProviderId, model: string, isFallback: boolean) => void;
}

interface StreamingResult {
    success: boolean;
    shouldRetryWithFallback: boolean;
    accumulated: string;
}

export function useChatStreaming() {
    /**
     * Handle streaming error with fallback logic
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
        const classification = classifyError(error);

        if (enableFallback && classification.shouldFallback) {
            const nextProvider = getNextFallbackProvider(
                activeProvider,
                failedProviders || [],
                error
            );

            if (nextProvider) {
                onProviderChange?.(nextProvider.provider, nextProvider.model, true);
                onFallback?.(activeProvider, nextProvider.provider, classification.message);
                return { 
                    shouldRetry: true,
                    nextProvider: nextProvider.provider,
                    nextModel: nextProvider.model
                };
            }
        }

        onError?.(error);
        return { shouldRetry: false };
    }, []);

    /**
     * Execute streaming operation with retry and fallback
     */
    const executeStreaming = useCallback(async (
        options: StreamingOptions,
        messages: ModelMessage[],
        setMessages: React.Dispatch<React.SetStateAction<ModelMessage[]>>,
        assistantIndex: number,
        failedProvidersRef: React.MutableRefObject<ProviderId[]>
    ): Promise<StreamingResult> => {
        const {
            model: currentModel,
            enableRetry,
            retryConfig,
            enableFallback,
            activeProvider,
            effectiveProviderId,
            onChunk,
            onError,
            onFallback,
            onProviderChange,
        } = options;

        let accumulated = "";
        let shouldRetryWithFallback = false;

        const mergedRetryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

        const streamOperation = async () => {
            const result = streamText({
                model: currentModel.model!,
                messages: messages,
            });

            for await (const chunk of result.textStream) {
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
            if (enableRetry) {
                const retryResult = await executeWithRetry(
                    streamOperation,
                    mergedRetryConfig
                );

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
                        if (errorResult.nextProvider) {
                            failedProvidersRef.current.push(activeProvider);
                            shouldRetryWithFallback = true;
                        } else {
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
                await streamOperation();
            }
        } catch (err) {
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
                failedProvidersRef.current.push(activeProvider);
                shouldRetryWithFallback = true;
            } else {
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
        };
    }, [handleStreamingError]);

    return {
        executeStreaming,
        handleStreamingError,
    };
}
