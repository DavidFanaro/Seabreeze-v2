import { chat } from "@/db/schema";
import useChat from "@/hooks/useChat";
import useDatabase from "@/hooks/useDatabase";
import { useChatState } from "@/hooks/useChatState";
import { eq } from "drizzle-orm";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModelMessage } from "ai";
import { MessageList, MessageInput, useTheme, ChatContextMenu } from "@/components";
import { ProviderId } from "@/lib/types/provider-types";

export default function Chat() {
    const db = useDatabase();
    const { theme } = useTheme();
    const params = useLocalSearchParams<{ id?: string }>();
    
    // Get the chat ID from params (or "new" for new chats)
    const chatIdParam = params.id || "new";
    
    // Use unified chat state management
    const chatState = useChatState(chatIdParam);
    
    // Local state only for database ID (not provider/model)
    const [chatID, setChatID] = useState(0);
    
    // Initialize useChat with chatId for unified state management
    const {
        text,
        setText,
        messages,
        sendMessage,
        reset,
        isStreaming,
        setMessages,
        generateTitle,
        setTitle,
        title,
        currentProvider,
        currentModel,
        isUsingFallback,
        // Available for future UI enhancements (retry button, etc.)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        retryLastMessage,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        canRetry,
    } = useChat({ 
        chatId: chatIdParam,
        onFallback: (from, to, reason) => {
            console.log(`Provider fallback: ${from} -> ${to} (${reason})`);
        },
        onError: (error) => {
            console.error("Chat error:", error);
        },
    });

    const handleReset = useCallback(() => {
        reset();
        // Clear any chat-specific overrides
        chatState.clearOverride();
    }, [reset, chatState]);

    const sendChatMessages = useCallback(async () => {
        await sendMessage();
    }, [sendMessage]);

    // Save or update chat when streaming stops
    useEffect(() => {
        const saveOrUpdate = async () => {
            const now = new Date();
            if (chatID === 0) {
                // New chat - insert only if there are messages
                if (messages.length > 0) {
                    const data = (
                        await db
                            .insert(chat)
                            .values({
                                messages: messages,
                                title: null,
                                // Use current active provider/model (may be fallback)
                                providerId: currentProvider,
                                modelId: currentModel,
                                createdAt: now,
                                updatedAt: now,
                            })
                            .returning({ id: chat.id })
                    )[0];
                    setChatID(data.id);
                    console.log("Chat Created with ID:", data.id, "Provider:", currentProvider, "Model:", currentModel);
                }
            } else {
                // Existing chat - update messages and provider/model
                await db
                    .update(chat)
                    .set({ 
                        messages: messages, 
                        providerId: currentProvider, 
                        modelId: currentModel, 
                        updatedAt: now 
                    })
                    .where(eq(chat.id, chatID));
            }
        };

        if (isStreaming) {
            console.log("Currently Streaming with provider:", currentProvider, "model:", currentModel);
        } else {
            saveOrUpdate();
            if (!title || title === "Chat") {
                generateTitle();
            }
        }
        // Only run when streaming stops to avoid excessive DB writes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStreaming]);

    // Update title in database
    useEffect(() => {
        const updateTitle = async () => {
            if (chatID !== 0 && title && title !== "Chat") {
                await db
                    .update(chat)
                    .set({ title: title, updatedAt: new Date() })
                    .where(eq(chat.id, chatID));
            }
        };
        updateTitle();
    }, [title, chatID, db]);

    // Load existing chat data
    useEffect(() => {
        const setupChat = async () => {
            if (params.id !== "new") {
                console.log("Loading existing chat with ID:", params.id);
                const id = Number(params.id);
                const data = await db
                    .select()
                    .from(chat)
                    .where(eq(chat.id, id))
                    .all()[0];
                    
                console.log("Loaded chat data:", {
                    id: data.id,
                    title: data.title,
                    providerId: data.providerId,
                    modelId: data.modelId,
                    messagesCount: Array.isArray(data.messages) ? data.messages.length : 0
                });
                
                setMessages(data.messages as ModelMessage[]);
                setTitle(data.title as string);
                setChatID(id);
                
                // Sync provider/model from database to unified state
                if (data.providerId && data.modelId) {
                    chatState.syncFromDatabase(
                        data.providerId as ProviderId,
                        data.modelId
                    );
                }
                
                console.log(`Chat loaded: ${params.id}`);
            } else {
                console.log("Creating new chat with provider:", chatState.provider, "model:", chatState.model);
            }
        };
        setupChat();
        // Only run when params.id changes to load a different chat
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    // Create header subtitle showing current provider/model (available for future UI enhancement)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _getHeaderSubtitle = useCallback(() => {
        if (isUsingFallback) {
            return `${currentProvider} (fallback)`;
        }
        return undefined;
    }, [isUsingFallback, currentProvider]);

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: title,
                    headerTransparent: true,
                    headerRight: () => (
                        <ChatContextMenu 
                            onReset={handleReset}
                        />
                    ),
                }}
            />
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <KeyboardAvoidingView
                    behavior={"padding"}
                    keyboardVerticalOffset={-30}
                    style={{ flex: 1 }}
                >
                    <MessageList messages={messages} />
                    <SafeAreaView edges={["bottom"]}>
                        <MessageInput
                            value={text}
                            onChangeText={setText}
                            onSend={sendChatMessages}
                            disabled={isStreaming}
                        />
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </View>
        </>
    );
}
