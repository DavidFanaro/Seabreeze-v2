/**
 * @file useChat.ts
 * @purpose Main chat orchestrator with state management
 * @connects-to useChatStreaming, useTitleGeneration, useChatState
 */

import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import type { LanguageModel, ModelMessage } from "ai";
import { ProviderId } from "@/types/provider.types";
import { getProviderModel } from "@/providers/provider-factory";
import { getCachedModel } from "@/providers/provider-cache";
import { type FallbackResult } from "@/providers/fallback-chain";
import { executeWithRetry, DEFAULT_RETRY_CONFIG, type RetryConfig } from "@/hooks/useErrorRecovery";
import { useChatState } from "@/hooks/useChatState";
import { useTitleGeneration } from "./useTitleGeneration";
import { useChatStreaming } from "./useChatStreaming";
import type { UseChatOptions } from "@/types/chat.types";

type ChunkHandler = (chunk: string, accumulated: string) => void;

export interface UseChatReturn {
    text: string;
    setText: (value: string) => void;
    messages: ModelMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ModelMessage[]>>;
    isStreaming: boolean;
    sendMessage: (overrideText?: string) => Promise<void>;
    cancel: () => void;
    reset: () => void;
    title: string;
    setTitle: (title: string) => void;
    generateTitle: () => Promise<string>;
    currentProvider: ProviderId;
    currentModel: string;
    isUsingFallback: boolean;
    retryLastMessage: () => Promise<void>;
    canRetry: boolean;
}

export default function useChat(options: UseChatOptions = {}): UseChatReturn {
    const {
        initialMessages = [],
        initialText = "",
        placeholder = "...",
        providerId: legacyProviderId,
        modelId: legacyModelId,
        chatId,
        model: providedModel,
        onChunk,
        onError,
        onComplete,
        onFallback,
        enableFallback = true,
        enableRetry = true,
        retryConfig = {},
    } = options;

    const chatState = useChatState(chatId || null);
    
    const effectiveProviderId = chatId 
        ? chatState.provider 
        : (legacyProviderId || "apple");
    const effectiveModelId = chatId 
        ? chatState.model 
        : (legacyModelId || "system-default");

    const [text, setText] = useState<string>(initialText);
    const [messages, setMessages] = useState<ModelMessage[]>(initialMessages);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    
    const [activeProvider, setActiveProvider] = useState<ProviderId>(effectiveProviderId);
    const [activeModel, setActiveModel] = useState<string>(effectiveModelId);
    const [isUsingFallback, setIsUsingFallback] = useState<boolean>(false);
    
    const failedProvidersRef = useRef<ProviderId[]>([]);
    
    const lastUserMessageRef = useRef<string | null>(null);
    const [canRetry, setCanRetry] = useState<boolean>(false);
    const canceledRef = useRef<boolean>(false);

    const mergedRetryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    const model: LanguageModel | null = useMemo(() => {
        if (providedModel) {
            return providedModel as LanguageModel;
        }

        const cachedModel = getCachedModel(
            activeProvider,
            activeModel,
            () => getProviderModel(activeProvider, activeModel).model
        );

        return cachedModel || null;
    }, [providedModel, activeProvider, activeModel]);

    const { title, setTitle, generateTitle } = useTitleGeneration(
        messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })),
        model,
        enableRetry,
        mergedRetryConfig
    );

    const { executeStreaming, handleStreamingError } = useChatStreaming();

    useEffect(() => {
        if (!isStreaming) {
            setActiveProvider(effectiveProviderId);
            setActiveModel(effectiveModelId);
            setIsUsingFallback(false);
            failedProvidersRef.current = [];
        }
    }, [effectiveProviderId, effectiveModelId, isStreaming]);

    const reset = useCallback(() => {
        setText("");
        setMessages([]);
        setTitle("Chat");
        setActiveProvider(effectiveProviderId);
        setActiveModel(effectiveModelId);
        setIsUsingFallback(false);
        failedProvidersRef.current = [];
        lastUserMessageRef.current = null;
        setCanRetry(false);
    }, [effectiveProviderId, effectiveModelId, setTitle]);

    const cancel = useCallback(() => {
        canceledRef.current = true;
    }, []);

    const sendMessage = useCallback(
        async (overrideText?: string) => {
            const rawValue: unknown = overrideText ?? (text as unknown);
            const content = typeof rawValue === "string" ? rawValue.trim() : "";
            if (!content) return;

            setIsStreaming(true);
            canceledRef.current = false;
            setCanRetry(false);
            lastUserMessageRef.current = content;

            const userMessage: ModelMessage = { role: "user", content };
            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);

            if (overrideText === undefined) {
                setText("");
            }

            const assistantIndex = updatedMessages.length;
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: placeholder,
                },
            ]);

            if (!model) {
                setMessages((prev) => {
                    const next = [...prev];
                    next[assistantIndex] = {
                        role: "assistant",
                        content: "**Setup Required**\n\nNo AI provider configured. Please set up a provider in settings.\n\n*Go to Settings to configure an AI provider.*",
                    };
                    return next;
                });
                
                onError?.(new Error("No AI provider configured"));
                setIsStreaming(false);
                onComplete?.();
                return;
            }

            const streamingOptions = {
                model: {
                    model,
                    provider: activeProvider,
                    modelId: activeModel,
                    isOriginal: !isUsingFallback,
                    attemptedProviders: failedProvidersRef.current,
                } as FallbackResult,
                enableRetry,
                retryConfig: mergedRetryConfig,
                enableFallback,
                activeProvider,
                effectiveProviderId,
                onChunk,
                onError,
                onFallback,
                onProviderChange: (provider: ProviderId, model: string, isFallback: boolean) => {
                    setActiveProvider(provider);
                    setActiveModel(model);
                    setIsUsingFallback(isFallback);
                },
            };

            const result = await executeStreaming(
                streamingOptions,
                updatedMessages,
                setMessages,
                assistantIndex,
                failedProvidersRef
            );

            if (result.shouldRetryWithFallback && !canceledRef.current) {
                setIsStreaming(false);
                await new Promise(resolve => setTimeout(resolve, 100));
                await sendMessage(content);
                return;
            }

            setIsStreaming(false);
            onComplete?.();
        },
        [
            messages, 
            text, 
            placeholder, 
            model, 
            activeProvider, 
            activeModel, 
            isUsingFallback,
            enableRetry, 
            mergedRetryConfig,
            executeStreaming,
            onChunk, 
            onComplete, 
            onError, 
            onFallback,
            effectiveProviderId
        ],
    );

    const retryLastMessage = useCallback(async () => {
        if (!lastUserMessageRef.current || !canRetry) return;
        
        setMessages((prev) => {
            if (prev.length >= 2 && prev[prev.length - 1].role === "assistant") {
                return prev.slice(0, -1);
            }
            return prev;
        });

        setMessages((prev) => {
            if (prev.length >= 1 && prev[prev.length - 1].role === "user") {
                return prev.slice(0, -1);
            }
            return prev;
        });

        setCanRetry(false);
        await sendMessage(lastUserMessageRef.current);
    }, [canRetry, sendMessage]);

    return {
        text,
        setText,
        messages,
        setMessages,
        isStreaming,
        sendMessage,
        cancel,
        reset,
        title,
        setTitle,
        generateTitle,
        currentProvider: activeProvider,
        currentModel: activeModel,
        isUsingFallback,
        retryLastMessage,
        canRetry,
    };
}
