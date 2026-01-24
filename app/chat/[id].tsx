import { chat } from "@/db/schema";
import useChat from "@/hooks/chat/useChat";
import useDatabase from "@/hooks/useDatabase";
import { useChatState } from "@/hooks/useChatState";
import { eq } from "drizzle-orm";
import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModelMessage } from "ai";
import { MessageList, MessageInput, useTheme, ChatContextMenu, RetryBanner } from "@/components";
import { ProviderId } from "@/types/provider.types";

export default function Chat() {
    const db = useDatabase();
    const { theme } = useTheme();
    const params = useLocalSearchParams<{ id?: string | string[] }>();
    
    // Get chat ID from params (or "new" for new chats)
    const rawChatId = Array.isArray(params.id) ? params.id[0] : params.id;
    const chatIdParam = rawChatId || "new";
    
    // Use unified chat state management
    const { clearOverride, syncFromDatabase } = useChatState(chatIdParam);
    
    // Local state only for database ID (not provider/model)
    const [chatID, setChatID] = useState(0);
    const [isInitializing, setIsInitializing] = useState(false);
    const loadIdRef = useRef(0);
    const currentChatIdRef = useRef<string | null>(null);
    
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
        retryLastMessage,
        canRetry,
    } = useChat({ 
        chatId: chatIdParam,
        onFallback: (from, to, reason) => {
        },
        onError: (error) => {
        },
    });

    const handleReset = useCallback(() => {
        reset();
        // Clear any chat-specific overrides
        clearOverride();
    }, [reset, clearOverride]);

    const sendChatMessages = useCallback(async () => {
        await sendMessage();
    }, [sendMessage]);

    // Save or update chat when streaming stops (only when screen is focused)
    useFocusEffect(
        useCallback(() => {
            if (isInitializing || (chatIdParam !== "new" && chatID === 0)) return;
            let isActive = true;
            const saveOrUpdate = async () => {
                if (!isActive) return;
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
                        if (!isActive) return;
                        setChatID(data.id);
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

            if (!isStreaming && messages.length > 0) {
                saveOrUpdate();
                if (!title || title === "Chat") {
                    generateTitle();
                }
            }
            return () => {
                isActive = false;
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isStreaming, messages.length, title, chatID, db, currentProvider, currentModel, generateTitle, isInitializing])
    );

    // Update title in database (only when screen is focused)
    useFocusEffect(
        useCallback(() => {
            if (isInitializing || (chatIdParam !== "new" && chatID === 0)) return;
            let isActive = true;
            const updateTitle = async () => {
                if (!isActive) return;
                if (chatID !== 0 && title && title !== "Chat") {
                    await db
                        .update(chat)
                        .set({ title: title, updatedAt: new Date() })
                        .where(eq(chat.id, chatID));
                }
            };
            updateTitle();
            return () => {
                isActive = false;
            };
        }, [title, chatID, db, isInitializing, chatIdParam])
    );

    // Reset state immediately on chat change
    useEffect(() => {
        if (currentChatIdRef.current === chatIdParam) {
            return;
        }
        setIsInitializing(true);
        setMessages([]);
        setTitle("Chat");
        setText("");
        setChatID(0);
        clearOverride();
    }, [chatIdParam, setMessages, setTitle, setText, clearOverride]);

    // Load existing chat data
    useEffect(() => {
        const loadId = loadIdRef.current + 1;
        loadIdRef.current = loadId;
        const setupChat = async () => {
            if (chatIdParam !== "new") {
                const id = Number(chatIdParam);
                try {
                    const data = await db
                        .select()
                        .from(chat)
                        .where(eq(chat.id, id))
                        .get();

                    if (loadId !== loadIdRef.current) return;

                    if (data) {
                        const messages = data.messages as ModelMessage[];
                        setMessages(messages);
                        setTitle(data.title as string);
                        setChatID(id);
                        currentChatIdRef.current = chatIdParam;

                        // Sync provider/model from database to unified state
                        if (data.providerId && data.modelId) {
                            syncFromDatabase(
                                data.providerId as ProviderId,
                                data.modelId
                            );
                        }
                    } else {
                        setMessages([]);
                        setTitle("Chat");
                        setChatID(0);
                        clearOverride();
                        currentChatIdRef.current = null;
                    }
                } catch {
                    // Error handling for failed chat loading
                } finally {
                    if (loadId === loadIdRef.current) {
                        setIsInitializing(false);
                    }
                }
            } else {
                currentChatIdRef.current = "new";
                setIsInitializing(false);
            }
        };
        setupChat();
        // Only run when params.id changes to load a different chat
    }, [chatIdParam, db, setMessages, setTitle, syncFromDatabase, clearOverride]);

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: title,
                    headerTransparent: true,
                    headerTintColor: theme.colors.text,
                    headerRight: () => (
                        <ChatContextMenu 
                            onReset={handleReset}
                        />
                    ),
                }}
            />
            <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                <KeyboardAvoidingView
                    behavior={"padding"}
                    keyboardVerticalOffset={-30}
                    className="flex-1"
                >
                    <MessageList messages={messages} isStreaming={isStreaming} />
                    <RetryBanner 
                        canRetry={canRetry}
                        onRetry={retryLastMessage}
                    />
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
