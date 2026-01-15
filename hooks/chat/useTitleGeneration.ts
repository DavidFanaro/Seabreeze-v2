/**
 * @file useTitleGeneration.ts
 * @purpose Auto-generate chat titles from conversation messages
 * @connects-to useChat, generateText from ai package
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateText, type LanguageModel } from "ai";
import { 
    executeWithRetry, 
    DEFAULT_RETRY_CONFIG, 
    type RetryConfig 
} from "@/hooks/useErrorRecovery";

/**
 * Hook for generating chat titles from conversation messages
 */
export function useTitleGeneration(
    messages: { role: string; content: string }[],
    model: LanguageModel | null,
    enableRetry: boolean = true,
    retryConfig: Partial<RetryConfig> = {}
) {
    const [title, setTitle] = useState<string>("Chat");

    const mergedRetryConfig: RetryConfig = useMemo(() => ({ 
        ...DEFAULT_RETRY_CONFIG, 
        ...retryConfig 
    }), [retryConfig]);

    const generateTitle = useCallback(async (): Promise<string> => {
        if (messages.length === 0) return "";
        if (!model) {
            return "";
        }

        try {
            const titleOperation = async () => {
                const result = await generateText({
                    model: model,
                    prompt: `Generate a 2-4 word title for this conversation based on messages. Return only the title, nothing else.\n\nMessages:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
                });
                return result.text.trim();
            };

            if (enableRetry) {
                const retryResult = await executeWithRetry(
                    titleOperation,
                    { ...mergedRetryConfig, maxRetries: 2 }
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
            return "";
        }
    }, [messages, model, enableRetry, mergedRetryConfig]);

    const resetTitle = useCallback(() => {
        setTitle("Chat");
    }, []);

    return {
        title,
        setTitle,
        generateTitle,
        resetTitle,
    };
}
