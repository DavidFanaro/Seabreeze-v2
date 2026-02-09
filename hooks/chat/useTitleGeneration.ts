/**
 * @file useTitleGeneration.ts
 * @purpose Auto-generate chat titles from conversation messages using AI models
 * @connects-to useChat, generateText from ai package, useErrorRecovery for retry logic
 * 
 * Overview:
 * This hook provides intelligent title generation for chat conversations by analyzing
 * the conversation context and generating concise 2-4 word titles. It integrates with
 * various AI models through the 'ai' package and includes robust error handling with
 * configurable retry mechanisms.
 * 
 * Key Features:
 * - Automatic title generation from message history
 * - Configurable retry logic for failed requests
 * - Support for multiple AI language models
 * - Graceful fallback when generation fails
 * - Memory-efficient with useCallback and useMemo optimizations
 * 
 * Usage Context:
 * Called from chat components when new conversations are created or when the user
 * wants to regenerate a chat title. The hook manages the title state internally
 * and exposes methods for manual control.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateText, type LanguageModel } from "ai";
import { 
    executeWithRetry, 
    DEFAULT_RETRY_CONFIG, 
    type RetryConfig 
} from "@/hooks/useErrorRecovery";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat-title";
import {
    failPersistenceOperation,
    startPersistenceOperation,
    succeedPersistenceOperation,
} from "@/lib/persistence-telemetry";

/**
 * Hook for generating chat titles from conversation messages
 * 
 * @param messages - Array of chat messages with role and content
 * @param model - AI language model to use for title generation
 * @param enableRetry - Whether to enable retry logic for failed requests
 * @param retryConfig - Custom retry configuration to override defaults
 * @returns Object containing title state and control methods
 */
export function useTitleGeneration(
    messages: { role: string; content: string }[],
    model: LanguageModel | null,
    enableRetry: boolean = true,
    retryConfig: Partial<RetryConfig> = {}
) {
    // ===== STATE MANAGEMENT =====
    /**
     * Current chat title state
     * Initialized to "Chat" as default fallback
     * Updated when title generation succeeds or when manually set
     */
    const [title, setTitleState] = useState<string>(DEFAULT_CHAT_TITLE);
    const titleRef = useRef(title);
    const titleVersionRef = useRef(0);

    useEffect(() => {
        titleRef.current = title;
    }, [title]);

    const setTitle = useCallback((nextTitle: string) => {
        const operation = startPersistenceOperation("manual_rename", {
            titleLength: nextTitle.trim().length,
            wasDefaultTitle: titleRef.current === DEFAULT_CHAT_TITLE,
        });

        try {
            titleVersionRef.current += 1;
            setTitleState(nextTitle);
            succeedPersistenceOperation(operation, {
                titleLength: nextTitle.trim().length,
            });
        } catch (error) {
            failPersistenceOperation(operation, error, {
                titleLength: nextTitle.trim().length,
            });
            throw error;
        }
    }, []);

    // ===== CONFIGURATION =====
    /**
     * Merged retry configuration that combines defaults with user overrides
     * Uses useMemo to prevent unnecessary recalculations when retryConfig changes
     */
    const mergedRetryConfig: RetryConfig = useMemo(() => ({ 
        ...DEFAULT_RETRY_CONFIG, 
        ...retryConfig 
    }), [retryConfig]);

    // ===== CORE FUNCTIONALITY =====
    /**
     * Generates a title for the current conversation
     * 
     * Process Flow:
     * 1. Validation: Check if messages exist and model is available
     * 2. Title Generation: Create prompt and call AI model
     * 3. Error Handling: Apply retry logic if enabled, handle failures gracefully
     * 4. State Update: Set title state on successful generation
     * 
     * Features:
     * - Exponential backoff retry for network failures
     * - Error classification for intelligent retry decisions
     * - Fallback to empty string on complete failure
     * - Trimming and validation of generated titles
     * 
     * @returns Promise<string> - Generated title or empty string on failure
     */
    const generateTitle = useCallback(async (): Promise<string> => {
        const generationVersion = titleVersionRef.current;

        // Guard clause: No messages to analyze
        if (messages.length === 0) return "";
        
        // Guard clause: No AI model available
        if (!model) {
            return "";
        }

        const operation = startPersistenceOperation("title_generation", {
            messageCount: messages.length,
        });

        try {
            // Core title generation operation
            const titleOperation = async () => {
                // Construct prompt with conversation context
                const result = await generateText({
                    model: model,
                    prompt: `Generate a 2-4 word title for this conversation based on messages. Return only the title, nothing else.\n\nMessages:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
                });
                
                // Clean up generated text by trimming whitespace
                return result.text.trim();
            };

            // Enhanced path: Use retry logic for resilience
            if (enableRetry) {
                const retryResult = await executeWithRetry(
                    titleOperation,
                    { ...mergedRetryConfig, maxRetries: 2 }
                );
                
                // Success case: Update state and return title
                if (retryResult.success && retryResult.data) {
                    if (titleVersionRef.current === generationVersion && titleRef.current === DEFAULT_CHAT_TITLE) {
                        titleVersionRef.current += 1;
                        setTitleState(retryResult.data);
                    }
                    succeedPersistenceOperation(operation, {
                        generatedTitleLength: retryResult.data.length,
                    });
                    return retryResult.data;
                }

                failPersistenceOperation(operation, retryResult.error ?? new Error("Title generation failed"), {
                    attempts: retryResult.attempts,
                });
                
                // Failure case: Return empty string to signal failure
                return "";
            } else {
                // Simple path: Direct execution without retry
                const generatedTitle = await titleOperation();
                if (generatedTitle) {
                    if (titleVersionRef.current === generationVersion && titleRef.current === DEFAULT_CHAT_TITLE) {
                        titleVersionRef.current += 1;
                        setTitleState(generatedTitle);
                    }
                    succeedPersistenceOperation(operation, {
                        generatedTitleLength: generatedTitle.length,
                    });
                } else {
                    failPersistenceOperation(operation, new Error("Empty title generated"));
                }
                return generatedTitle;
            }
        } catch (error) {
            failPersistenceOperation(operation, error);
            // Catch-all error handler
            // In production, this could be enhanced with specific error logging
            return "";
        }
    }, [messages, model, enableRetry, mergedRetryConfig]);

    // ===== UTILITY FUNCTIONS =====
    /**
     * Resets the title to default "Chat" value
     * Useful when clearing conversation or starting new chat
     * Wrapped in useCallback for performance optimization
     */
    const resetTitle = useCallback(() => {
        setTitle(DEFAULT_CHAT_TITLE);
    }, [setTitle]);

    // ===== PUBLIC API =====
    /**
     * Returns the hook's public interface
     * Includes both state values and control methods
     */
    return {
        // State
        title,        // Current generated title
        setTitle,     // Manual title setter override
        
        // Actions
        generateTitle,    // Trigger title generation
        resetTitle,       // Reset to default title
    };
}
