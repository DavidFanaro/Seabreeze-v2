import { useCallback } from "react";
import type { LanguageModel, ModelMessage } from "ai";

import { createAppleModel } from "@/providers/apple-provider";
import type { FallbackResult } from "@/providers/fallback-chain";
import {
    createErrorAnnotation,
    withErrorAnnotation,
} from "@/lib/chat-error-annotations";
import { getErrorFixes } from "@/lib/error-messages";
import { prepareMessagesForProvider, needsProviderMessagePreparation } from "@/lib/chat-provider-message-preparation";
import {
    createIdempotencyKey,
    createIdempotencyRegistry,
    createSequenceGuard,
} from "@/lib/concurrency";
import {
    createSearxngToolRuntime,
    WEB_SEARCH_SYSTEM_PROMPT,
} from "@/lib/searxng-tool";
import type {
    ChatActiveWebSearchState,
    ChatSendInput,
    ChatSendPayload,
    ThinkingLevel,
} from "@/types/chat.types";
import { isVideoCapableModel, type ProviderId } from "@/types/provider.types";

import type {
    RetryConfig,
} from "@/hooks/useErrorRecovery";
import type { StreamingResult, StreamingOptions } from "./useChatStreaming";
import {
    buildMessageSignature,
    conversationHasVideoContent,
    createUserMessageContent,
    formatAnnotatedErrorContent,
    getErrorMessageText,
    hasSendableContent,
    hasVideoAttachment,
    isSameMessageContent,
    normalizeAttachments,
    normalizePossibleFixes,
    resolveSendPayload,
    type RetryableOperation,
} from "./chatSendUtils";

type ChunkHandler = (chunk: string, accumulated: string) => void;

interface UseChatSendFlowOptions {
    text: string;
    chatId?: string;
    placeholderText: string;
    activeProvider: ProviderId;
    activeModel: string;
    isUsingFallback: boolean;
    effectiveProviderId: ProviderId;
    enableRetry: boolean;
    mergedRetryConfig: RetryConfig;
    enableFallback: boolean;
    enableThinking: boolean;
    enableWebSearch: boolean;
    thinkingLevel?: ThinkingLevel;
    searxngUrl: string | null;
    onChunk?: ChunkHandler;
    onThinkingChunk?: ChunkHandler;
    onComplete?: () => void;
    onError?: (error: unknown) => void;
    onFallback?: (from: ProviderId, to: ProviderId, reason: string) => void;
    setText: React.Dispatch<React.SetStateAction<string>>;
    setMessages: React.Dispatch<React.SetStateAction<ModelMessage[]>>;
    setThinkingOutput: React.Dispatch<React.SetStateAction<string[]>>;
    setActiveWebSearchState: React.Dispatch<React.SetStateAction<ChatActiveWebSearchState | null>>;
    setIsThinking: React.Dispatch<React.SetStateAction<boolean>>;
    setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
    setCanRetry: React.Dispatch<React.SetStateAction<boolean>>;
    setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
    setActiveProvider: React.Dispatch<React.SetStateAction<ProviderId>>;
    setActiveModel: React.Dispatch<React.SetStateAction<string>>;
    setIsUsingFallback: React.Dispatch<React.SetStateAction<boolean>>;
    messagesRef: React.MutableRefObject<ModelMessage[]>;
    failedProvidersRef: React.MutableRefObject<ProviderId[]>;
    lastUserMessageRef: React.MutableRefObject<ChatSendPayload | null>;
    attachmentDataCacheRef: React.MutableRefObject<Map<string, string>>;
    sendSequenceGuardRef: React.MutableRefObject<ReturnType<typeof createSequenceGuard>>;
    retryOperationRegistryRef: React.MutableRefObject<ReturnType<typeof createIdempotencyRegistry<void>>>;
    lastRetryableOperationRef: React.MutableRefObject<RetryableOperation | null>;
    canceledRef: React.MutableRefObject<boolean>;
    initializeStream: () => AbortController;
    markChunkReceived: () => void;
    markDoneSignalReceived: () => void;
    markCompleting: () => void;
    markCompleted: () => void;
    markError: (error: Error) => void;
    commitWebSearchAnnotation: (
        assistantIndex: number,
        annotation: ChatActiveWebSearchState["annotation"] | null,
    ) => void;
    resolveModelForSelection: (providerId: ProviderId, modelId: string) => LanguageModel | null;
    executeStreaming: (
        options: StreamingOptions,
        messages: ModelMessage[],
        setMessages: React.Dispatch<React.SetStateAction<ModelMessage[]>>,
        assistantIndex: number,
        failedProvidersRef: React.MutableRefObject<ProviderId[]>,
    ) => Promise<StreamingResult>;
}

