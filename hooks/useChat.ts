import { useCallback, useMemo, useRef, useState } from "react";
import { ModelMessage, streamText, generateText, type LanguageModel } from "ai";
import { apple } from "@react-native-ai/apple";

type ChunkHandler = (chunk: string, accumulated: string) => void;

export interface UseChatOptions {
    initialMessages?: ModelMessage[];
    initialText?: string;
    placeholder?: string;
    model?: LanguageModel; // If provided, will be used instead of apple()
    onChunk?: ChunkHandler;
    onError?: (error: unknown) => void;
    onComplete?: () => void;
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
}

/**
 * Reusable chat hook encapsulating message state and streaming send logic.
 * Mirrors the behavior in `app/index.tsx` while being reusable across screens/components.
 */
export default function useChat(options: UseChatOptions = {}): UseChatReturn {
    const {
        initialMessages = [],
        initialText = "",
        placeholder = "...",
        model: providedModel,
        onChunk,
        onError,
        onComplete,
    } = options;

    const [text, setText] = useState<string>(initialText);
    const [messages, setMessages] = useState<ModelMessage[]>(initialMessages);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [title, setTitle] = useState<string>("Chat");

    const canceledRef = useRef<boolean>(false);

    // Use provided model if available, otherwise default to Apple Intelligence
    const model: LanguageModel = useMemo(
        () => providedModel ?? apple(),
        [providedModel],
    );

    const reset = useCallback(() => {
        setText("");
        setMessages([]);
    }, []);

    const cancel = useCallback(() => {
        canceledRef.current = true;
    }, []);

    const generateTitle = useCallback(async (): Promise<string> => {
        if (messages.length === 0) return "";

        try {
            const result = await generateText({
                model: apple(),
                prompt: `Generate a 2-4 word title for this conversation based on the messages. Return only the title, nothing else.\n\nMessages:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
            });

            const generatedTitle = result.text.trim();
            console.log(generatedTitle);
            setTitle(generatedTitle);
            return generatedTitle;
        } catch (error) {
            console.error("Error generating title:", error);
            return "";
        }
    }, [messages]);

    const sendMessage = useCallback(
        async (overrideText?: string) => {
            const rawValue: unknown = overrideText ?? (text as unknown);
            const content = typeof rawValue === "string" ? rawValue.trim() : "";
            if (!content) return;

            setIsStreaming(true);
            canceledRef.current = false;

            // 1) Append user message
            const userMessage: ModelMessage = { role: "user", content };
            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);

            // Clear local composer if we used local `text`
            if (overrideText === undefined) {
                setText("");
            }

            // 2) Add assistant placeholder
            const assistantIndex = updatedMessages.length;
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: placeholder,
                },
            ]);

            // 3) Stream assistant response
            let accumulated = "";
            try {
                const result = streamText({
                    model,
                    messages: updatedMessages,
                });

                for await (const chunk of result.textStream) {
                    if (canceledRef.current) break;

                    accumulated += chunk;

                    // Update assistant message in-place (at assistantIndex)
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
            } catch (err) {
                const errorMessage = `Error: ${
                    err instanceof Error
                        ? err.message
                        : "Failed to generate response"
                }`;

                setMessages((prev) => {
                    const next = [...prev];
                    next[assistantIndex] = {
                        role: "assistant",
                        content: errorMessage,
                    };
                    return next;
                });

                onError?.(err);
            } finally {
                setIsStreaming(false);
                onComplete?.();
            }
        },
        [messages, model, onChunk, onError, placeholder, text],
    );

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
    };
}
