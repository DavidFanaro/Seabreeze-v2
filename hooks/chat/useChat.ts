/**
 * @file useChat.ts
 * @purpose Main chat orchestrator with comprehensive state management
 * @connects-to useChatStreaming, useTitleGeneration, useChatState
 * 
 * =============================================================================
 * COMPREHENSIVE HOOK OVERVIEW
 * =============================================================================
 * 
 * useChat is the central hook that manages all chat functionality in the seabreeze
 * application. It orchestrates message handling, streaming responses, provider
 * management, fallback mechanisms, title generation, and error recovery.
 * 
 * KEY RESPONSIBILITIES:
 * ────────────────────────────────────────────────────────────────────────
 * • Message state management (input text, message history)
 * • Streaming response handling with real-time updates
 * • AI provider and model management with fallback support
 * • Error handling with automatic retry mechanisms
 * • Chat title generation based on conversation content
 * • Persistent chat state across app sessions
 * 
 * ARCHITECTURAL PATTERNS:
 * ────────────────────────────────────────────────────────────────────────
 * • Composition over inheritance - combines specialized hooks
 * • Unidirectional data flow - state flows down, actions flow up
 * • Immutable state updates - ensures React re-renders correctly
 * • Referential stability - uses useCallback/useMemo for performance
 * 
 * PROVIDER ECOSYSTEM:
 * ────────────────────────────────────────────────────────────────────────
 * Supports Apple Intelligence, OpenAI, OpenRouter, and Ollama providers with:
 * • Automatic fallback on failures
 * • Model caching for performance
 * • Per-chat provider overrides
 * • Retry with exponential backoff
 * 
 * =============================================================================
 */

import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import type { LanguageModel, ModelMessage } from "ai";
import * as FileSystem from "expo-file-system/legacy";

import { type ProviderId, isVideoCapableModel } from "@/types/provider.types";
import { getProviderModel } from "@/providers/provider-factory";
import { getCachedModel } from "@/providers/provider-cache";
import { type FallbackResult } from "@/providers/fallback-chain";
import { executeWithRetry, DEFAULT_RETRY_CONFIG, type RetryConfig } from "@/hooks/useErrorRecovery";
import { useChatState } from "@/hooks/useChatState";
import { useTitleGeneration } from "./useTitleGeneration";
import { useChatStreaming, type StreamingResult } from "./useChatStreaming";
import { useStreamLifecycle } from "./useStreamLifecycle";
import type {
    ChatAttachment,
    ChatSendInput,
    ChatSendPayload,
    UseChatOptions,
    StreamState,
} from "@/types/chat.types";
import {
    createIdempotencyKey,
    createIdempotencyRegistry,
    createSequenceGuard,
} from "@/lib/concurrency";
import { isDataUri, isLocalAssetUri, isVideoMediaType } from "@/lib/chat-attachments";
import { normalizeMessageContentForRender } from "@/lib/chat-message-normalization";
import { getErrorFixes } from "@/lib/error-messages";
import {
    createErrorAnnotation,
    withErrorAnnotation,
} from "@/lib/chat-error-annotations";

type ChunkHandler = (chunk: string, accumulated: string) => void;

interface RetryableOperation {
    operationKey: string;
    payload: ChatSendPayload;
    messageSignature: string;
}

type UserMessage = Extract<ModelMessage, { role: "user" }>;
type UserMessageContent = UserMessage["content"];

const DEFAULT_PLACEHOLDER_TEXT = "...";

