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

import { type ProviderId } from "@/types/provider.types";
import { getProviderModel } from "@/providers/provider-factory";
import { getCachedModel } from "@/providers/provider-cache";
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from "@/hooks/useErrorRecovery";
import { useChatState } from "@/hooks/useChatState";
import { useTitleGeneration } from "./useTitleGeneration";
import { useChatStreaming } from "./useChatStreaming";
import { useStreamLifecycle } from "./useStreamLifecycle";
import { useChatSendFlow } from "./useChatSendFlow";
import type {
    ChatActiveWebSearchState,
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
import { coerceMessageContentToString } from "@/lib/chat-message-normalization";
import { withWebSearchAnnotation } from "@/lib/chat-web-search-annotations";
import {
    buildMessageSignature,
    createUserMessageContent,
    normalizeAttachments,
    type RetryableOperation,
} from "./chatSendUtils";

const DEFAULT_PLACEHOLDER_TEXT = "...";

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
    /** Active or most recent web-search state for the currently streaming assistant turn */
    activeWebSearchState: ChatActiveWebSearchState | null;
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
        enableWebSearch = false,          // Enable app-wide web search tools
        searxngUrl = null,                // Configured SearXNG instance URL
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
    const [activeWebSearchState, setActiveWebSearchState] = useState<ChatActiveWebSearchState | null>(null);
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
            content: coerceMessageContentToString(m.content),
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
        setActiveWebSearchState(null);            // Clear live web search state
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

    const commitWebSearchAnnotation = useCallback((
        assistantIndex: number,
        annotation: ChatActiveWebSearchState["annotation"] | null,
    ) => {
        if (!annotation) {
            return;
        }

        setMessages((prev) => {
            if (assistantIndex < 0 || assistantIndex >= prev.length) {
                return prev;
            }

            const next = [...prev];
            next[assistantIndex] = withWebSearchAnnotation(next[assistantIndex], annotation);
            return next;
        });

        setActiveWebSearchState({
            messageIndex: assistantIndex,
            annotation,
        });
    }, []);

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

    const { sendMessage, retryLastMessage } = useChatSendFlow({
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
    });

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
        activeWebSearchState,           // Active or most recent web search state
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
