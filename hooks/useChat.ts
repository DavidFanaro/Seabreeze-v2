import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { ModelMessage, streamText, generateText, type LanguageModel } from "ai";
import { ProviderId } from "@/lib/types/provider-types";
import { getProviderModel } from "@/lib/providers/provider-factory";
import { getCachedModel } from "@/lib/providers/provider-cache";
import { 
  getModelWithFallback, 
  getNextFallbackProvider, 
  classifyError,
  hasFallbackAvailable,
  FallbackResult 
} from "@/lib/providers/fallback-chain";
import { 
  formatErrorForChat, 
  getSimpleErrorMessage, 
  shouldShowRetry,
  getProviderErrorHint 
} from "@/lib/error-messages";
import { 
  executeWithRetry, 
  DEFAULT_RETRY_CONFIG, 
  RetryConfig 
} from "@/hooks/useErrorRecovery";
import { useChatState, getEffectiveProviderModelSync } from "@/hooks/useChatState";

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
    onError?: (error: unknown) => void;
    onComplete?: () => void;
    onFallback?: (from: ProviderId, to: ProviderId, reason: string) => void;
    /** Enable automatic fallback to other providers on error */
    enableFallback?: boolean;
    /** Enable automatic retry with exponential backoff */
    enableRetry?: boolean;
    /** Custom retry configuration */
    retryConfig?: Partial<RetryConfig>;
}

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
    /** Current effective provider */
    currentProvider: ProviderId;
    /** Current effective model */
    currentModel: string;
    /** Whether using a fallback provider */
    isUsingFallback: boolean;
    /** Retry the last failed message */
    retryLastMessage: () => Promise<void>;
    /** Whether retry is available */
    canRetry: boolean;
}