const normalizePossibleFixes = (fixes: string[]): string[] => {
    return fixes
        .map((fix) => fix.trim())
        .filter((fix) => fix.length > 0)
        .slice(0, 3);
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

const formatAnnotatedErrorContent = (
    title: string,
    errorMessage: string,
    fixes: string[],
): string => {
    const normalizedFixes = normalizePossibleFixes(fixes);
    const lines = [`**${title}**`, "", errorMessage.trim()];

    if (normalizedFixes.length > 0) {
        lines.push(
            "",
            "**Possible fixes:**",
            ...normalizedFixes.map((fix) => `- ${fix}`),
        );
    }

    return lines.join("\n");
};

interface ResolvedSendPayload {
    text: string;
    attachments: ChatAttachment[];
    usedOverrideText: boolean;
}

const serializeContentForSignature = (content: ModelMessage["content"]): string => {
    if (typeof content === "string") {
        return content;
    }

    try {
        return JSON.stringify(content);
    } catch {
        return String(content);
    }
};

const buildMessageSignature = (content: ModelMessage["content"]): string => {
    return createIdempotencyKey("chat-message-signature", [
        serializeContentForSignature(content),
    ]);
};

const isSameMessageContent = (
    left: ModelMessage["content"],
    right: ModelMessage["content"],
): boolean => {
    return buildMessageSignature(left) === buildMessageSignature(right);
};

const normalizeAttachments = (attachments: ChatSendPayload["attachments"]): ChatAttachment[] => {
    if (!Array.isArray(attachments)) {
        return [];
    }

    return attachments.filter((attachment) => (
        typeof attachment?.uri === "string"
        && attachment.uri.length > 0
        && typeof attachment.mediaType === "string"
        && attachment.mediaType.length > 0
    ));
};

const resolveSendPayload = (
    input: ChatSendInput | undefined,
    currentText: string,
): ResolvedSendPayload => {
    if (typeof input === "string") {
        return {
            text: input.trim(),
            attachments: [],
            usedOverrideText: true,
        };
    }

    if (input && typeof input === "object") {
        const rawText = typeof input.text === "string" ? input.text : currentText;
        return {
            text: rawText.trim(),
            attachments: normalizeAttachments(input.attachments),
            usedOverrideText: false,
        };
    }

    return {
        text: currentText.trim(),
        attachments: [],
        usedOverrideText: false,
    };
};

const createUserMessageContent = (
    payload: Pick<ResolvedSendPayload, "text" | "attachments">,
): UserMessageContent => {
    if (payload.attachments.length === 0) {
        return payload.text;
    }

    const parts: Array<Record<string, unknown>> = [];

    if (payload.text.length > 0) {
        parts.push({
            type: "text",
            text: payload.text,
        });
    }

    payload.attachments.forEach((attachment) => {
        if (attachment.kind === "image") {
            parts.push({
                type: "image",
                image: attachment.uri,
                mediaType: attachment.mediaType,
            });
            return;
        }

        parts.push({
            type: "file",
            data: attachment.uri,
            mediaType: attachment.mediaType,
            filename: attachment.fileName,
        });
    });

    return parts as unknown as UserMessageContent;
};

const hasSendableContent = (
    payload: Pick<ResolvedSendPayload, "text" | "attachments">,
): boolean => {
    return payload.text.length > 0 || payload.attachments.length > 0;
};

const hasVideoAttachment = (attachments: ChatAttachment[]): boolean => {
    return attachments.some((attachment) => (
        attachment.kind === "video"
        || isVideoMediaType(attachment.mediaType)
    ));
};

const contentHasVideoPart = (content: ModelMessage["content"]): boolean => {
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

const conversationHasVideoContent = (messages: ModelMessage[]): boolean => {
    return messages.some((message) => (
        message.role === "user" && contentHasVideoPart(message.content)
    ));
};

const stripDataUriPrefix = (value: string): string => {
    const marker = ";base64,";
    const markerIndex = value.indexOf(marker);

    if (markerIndex === -1) {
        return value;
    }

    return value.slice(markerIndex + marker.length);
};

const messageNeedsPreparation = (message: ModelMessage): boolean => {
    if (message.role !== "user" || !Array.isArray(message.content)) {
        return false;
    }

    return message.content.some((part) => {
        if (!part || typeof part !== "object") {
            return false;
        }

        const partRecord = part as unknown as Record<string, unknown>;

        if (partRecord.type === "image" && typeof partRecord.image === "string") {
            return isDataUri(partRecord.image) || isLocalAssetUri(partRecord.image);
        }

        if (partRecord.type === "file" && typeof partRecord.data === "string") {
            return isDataUri(partRecord.data) || isLocalAssetUri(partRecord.data);
        }

        return false;
    });
};

const needsProviderMessagePreparation = (messages: ModelMessage[]): boolean => {
    return messages.some(messageNeedsPreparation);
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
// 
// These types define the public interface of the useChat hook, ensuring type
// safety for all returned values and callbacks.

/**
 * Return type for the useChat hook
 * 
 * This interface defines all the values and functions that the hook exposes to
 * consuming components. Each property serves a specific purpose in the chat
 * interaction flow.
 */
export interface UseChatReturn {
    /** Current input text in the chat field */
    text: string;
    /** Function to update the input text */
    setText: (value: string) => void;
    /** Array of all messages in the conversation */
    messages: ModelMessage[];
    /** Function to update the messages array */
    setMessages: React.Dispatch<React.SetStateAction<ModelMessage[]>>;
    /** Array of reasoning output aligned with messages */
    thinkingOutput: string[];
    /** Function to update the thinking output array */
    setThinkingOutput: React.Dispatch<React.SetStateAction<string[]>>;
    /** Whether the AI is currently streaming reasoning text */
    isThinking: boolean;
    /** Whether the AI is currently streaming a response */
    isStreaming: boolean;
    /** Current stream state for lifecycle tracking */
    streamState: StreamState;
    /** Send a message to the AI (optionally with attachment payload) */
    sendMessage: (input?: ChatSendInput) => Promise<void>;
    /** Cancel the current streaming response */
    cancel: () => void;
    /** Reset all chat state to initial values */
    reset: () => void;
    /** Current chat title (generated from conversation) */
    title: string;
    /** Function to update the chat title */
    setTitle: (title: string) => void;
    /** Generate a new title based on conversation content */
    generateTitle: () => Promise<string>;
    /** Currently active AI provider */
    currentProvider: ProviderId;
    /** Currently active model within the provider */
    currentModel: string;
    /** Whether we're currently using a fallback provider */
    isUsingFallback: boolean;
    /** Retry the last failed message */
    retryLastMessage: () => Promise<void>;
    /** Whether retry is available for the last message */
    canRetry: boolean;
    /** Error message for display when stream fails */
    errorMessage: string | null;
}

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

/**
 * Main useChat hook - orchestrates all chat functionality
 * 
 * This hook serves as the central hub for chat operations, combining message
 * management, AI provider handling, streaming responses, and error recovery into
 * a cohesive interface.
 * 
 * @param options - Configuration options for the chat instance
 * @returns Complete chat interface with state and actions
 */
export default function useChat(options: UseChatOptions = {}): UseChatReturn {
    // =============================================================================
    // OPTIONS DESTRUCTURING AND DEFAULTS
    // =============================================================================
    // 
    // Extract all options with sensible defaults. The hook is designed to work
    // out-of-the-box with minimal configuration while allowing deep customization.
    
    const {
        initialMessages = [],              // Start with empty message history
        initialText = "",                  // Start with empty input field
        placeholder = true,                // Enable placeholder for AI responses
        providerId: legacyProviderId,      // Deprecated: use chatId instead
        modelId: legacyModelId,           // Deprecated: use chatId instead
        chatId,                           // Modern unified state management
        model: providedModel,             // Direct model injection (testing)
        onChunk,                          // Callback for streaming chunks
        onThinkingChunk,                  // Callback for streaming thinking chunks
        enableThinking = true,            // Enable thinking output updates
        thinkingLevel,                    // Control reasoning effort when supported
        onError,                          // Error handling callback
        onComplete,                       // Completion callback
        onFallback,                       // Provider fallback notification
        enableFallback = true,            // Enable automatic fallback
        enableRetry = true,               // Enable automatic retry
        retryConfig = {},                 // Custom retry configuration
    } = options;

    // =============================================================================
    // CHAT STATE MANAGEMENT
    // =============================================================================
    // 
    // Initialize chat state management. This handles both the new unified approach
    // (using chatId) and legacy providerId/modelId for backward compatibility.
    
    const chatState = useChatState(chatId || null);
    
    // Resolve effective provider/model based on whether we're using unified state
    // or legacy direct provider specification
    const effectiveProviderId = chatId 
        ? chatState.provider                    // Use unified chat state
        : (legacyProviderId || "ollama");      // Fallback to legacy or default
    const effectiveModelId = chatId 
        ? chatState.model                       // Use unified chat state
        : (legacyModelId || "gpt-oss:latest"); // Fallback to legacy or default

    // =============================================================================
    // CORE REACT STATE
    // =============================================================================
    // 
    // These are the fundamental React state variables that drive the chat interface.
    // Each piece of state has a specific responsibility in the chat flow.
    
    const [text, setText] = useState<string>(initialText);           // Input field content
    const [messages, setMessages] = useState<ModelMessage[]>(initialMessages); // Message history
    const [thinkingOutput, setThinkingOutput] = useState<string[]>(
        () => initialMessages.map(() => "")
    );
    const [isThinking, setIsThinking] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);  // Streaming status
    
    // =============================================================================
    // PROVIDER AND FALLBACK STATE
    // =============================================================================
    // 
    // These state variables manage the AI provider ecosystem, including fallback
    // handling and provider switching during failures.
    
    const [activeProvider, setActiveProvider] = useState<ProviderId>(effectiveProviderId);
    const [activeModel, setActiveModel] = useState<string>(effectiveModelId);
    const [isUsingFallback, setIsUsingFallback] = useState<boolean>(false);
    
    // =============================================================================
    // REFERENCES FOR STABLE OPERATIONS
    // =============================================================================
    // 
    // useRef values that persist across re-renders without triggering them.
    // These are used for tracking operation state and maintaining data integrity.
    
    const failedProvidersRef = useRef<ProviderId[]>([]);     // Track failed providers for fallback
    
    // Retry and cancellation tracking
    const lastUserMessageRef = useRef<ChatSendPayload | null>(null); // Store last user message for retry
    const [canRetry, setCanRetry] = useState<boolean>(false); // Whether retry is available
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // Error message for display
    const canceledRef = useRef<boolean>(false);             // Track if streaming was canceled
    const messagesRef = useRef<ModelMessage[]>(initialMessages);
    const attachmentDataCacheRef = useRef<Map<string, string>>(new Map());
    const sendSequenceGuardRef = useRef(createSequenceGuard(`chat-send-${chatId ?? "default"}`));
    const retryOperationRegistryRef = useRef(createIdempotencyRegistry<void>());
    const lastRetryableOperationRef = useRef<RetryableOperation | null>(null);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // =============================================================================
    // CONFIGURATION MERGING
    // =============================================================================
    // 
    // Merge user-provided retry configuration with system defaults to create
    // the final configuration used throughout the hook.
    
    const mergedRetryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    const placeholderText = placeholder ? DEFAULT_PLACEHOLDER_TEXT : "";

        // =============================================================================
    // MODEL RESOLUTION AND CACHING
    // =============================================================================
    // 
    // Resolve the actual AI model to use for chat operations. This involves:
    // 1. Using directly provided model (for testing/special cases)
    // 2. Looking up cached model for performance
    // 3. Creating new model instance if needed
    // 
    // The useMemo ensures we only recompute when provider/model actually changes.
    
    const model: LanguageModel | null = useMemo(() => {
        // Direct model injection takes precedence (useful for testing)
        if (providedModel) {
            return providedModel as LanguageModel;
        }

        // Try to get cached model for performance
        const cachedModel = getCachedModel(
            activeProvider,
            activeModel,
            () => getProviderModel(activeProvider, activeModel).model
        );

        return cachedModel || null;
    }, [providedModel, activeProvider, activeModel]);

    const resolveModelForSelection = useCallback((providerId: ProviderId, modelId: string): LanguageModel | null => {
        if (providedModel) {
            return providedModel as LanguageModel;
        }

        const resolvedModel = getCachedModel(
            providerId,
            modelId,
            () => getProviderModel(providerId, modelId).model
        );

        return resolvedModel || null;
    }, [providedModel]);

    // =============================================================================
    // TITLE GENERATION INTEGRATION
    // =============================================================================
    // 
    // Connect to the title generation subsystem. Titles are automatically
    // generated based on conversation content and used for chat identification
    // in the UI and database storage.
    
    const { title, setTitle, generateTitle } = useTitleGeneration(
        messages.map(m => ({
            role: m.role,
            content: normalizeMessageContentForRender(m.content),
        })),
        model,
        enableRetry,
        mergedRetryConfig
    );

    // =============================================================================
    // STREAMING INFRASTRUCTURE
    // =============================================================================
    // 
    // Connect to the streaming subsystem that handles real-time AI responses.
    // This provides the core functionality for streaming text from AI providers.
    
    const { executeStreaming } = useChatStreaming();

    // =============================================================================
    // STREAM LIFECYCLE MANAGEMENT
    // =============================================================================
    // 
    // Manages stream state transitions, timeout detection, and cleanup.
    // Ensures streams always complete fully and handles edge cases like
    // app backgrounding and navigation away.
    
    const {
        streamState,
        isStreaming: isStreamLifecycleStreaming,
        abortController,
        initializeStream,
        markChunkReceived,
        markDoneSignalReceived,
        markCompleting,
        markCompleted,
        markError,
        cancelStream,
    } = useStreamLifecycle({
        timeoutMs: 30000, // 30 second inactivity timeout
        backgroundBehavior: "cancel",
        enableLogging: __DEV__,
        onError: (error) => {
            console.error("[StreamLifecycle] Error:", error.message);

            // Propagate lifecycle errors (inactivity timeout, max duration) to
            // UI state so the retry button is shown.
            // No isStreaming guard needed: initializeStream() clears old timers
            // before each send, so lifecycle errors only fire for the current
            // active stream.  Using isStreaming here would be stale-closure-prone
            // because the callback is captured before the React state flush.
            setErrorMessage(error.message);
            setCanRetry(true);
            if (lastUserMessageRef.current) {
                const messageContent = createUserMessageContent({
                    text: lastUserMessageRef.current.text ?? "",
                    attachments: normalizeAttachments(lastUserMessageRef.current.attachments),
                });
                lastRetryableOperationRef.current = {
                    operationKey: createIdempotencyKey("lifecycle-error", [chatId ?? "default"]),
                    payload: lastUserMessageRef.current,
                    messageSignature: buildMessageSignature(messageContent),
                };
            }

            onError?.(error);
        },
    });

    useEffect(() => {
        const isTerminalOrIdleState =
            streamState === "idle"
            || streamState === "completed"
            || streamState === "error"
            || streamState === "cancelled";

        if (!isTerminalOrIdleState) {
            return;
        }

        if (isStreaming || isThinking) {
            setIsStreaming(false);
            setIsThinking(false);
        }
    }, [isStreaming, isThinking, streamState]);

        // =============================================================================
    // PROVIDER RESET EFFECT
    // =============================================================================
    // 
    // This effect ensures that when streaming completes (either successfully or
    // with failure), we reset the provider state to the originally intended
    // provider/model. This prevents fallback state from persisting between
    // messages.
    
    useEffect(() => {
        // Only reset when not actively streaming to avoid race conditions
        if (!isStreaming) {
            setActiveProvider(effectiveProviderId);
            setActiveModel(effectiveModelId);
            setIsUsingFallback(false);
            failedProvidersRef.current = [];
        }
    }, [effectiveProviderId, effectiveModelId, isStreaming]);

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    // 
    // Core utility functions that control chat state and flow. These are
    // memoized with useCallback to maintain referential stability and prevent
    // unnecessary re-renders in child components.

    /**
     * Reset all chat state to initial values
     * 
     * This function completely clears the chat history, resets the input field,
     * restores the original title, and resets all provider and fallback state.
     * It's typically used when starting a new chat conversation.
     */
    const reset = useCallback(() => {
        setText("");                              // Clear input field
        setMessages([]);                          // Clear message history
        setThinkingOutput([]);                    // Clear reasoning output
        setIsThinking(false);                     // Clear thinking state
        setTitle("Chat");                         // Reset to default title
        setActiveProvider(effectiveProviderId);   // Reset to intended provider
        setActiveModel(effectiveModelId);        // Reset to intended model
        setIsUsingFallback(false);                // Clear fallback state
        failedProvidersRef.current = [];         // Clear failed providers list
        lastUserMessageRef.current = null;       // Clear retry message
        attachmentDataCacheRef.current.clear();
        setCanRetry(false);                      // Disable retry capability
        setErrorMessage(null);                   // Clear error message
        lastRetryableOperationRef.current = null;
        retryOperationRegistryRef.current.clear();
    }, [effectiveProviderId, effectiveModelId, setTitle]);

    /**
     * Cancel the current streaming operation
     *
     * Sets a flag that the streaming loop checks to determine if it should
     * stop processing chunks. This provides a clean way to interrupt AI responses.
     */
    const cancel = useCallback(() => {
        canceledRef.current = true;
        sendSequenceGuardRef.current.next();
        setIsStreaming(false);
        setIsThinking(false);
        cancelStream(); // Use stream lifecycle cancel for comprehensive cancellation
    }, [cancelStream]);

    const prepareMessagesForProvider = useCallback(async (
        sourceMessages: ModelMessage[],
    ): Promise<ModelMessage[]> => {
        const readAttachmentAsBase64 = async (uri: string): Promise<string> => {
            const cached = attachmentDataCacheRef.current.get(uri);
            if (cached) {
                return cached;
            }

            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            attachmentDataCacheRef.current.set(uri, base64);
            return base64;
        };

        const preparePart = async (part: unknown): Promise<unknown> => {
            if (!part || typeof part !== "object") {
                return part;
            }

            const partRecord = part as Record<string, unknown>;

            if (partRecord.type === "image" && typeof partRecord.image === "string") {
                if (isDataUri(partRecord.image)) {
                    return {
                        ...partRecord,
                        image: stripDataUriPrefix(partRecord.image),
                    };
                }

                if (isLocalAssetUri(partRecord.image)) {
                    return {
                        ...partRecord,
                        image: await readAttachmentAsBase64(partRecord.image),
                    };
                }
            }

            if (partRecord.type === "file" && typeof partRecord.data === "string") {
                if (isDataUri(partRecord.data)) {
                    return {
                        ...partRecord,
                        data: stripDataUriPrefix(partRecord.data),
                    };
                }

                if (isLocalAssetUri(partRecord.data)) {
                    return {
                        ...partRecord,
                        data: await readAttachmentAsBase64(partRecord.data),
                    };
                }
            }

            return part;
        };

        return Promise.all(sourceMessages.map(async (message): Promise<ModelMessage> => {
            if (message.role !== "user" || !Array.isArray(message.content)) {
                return message;
            }

            const preparedContent = await Promise.all(message.content.map(preparePart));
            return {
                ...message,
                content: preparedContent as unknown as UserMessageContent,
            };
        }));
    }, []);

        // =============================================================================
    // CORE MESSAGE SENDING LOGIC
    // =============================================================================
    // 
    // This is the heart of the chat functionality. The sendMessage function:
    // 1. Validates and prepares the user message
    // 2. Updates the message history
    // 3. Initiates streaming with the AI provider
    // 4. Handles fallback and retry logic
    // 5. Manages the complete message flow lifecycle

    /**
     * Send a message to the AI and initiate streaming response
     * 
     * @param overrideText - Optional text to send instead of current input
     * 
     * This function orchestrates the complete message sending flow:
     * 1. Input validation and preprocessing
     * 2. Message history updates
     * 3. AI provider streaming initiation
     * 4. Error handling with fallback mechanisms
     * 5. Completion callbacks
     */
    const sendMessage = useCallback(
        async (input?: ChatSendInput) => {
            // ────────────────────────────────────────────────────────────────
            // INPUT VALIDATION AND PREPARATION
            // ────────────────────────────────────────────────────────────────
            const resolvedPayload = resolveSendPayload(input, text);
            
            // Exit early if no valid content to send
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

            // ────────────────────────────────────────────────────────────────
            // STATE INITIALIZATION
            // ────────────────────────────────────────────────────────────────
            setIsStreaming(true);                    // Start streaming state
            setIsThinking(false);                    // Reset thinking state
            canceledRef.current = false;            // Clear cancellation flag
            setCanRetry(false);                     // Disable retry until needed
            lastRetryableOperationRef.current = null;
            const retryPayload: ChatSendPayload = {
                text: resolvedPayload.text,
                attachments: [...resolvedPayload.attachments],
            };
            lastUserMessageRef.current = retryPayload; // Store for retry capability
            
            // Initialize stream lifecycle management
            const streamController = initializeStream();
            const abortSignal = streamController.signal;
            const canMutateForCurrentSend = (): boolean => (
                sendSequenceGuardRef.current.isCurrent(sendToken)
                && !canceledRef.current
                && !abortSignal.aborted
            );

            // ────────────────────────────────────────────────────────────────
            // MESSAGE HISTORY MANAGEMENT
            // ────────────────────────────────────────────────────────────────
            const userMessage: ModelMessage = {
                role: "user",
                content: userMessageContent,
            };
            const updatedMessages = [...messagesRef.current, userMessage];
            setMessages(updatedMessages);
            setThinkingOutput((prev) => [...prev, ""]);

            // Clear input field if we're using the current text (not override)
            if (!resolvedPayload.usedOverrideText) {
                setText("");
            }

            // Add placeholder for assistant response
            const assistantIndex = updatedMessages.length;
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: placeholderText,
                },
            ]);
            setThinkingOutput((prev) => [...prev, ""]);

            let attemptProvider = activeProvider;
            let attemptModel = activeModel;
            let attemptResolvedModel = resolveModelForSelection(attemptProvider, attemptModel);
            let providerMessages = updatedMessages;

            try {
                if (needsProviderMessagePreparation(updatedMessages)) {
                    providerMessages = await prepareMessagesForProvider(updatedMessages);
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

            // ────────────────────────────────────────────────────────────────
            // MODEL VALIDATION
            // ────────────────────────────────────────────────────────────────
            if (!attemptResolvedModel) {
                // Show helpful error message when no provider is configured
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

            // ────────────────────────────────────────────────────────────────
            // STREAMING CONFIGURATION
            // ────────────────────────────────────────────────────────────────
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

            // ────────────────────────────────────────────────────────────────
            // STREAMING EXECUTION
            // ────────────────────────────────────────────────────────────────
            while (true) {
                const streamingOptions = {
                    model: {
                        model: attemptResolvedModel,
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
                        } else {
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
                        }
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

                // Timeout / stall detection is handled entirely by the
                // stream lifecycle hook (inactivity timeout + max duration).
                // When the lifecycle fires, it aborts the signal and
                // transitions to "error", which propagates to the UI via the
                // lifecycle onError callback above.
                const result: StreamingResult = await executeStreaming(
                    streamingOptions,
                    providerMessages,
                    setMessages,
                    assistantIndex,
                    failedProvidersRef
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

            // ────────────────────────────────────────────────────────────────
            // COMPLETION
            // ────────────────────────────────────────────────────────────────
            if (
                sendSequenceGuardRef.current.isCurrent(sendToken)
                && !canceledRef.current
                && !abortSignal.aborted
            ) {
                onComplete?.();
            }

            finalizeCurrentSendState();
        },
        [
            text, 
            placeholderText, 
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
            chatId,
            enableFallback,
            effectiveProviderId,
            initializeStream,
            markChunkReceived,
            markDoneSignalReceived,
            markCompleting,
            markCompleted,
            markError,
            enableThinking,
            thinkingLevel,
            onThinkingChunk,
            resolveModelForSelection,
            prepareMessagesForProvider,
        ],
    );

        // =============================================================================
    // RETRY FUNCTIONALITY
    // =============================================================================
    // 
    // Retry functionality allows users to resend their last message when the
    // AI response failed or was incomplete. This involves:
    // 1. Removing the failed assistant response
    // 2. Optionally removing the user message (if they want to edit)
    // 3. Resending the original message with fresh state

    /**
     * Retry the last failed message
     * 
     * This function enables users to retry their last message when the AI
     * response failed or was cut off. It cleans up the conversation history
     * and resends the original message with fresh streaming state.
     */
    const retryLastMessage = useCallback(async () => {
        const retryableOperation = lastRetryableOperationRef.current;

        // Guard against invalid retry attempts
        if (!lastUserMessageRef.current || !canRetry || !retryableOperation) return;

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

            // Reset retry state and clear error message
            setCanRetry(false);
            setErrorMessage(null);
            lastRetryableOperationRef.current = null;

            await sendMessage(retryableOperation.payload);
        });
    }, [canRetry, sendMessage]);

    // =============================================================================
    // PUBLIC INTERFACE
    // =============================================================================
    // 
    // Return the complete chat interface. All values are stable references
    // where appropriate to prevent unnecessary re-renders in consuming components.
    // The interface provides both state accessors and action functions.

    return {
        // ────────────────────────────────────────────────────────────────
        // CORE CHAT STATE
        // ────────────────────────────────────────────────────────────────
        text,                           // Current input text
        setText,                        // Update input text
        messages,                       // Message history
        setMessages,                    // Update message history
        thinkingOutput,                 // Reasoning output
        setThinkingOutput,              // Update reasoning output
        isThinking,                     // Thinking status
        isStreaming,                    // Streaming status
        streamState,                    // Stream lifecycle state (streaming | completing | completed | error)

        // ────────────────────────────────────────────────────────────────
        // ACTIONS
        // ────────────────────────────────────────────────────────────────
        sendMessage,                    // Send message
        cancel,                         // Cancel streaming
        reset,                          // Reset all state

        // ────────────────────────────────────────────────────────────────
        // TITLE MANAGEMENT
        // ────────────────────────────────────────────────────────────────
        title,                          // Current title
        setTitle,                       // Update title
        generateTitle,                  // Generate new title

        // ────────────────────────────────────────────────────────────────
        // PROVIDER STATE
        // ────────────────────────────────────────────────────────────────
        currentProvider: activeProvider, // Active AI provider
        currentModel: activeModel,      // Active model
        isUsingFallback,                // Fallback status

        // ────────────────────────────────────────────────────────────────
        // RETRY FUNCTIONALITY
        // ────────────────────────────────────────────────────────────────
        retryLastMessage,               // Retry last message
        canRetry,                       // Whether retry is available
        errorMessage,                   // Error message for display
    };
}

/*
 * =============================================================================
 * HOOK COMPREHENSIVE DOCUMENTATION
 * =============================================================================
 * 
 * ARCHITECTURAL SUMMARY:
 * ────────────────────────────────────────────────────────────────────────
 * useChat is a sophisticated hook that combines multiple concerns into a
 * cohesive chat interface. It follows the composition pattern, building upon
 * specialized hooks for different aspects of chat functionality.
 * 
 * KEY PRINCIPLES:
 * ────────────────────────────────────────────────────────────────────────
 * 1. Separation of Concerns: Different aspects (streaming, title generation,
 *    state management) are handled by dedicated hooks
 * 2. Referential Stability: useCallback and useMemo prevent unnecessary re-renders
 * 3. Unidirectional Data Flow: State flows down, actions flow up
 * 4. Error Resilience: Multiple layers of error handling and fallback
 * 5. Performance Optimization: Caching, memoization, and efficient updates
 * 
 * PROVIDER ECOSYSTEM INTEGRATION:
 * ────────────────────────────────────────────────────────────────────────
 * The hook integrates with a robust provider system that supports:
 * • Multiple AI providers (Apple, OpenAI, OpenRouter, Ollama)
 * • Automatic fallback on failures
 * • Model caching for performance
 * • Per-chat provider overrides
 * • Retry with exponential backoff
 * 
 * STATE MANAGEMENT STRATEGY:
 * ────────────────────────────────────────────────────────────────────────
 * • Local React state for immediate UI updates
 * • Zustand stores for persistent data
 * • Refs for operation tracking without re-renders
 * • Unified chat state system for consistency
 * 
 * ERROR HANDLING APPROACH:
 * ────────────────────────────────────────────────────────────────────────
 * • Graceful degradation when providers fail
 * • User-friendly error messages
 * • Automatic retry with configurable backoff
 * • Fallback chain through multiple providers
 * • Recovery mechanisms for common failure scenarios
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * ────────────────────────────────────────────────────────────────────────
 * • Model caching to avoid repeated initialization
 * • Memoized callbacks to prevent child re-renders
 * • Efficient state updates with minimal re-renders
 * • Lazy loading of provider resources
 * • Streaming to provide immediate feedback
 * 
 * =============================================================================
 */