interface UseChatSendFlowReturn {
    sendMessage: (input?: ChatSendInput) => Promise<void>;
    retryLastMessage: () => Promise<void>;
}

export function useChatSendFlow(options: UseChatSendFlowOptions): UseChatSendFlowReturn {
    const {
        text,
        chatId,
        placeholderText,
        activeProvider,
        activeModel,
        isUsingFallback,
        effectiveProviderId,
        enableRetry,
        mergedRetryConfig,
        enableFallback,
        enableThinking,
        enableWebSearch,
        thinkingLevel,
        searxngUrl,
        onChunk,
        onThinkingChunk,
        onComplete,
        onError,
        onFallback,
        setText,
        setMessages,
        setThinkingOutput,
        setActiveWebSearchState,
        setIsThinking,
        setIsStreaming,
        setCanRetry,
        setErrorMessage,
        setActiveProvider,
        setActiveModel,
        setIsUsingFallback,
        messagesRef,
        failedProvidersRef,
        lastUserMessageRef,
        attachmentDataCacheRef,
        sendSequenceGuardRef,
        retryOperationRegistryRef,
        lastRetryableOperationRef,
        canceledRef,
        initializeStream,
        markChunkReceived,
        markDoneSignalReceived,
        markCompleting,
        markCompleted,
        markError,
        commitWebSearchAnnotation,
        resolveModelForSelection,
        executeStreaming,
    } = options;

    const sendMessage = useCallback(async (input?: ChatSendInput) => {
        const resolvedPayload = resolveSendPayload(input, text);

        if (!hasSendableContent(resolvedPayload)) {
            return;
        }

        const requestIncludesVideo = hasVideoAttachment(resolvedPayload.attachments)
            || conversationHasVideoContent(messagesRef.current);

        if (requestIncludesVideo && !isVideoCapableModel(activeProvider, activeModel)) {
            const compatibilityError = new Error(
                "Video messages require OpenRouter with a video-capable model (for example google/gemini-2.5-flash or google/gemini-2.5-pro). Switch the model in Settings and resend.",
            );
            const compatibilityFixes = [
                "Switch to OpenRouter with a video-capable model such as google/gemini-2.5-flash.",
                "Open Settings and confirm the selected model supports video input.",
                "Remove the video attachment and resend as text-only.",
            ];
            const compatibilityMessage = withErrorAnnotation(
                {
                    role: "assistant",
                    content: formatAnnotatedErrorContent(
                        "Video Not Supported",
                        compatibilityError.message,
                        compatibilityFixes,
                    ),
                },
                createErrorAnnotation({
                    error: compatibilityError.message,
                    fixes: compatibilityFixes,
                    source: "compatibility",
                    provider: activeProvider,
                }),
            );

            setMessages((prev) => [...prev, compatibilityMessage]);
            setThinkingOutput((prev) => [...prev, ""]);
            setErrorMessage(compatibilityError.message);
            setCanRetry(false);
            onError?.(compatibilityError);
            return;
        }

        const userMessageContent = createUserMessageContent(resolvedPayload);
        const messageSignature = buildMessageSignature(userMessageContent);

        const sendToken = sendSequenceGuardRef.current.next();
        const sendOperationKey = createIdempotencyKey("chat-send", [
            chatId ?? "default",
            sendToken.sequence,
            messageSignature,
        ]);

        const finalizeCurrentSendState = (): void => {
            if (!sendSequenceGuardRef.current.isCurrent(sendToken)) {
                return;
            }

            setIsStreaming(false);
            setIsThinking(false);
        };

        setIsStreaming(true);
        setIsThinking(false);
        setActiveWebSearchState(null);
        canceledRef.current = false;
        setCanRetry(false);
        lastRetryableOperationRef.current = null;

        const retryPayload: ChatSendPayload = {
            text: resolvedPayload.text,
            attachments: [...resolvedPayload.attachments],
        };
        lastUserMessageRef.current = retryPayload;

        const streamController = initializeStream();
        const abortSignal = streamController.signal;
        const canMutateForCurrentSend = (): boolean => (
            sendSequenceGuardRef.current.isCurrent(sendToken)
            && !canceledRef.current
            && !abortSignal.aborted
        );

        const userMessage: ModelMessage = {
            role: "user",
            content: userMessageContent,
        };
        const updatedMessages = [...messagesRef.current, userMessage];
        setMessages(updatedMessages);
        setThinkingOutput((prev) => [...prev, ""]);

        if (!resolvedPayload.usedOverrideText) {
            setText("");
        }

        const assistantIndex = updatedMessages.length;
        setMessages((prev) => ([
            ...prev,
            {
                role: "assistant",
                content: placeholderText,
            },
        ]));
        setThinkingOutput((prev) => [...prev, ""]);

        const webSearchRuntime = enableWebSearch
            && !requestIncludesVideo
            && typeof searxngUrl === "string"
            && searxngUrl.trim().length > 0
            ? createSearxngToolRuntime({
                enabled: true,
                searxngUrl: searxngUrl.trim(),
                onAnnotationChange: (annotation) => {
                    if (!annotation || !canMutateForCurrentSend()) {
                        return;
                    }

                    markChunkReceived();
                    setActiveWebSearchState({
                        messageIndex: assistantIndex,
                        annotation,
                    });
                },
            })
            : null;

        let attemptProvider = activeProvider;
        let attemptModel = activeModel;
        let attemptResolvedModel = resolveModelForSelection(attemptProvider, attemptModel);
        let providerMessages = updatedMessages;

        try {
            if (needsProviderMessagePreparation(updatedMessages)) {
                providerMessages = await prepareMessagesForProvider(
                    updatedMessages,
                    attachmentDataCacheRef.current,
                );
            }
        } catch (error) {
            const attachmentError = error instanceof Error
                ? error
                : new Error("Failed to prepare one or more attachments.");
            const attachmentErrorMessage = getErrorMessageText(attachmentError);
            const attachmentFixes = normalizePossibleFixes([
                ...getErrorFixes(attachmentError, attemptProvider),
                "Try selecting the attachment again.",
                "Make sure the file is still available on this device.",
            ]);

            markError(attachmentError);
            setErrorMessage(attachmentError.message);
            setCanRetry(true);
            lastRetryableOperationRef.current = {
                operationKey: sendOperationKey,
                payload: retryPayload,
                messageSignature,
            };
            setMessages((prev) => {
                const next = [...prev];
                next[assistantIndex] = withErrorAnnotation(
                    {
                        role: "assistant",
                        content: formatAnnotatedErrorContent(
                            "Attachment Error",
                            attachmentErrorMessage,
                            attachmentFixes,
                        ),
                    },
                    createErrorAnnotation({
                        error: attachmentErrorMessage,
                        fixes: attachmentFixes,
                        source: "attachment",
                        provider: attemptProvider,
                    }),
                );
                return next;
            });
            onError?.(attachmentError);
            finalizeCurrentSendState();
            return;
        }

        if (!canMutateForCurrentSend()) {
            return;
        }

        if (!attemptResolvedModel) {
            setMessages((prev) => {
                const next = [...prev];
                next[assistantIndex] = {
                    role: "assistant",
                    content: "**Setup Required**\n\nNo AI provider configured. Please set up a provider in settings.\n\n*Go to Settings to configure an AI provider.*",
                };
                return next;
            });

            onError?.(new Error("No AI provider configured"));
            finalizeCurrentSendState();
            onComplete?.();
            return;
        }

        const handleThinkingChunk = enableThinking
            ? (chunk: string, accumulated: string) => {
                if (!canMutateForCurrentSend()) {
                    return;
                }

                setIsThinking(true);
                setThinkingOutput((prev) => {
                    const next = [...prev];
                    next[assistantIndex] = accumulated;
                    return next;
                });
                onThinkingChunk?.(chunk, accumulated);
            }
            : undefined;

        while (true) {
            const attemptTools = webSearchRuntime?.createTools(attemptProvider);
            const attemptStreamingModel = attemptProvider === "apple" && attemptTools
                ? createAppleModel(attemptTools) as LanguageModel
                : attemptResolvedModel;

            const streamingOptions: StreamingOptions = {
                model: {
                    model: attemptStreamingModel,
                    provider: attemptProvider,
                    modelId: attemptModel,
                    isOriginal: attemptProvider === effectiveProviderId && !isUsingFallback,
                    attemptedProviders: failedProvidersRef.current,
                } as FallbackResult,
                enableRetry,
                retryConfig: mergedRetryConfig,
                enableFallback: requestIncludesVideo ? false : enableFallback,
                activeProvider: attemptProvider,
                effectiveProviderId: attemptProvider,
                thinkingLevel,
                systemPrompt: attemptTools ? WEB_SEARCH_SYSTEM_PROMPT : undefined,
                tools: attemptTools,
                abortSignal,
                onChunk,
                onThinkingChunk: handleThinkingChunk,
                onChunkReceived: () => {
                    if (!canMutateForCurrentSend()) {
                        return;
                    }

                    markChunkReceived();
                },
                onDoneSignalReceived: () => {
                    if (!canMutateForCurrentSend()) {
                        return;
                    }

                    markDoneSignalReceived();
                },
                onStreamCompleted: () => {
                    if (!canMutateForCurrentSend()) {
                        return;
                    }

                    markCompleting();
                    markCompleted();
                },
                canMutateState: canMutateForCurrentSend,
                onError: (error: unknown) => {
                    if (!canMutateForCurrentSend()) {
                        return;
                    }

                    if (error instanceof Error) {
                        markError(error);
                        setErrorMessage(error.message);
                        setCanRetry(true);
                        lastRetryableOperationRef.current = {
                            operationKey: sendOperationKey,
                            payload: retryPayload,
                            messageSignature,
                        };
                        onError?.(error);
                        return;
                    }

                    const wrappedError = new Error(String(error));
                    markError(wrappedError);
                    setErrorMessage(wrappedError.message);
                    setCanRetry(true);
                    lastRetryableOperationRef.current = {
                        operationKey: sendOperationKey,
                        payload: retryPayload,
                        messageSignature,
                    };
                    onError?.(wrappedError);
                },
                onFallback,
                onProviderChange: (provider: ProviderId, model: string, isFallback: boolean) => {
                    if (!canMutateForCurrentSend()) {
                        return;
                    }

                    setActiveProvider(provider);
                    setActiveModel(model);
                    setIsUsingFallback(isFallback);
                },
            };

            const result: StreamingResult = await executeStreaming(
                streamingOptions,
                providerMessages,
                setMessages,
                assistantIndex,
                failedProvidersRef,
            );

            if (!sendSequenceGuardRef.current.isCurrent(sendToken)) {
                return;
            }

            if (
                !requestIncludesVideo
                && result.shouldRetryWithFallback
                && result.nextProvider
                && result.nextModel
                && !canceledRef.current
            ) {
                const fallbackModel = resolveModelForSelection(result.nextProvider, result.nextModel);
                if (!fallbackModel) {
                    break;
                }

                attemptProvider = result.nextProvider;
                attemptModel = result.nextModel;
                attemptResolvedModel = fallbackModel;
                continue;
            }

            break;
        }

        if (canMutateForCurrentSend()) {
            commitWebSearchAnnotation(
                assistantIndex,
                webSearchRuntime?.getAnnotationSnapshot() ?? null,
            );
        }

        if (
            sendSequenceGuardRef.current.isCurrent(sendToken)
            && !canceledRef.current
            && !abortSignal.aborted
        ) {
            onComplete?.();
        }

        finalizeCurrentSendState();
    }, [
        activeModel,
        activeProvider,
        attachmentDataCacheRef,
        canceledRef,
        chatId,
        commitWebSearchAnnotation,
        effectiveProviderId,
        enableFallback,
        enableRetry,
        enableThinking,
        enableWebSearch,
        executeStreaming,
        failedProvidersRef,
        initializeStream,
        isUsingFallback,
        lastRetryableOperationRef,
        lastUserMessageRef,
        markChunkReceived,
        markCompleted,
        markCompleting,
        markDoneSignalReceived,
        markError,
        mergedRetryConfig,
        messagesRef,
        onChunk,
        onComplete,
        onError,
        onFallback,
        onThinkingChunk,
        placeholderText,
        resolveModelForSelection,
        searxngUrl,
        sendSequenceGuardRef,
        setActiveModel,
        setActiveProvider,
        setActiveWebSearchState,
        setCanRetry,
        setErrorMessage,
        setIsStreaming,
        setIsThinking,
        setIsUsingFallback,
        setMessages,
        setText,
        setThinkingOutput,
        text,
        thinkingLevel,
    ]);

    const retryLastMessage = useCallback(async () => {
        const retryableOperation = lastRetryableOperationRef.current;

        if (!lastUserMessageRef.current || !retryableOperation) {
            return;
        }

        const retryUserContent = createUserMessageContent({
            text: retryableOperation.payload.text?.trim() ?? "",
            attachments: normalizeAttachments(retryableOperation.payload.attachments),
        });

        const retryOperationKey = createIdempotencyKey("chat-retry", [
            retryableOperation.operationKey,
            retryableOperation.messageSignature,
        ]);

        await retryOperationRegistryRef.current.run(retryOperationKey, async () => {
            const currentMessages = messagesRef.current;
            let nextMessages = [...currentMessages];
            let removedCount = 0;

            if (nextMessages.length > 0 && nextMessages[nextMessages.length - 1].role === "assistant") {
                nextMessages = nextMessages.slice(0, -1);
                removedCount += 1;
            }

            const lastMessage = nextMessages[nextMessages.length - 1];
            if (
                lastMessage
                && lastMessage.role === "user"
                && isSameMessageContent(lastMessage.content, retryUserContent)
            ) {
                nextMessages = nextMessages.slice(0, -1);
                removedCount += 1;
            }

            messagesRef.current = nextMessages;
            setMessages(nextMessages);
            setThinkingOutput((prev) => prev.slice(0, Math.max(0, prev.length - removedCount)));

            setCanRetry(false);
            setErrorMessage(null);
            lastRetryableOperationRef.current = null;

            await sendMessage(retryableOperation.payload);
        });
    }, [
        lastRetryableOperationRef,
        lastUserMessageRef,
        messagesRef,
        retryOperationRegistryRef,
        sendMessage,
        setCanRetry,
        setErrorMessage,
        setMessages,
        setThinkingOutput,
    ]);

    return {
        sendMessage,
        retryLastMessage,
    };
}