/**
 * Reusable chat hook with enhanced error handling, fallback, and state management.
 * 
 * Features:
 * - Unified state management via chatId
 * - Automatic provider fallback on errors
 * - Retry logic with exponential backoff
 * - Provider instance caching for performance
 * - User-friendly error messages
 */
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

    // Use unified state management if chatId is provided
    const chatState = useChatState(chatId || null);
    
    // Determine effective provider/model (prefer unified state, fallback to legacy props)
    const effectiveProviderId = chatId 
        ? chatState.provider 
        : (legacyProviderId || "apple");
    const effectiveModelId = chatId 
        ? chatState.model 
        : (legacyModelId || "system-default");

    const [text, setText] = useState<string>(initialText);
    const [messages, setMessages] = useState<ModelMessage[]>(initialMessages);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [title, setTitle] = useState<string>("Chat");
    
    // Track current provider/model being used (may differ from selected if fallback is active)
    const [activeProvider, setActiveProvider] = useState<ProviderId>(effectiveProviderId);
    const [activeModel, setActiveModel] = useState<string>(effectiveModelId);
    const [isUsingFallback, setIsUsingFallback] = useState<boolean>(false);
    
    // Track failed providers for fallback chain
    const failedProvidersRef = useRef<ProviderId[]>([]);
    
    // Track last user message for retry
    const lastUserMessageRef = useRef<string | null>(null);
    const [canRetry, setCanRetry] = useState<boolean>(false);

    const canceledRef = useRef<boolean>(false);

    // Merged retry config
    const mergedRetryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    // Sync active provider/model when effective values change
    useEffect(() => {
        if (!isStreaming) {
            setActiveProvider(effectiveProviderId);
            setActiveModel(effectiveModelId);
            setIsUsingFallback(false);
            failedProvidersRef.current = [];
        }
    }, [effectiveProviderId, effectiveModelId, isStreaming]);

    /**
     * Get the model with caching and fallback support
     */
    const getModel = useCallback((): FallbackResult => {
        if (providedModel) {
            return {
                model: providedModel as LanguageModel,
                provider: activeProvider,
                modelId: activeModel,
                isOriginal: true,
                attemptedProviders: [],
            };
        }

        // Use cached model if available
        const cachedModel = getCachedModel(
            activeProvider,
            activeModel,
            () => getProviderModel(activeProvider, activeModel).model
        );

        if (cachedModel) {
            return {
                model: cachedModel,
                provider: activeProvider,
                modelId: activeModel,
                isOriginal: !isUsingFallback,
                attemptedProviders: failedProvidersRef.current,
            };
        }

        // Try with fallback if enabled
        if (enableFallback) {
            return getModelWithFallback(
                activeProvider,
                activeModel,
                failedProvidersRef.current
            );
        }

        // No fallback - just try to get the model
        const result = getProviderModel(activeProvider, activeModel);
        return {
            model: result.model,
            provider: activeProvider,
            modelId: activeModel,
            isOriginal: true,
            attemptedProviders: [activeProvider],
            error: result.error,
        };
    }, [providedModel, activeProvider, activeModel, isUsingFallback, enableFallback]);

    const model: LanguageModel | null = useMemo(() => {
        const result = getModel();
        
        // Update state if fallback was used
        if (result.model && !result.isOriginal && result.provider !== activeProvider) {
            // Use setTimeout to avoid state update during render
            setTimeout(() => {
                setActiveProvider(result.provider);
                setActiveModel(result.modelId);
                setIsUsingFallback(true);
                if (result.fallbackReason) {
                    onFallback?.(effectiveProviderId, result.provider, result.fallbackReason);
                }
            }, 0);
        }
        
        return result.model;
    }, [getModel, activeProvider, effectiveProviderId, onFallback]);

    const modelForTitle = model;

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
    }, [effectiveProviderId, effectiveModelId]);

    const cancel = useCallback(() => {
        canceledRef.current = true;
    }, []);

    const generateTitle = useCallback(async (): Promise<string> => {
        if (messages.length === 0) return "";
        if (!modelForTitle) {
            console.log("No model for title, returning empty string");
            return "";
        }

        try {
            const titleOperation = async () => {
                const result = await generateText({
                    model: modelForTitle,
                    prompt: `Generate a 2-4 word title for this conversation based on the messages. Return only the title, nothing else.\n\nMessages:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
                });
                return result.text.trim();
            };

            // Use retry logic for title generation
            if (enableRetry) {
                const retryResult = await executeWithRetry(
                    titleOperation,
                    { ...mergedRetryConfig, maxRetries: 2 } // Fewer retries for title
                );
                
                if (retryResult.success && retryResult.data) {
                    setTitle(retryResult.data);
                    return retryResult.data;
                }
                return "";
            } else {
                const generatedTitle = await titleOperation();
                if (generatedTitle) {
                    setTitle(generatedTitle);
                }
                return generatedTitle;
            }
        } catch (error) {
            console.error("Error generating title:", getSimpleErrorMessage(error));
            return "";
        }
    }, [messages, modelForTitle, enableRetry, mergedRetryConfig]);

    /**
     * Handle streaming error with fallback logic
     */
    const handleStreamingError = useCallback(async (
        error: unknown,
        assistantIndex: number,
        userMessage: string
    ): Promise<boolean> => {
        const classification = classifyError(error);
        
        console.error("Streaming error:", {
            category: classification.category,
            isRetryable: classification.isRetryable,
            shouldFallback: classification.shouldFallback,
            message: classification.message,
        });

        // Check if we should try a fallback provider
        if (enableFallback && classification.shouldFallback) {
            failedProvidersRef.current.push(activeProvider);
            
            const nextProvider = getNextFallbackProvider(
                activeProvider,
                failedProvidersRef.current,
                error
            );

            if (nextProvider) {
                console.log(`Falling back from ${activeProvider} to ${nextProvider.provider}`);
                
                // Update to fallback provider
                setActiveProvider(nextProvider.provider);
                setActiveModel(nextProvider.model);
                setIsUsingFallback(true);
                
                onFallback?.(
                    activeProvider, 
                    nextProvider.provider, 
                    classification.message
                );

                // Return true to indicate retry with fallback
                return true;
            }
        }

        // No fallback available - show error message
        const errorMessage = formatErrorForChat(error, activeProvider);
        const providerHint = getProviderErrorHint(error, activeProvider);
        
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

        // Enable retry if the error is retryable
        if (shouldShowRetry(error)) {
            lastUserMessageRef.current = userMessage;
            setCanRetry(true);
        }

        onError?.(error);
        return false;
    }, [activeProvider, enableFallback, onError, onFallback]);

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

            // Get current model (may trigger fallback)
            const currentModel = getModel();
            
            if (!currentModel.model) {
                const errorMessage = currentModel.error || 
                    "No AI provider configured. Please set up a provider in settings.";
                
                setMessages((prev) => {
                    const next = [...prev];
                    next[assistantIndex] = {
                        role: "assistant",
                        content: `**Setup Required**\n\n${errorMessage}\n\n*Go to Settings to configure an AI provider.*`,
                    };
                    return next;
                });
                
                onError?.(new Error(errorMessage));
                setIsStreaming(false);
                onComplete?.();
                return;
            }

            // Update active provider if fallback was used
            if (!currentModel.isOriginal) {
                setActiveProvider(currentModel.provider);
                setActiveModel(currentModel.modelId);
                setIsUsingFallback(true);
                
                if (currentModel.fallbackReason) {
                    onFallback?.(effectiveProviderId, currentModel.provider, currentModel.fallbackReason);
                }
            }

            let accumulated = "";
            let shouldRetryWithFallback = false;

            const streamOperation = async () => {
                const result = streamText({
                    model: currentModel.model!,
                    messages: updatedMessages,
                });

                for await (const chunk of result.textStream) {
                    if (canceledRef.current) break;

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
                        mergedRetryConfig,
                        (attemptNumber, delay, error) => {
                            console.log(`Retry attempt ${attemptNumber} in ${delay}ms:`, error.message);
                        }
                    );

                    if (!retryResult.success && retryResult.error) {
                        shouldRetryWithFallback = await handleStreamingError(
                            new Error(retryResult.error.message),
                            assistantIndex,
                            content
                        );
                    }
                } else {
                    await streamOperation();
                }
            } catch (err) {
                shouldRetryWithFallback = await handleStreamingError(
                    err,
                    assistantIndex,
                    content
                );
            }

            // If fallback was triggered, retry with new provider
            if (shouldRetryWithFallback && !canceledRef.current) {
                // Remove the error message and retry
                setMessages(updatedMessages);
                setIsStreaming(false);
                
                // Small delay before retry
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Retry with new provider
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
            getModel, 
            enableRetry, 
            mergedRetryConfig,
            handleStreamingError, 
            onChunk, 
            onComplete, 
            onError, 
            onFallback,
            effectiveProviderId
        ],
    );

    /**
     * Retry the last failed message
     */
    const retryLastMessage = useCallback(async () => {
        if (!lastUserMessageRef.current || !canRetry) return;
        
        // Remove the last assistant message (error message)
        setMessages((prev) => {
            if (prev.length >= 2 && prev[prev.length - 1].role === "assistant") {
                return prev.slice(0, -1);
            }
            return prev;
        });

        // Also remove the last user message as sendMessage will add it again
        setMessages((prev) => {
            if (prev.length >= 1 && prev[prev.length - 1].role === "user") {
                return prev.slice(0, -1);
            }
            return prev;
        });

        setCanRetry(false);
        
        // Retry with the last user message
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
