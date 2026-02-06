import { chat } from "@/db/schema";
import useChat from "@/hooks/chat/useChat";
import useDatabase from "@/hooks/useDatabase";
import { useChatState } from "@/hooks/useChatState";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { eq } from "drizzle-orm";
import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Platform, View } from "react-native";
import { KeyboardAvoidingView, KeyboardStickyView, useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";
import { ModelMessage } from "ai";
import { MessageList, MessageInput, useTheme, ChatContextMenu, RetryBanner } from "@/components";
import { ProviderId } from "@/types/provider.types";

export default function Chat() {
    const db = useDatabase();
    const { theme } = useTheme();
    const thinkingEnabled = useSettingsStore((state) => state.thinkingEnabled);
    const thinkingLevel = useSettingsStore((state) => state.thinkingLevel);
    const params = useLocalSearchParams<{ id?: string | string[] }>();
    
    // Get chat ID from params (or "new" for new chats)
    const rawChatId = Array.isArray(params.id) ? params.id[0] : params.id;
    const chatIdParam = rawChatId || "new";
    
    const isIos = Platform.OS === "ios";
    const insets = useSafeAreaInsets();
    const { progress } = useReanimatedKeyboardAnimation();
    const animatedBottomStyle = useAnimatedStyle(() => ({
        paddingBottom: interpolate(progress.value, [0, 1], [insets.bottom, 0]),
    }));
    
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
        thinkingOutput,
        sendMessage,
        reset,
        isThinking,
        isStreaming,
        setMessages,
        setThinkingOutput,
        generateTitle,
        setTitle,
        title,
        currentProvider,
        currentModel,
        retryLastMessage,
        canRetry,
    } = useChat({ 
        chatId: chatIdParam,
        enableThinking: thinkingEnabled,
        thinkingLevel,
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
                                    thinkingOutput: thinkingOutput,
                                    title: null,
                                    // Use current active provider/model (may be fallback)
                                    providerId: currentProvider,
                                    modelId: currentModel,
                                    providerMetadata: {},
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
                            thinkingOutput: thinkingOutput,
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
        setThinkingOutput([]);
        setTitle("Chat");
        setText("");
        setChatID(0);
        clearOverride();
    }, [chatIdParam, setMessages, setThinkingOutput, setTitle, setText, clearOverride]);

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
                        const thinkingOutput = Array.isArray(data.thinkingOutput)
                            ? (data.thinkingOutput as string[])
                            : [];
                        setMessages(messages);
                        setThinkingOutput(thinkingOutput);
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
                        setThinkingOutput([]);
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
                setThinkingOutput([]);
                setIsInitializing(false);
            }
        };
        setupChat();
        // Only run when params.id changes to load a different chat
    }, [chatIdParam, db, setMessages, setThinkingOutput, setTitle, syncFromDatabase, clearOverride]);

     return (
         <>
             {/* ============================================================================ */}
             {/* HEADER SECTION */}
             {/* Configures the navigation stack screen header with the chat title and menu */}
             {/* ============================================================================ */}
             <Stack.Screen
                 options={{
                     /* Display the current chat title in the header */
                     headerTitle: title,
                     /* Use transparent header to blend with app background */
                     headerTransparent: true,
                     /* Apply theme color to header text and back button */
                     headerTintColor: theme.colors.text,
                     /* Right header button: context menu with reset functionality */
                     headerRight: () => (
                         <ChatContextMenu 
                             onReset={handleReset}
                         />
                     ),
                 }}
             />
             
             {/* ============================================================================ */}
             {/* MAIN CONTAINER */}
             {/* Root view that fills the screen with themed background color */}
             {/* ============================================================================ */}
             <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                 {/* ====================================================================== */}
                 {/* KEYBOARD AVOIDING VIEW */}
                 {/* Handles keyboard presentation on iOS, adjusts content to prevent overlap */}
                 {/* ====================================================================== */}
                <KeyboardAvoidingView
                    behavior={isIos ? "translate-with-padding" : "padding"}
                    keyboardVerticalOffset={-30}
                    className="flex-1"
                >
                     {/* ================================================================== */}
                     {/* MESSAGE LIST SECTION */}
                     {/* Displays all messages in the conversation, auto-scrolls during stream */}
                     {/* ================================================================== */}
                      <MessageList
                        messages={messages}
                        thinkingOutput={thinkingOutput}
                        isThinking={isThinking}
                        isStreaming={isStreaming}
                      />
                     
                     {/* ================================================================== */}
                     {/* RETRY BANNER SECTION */}
                     {/* Shows retry button when last message fails, allows re-sending failed msg */}
                     {/* ================================================================== */}
                     <RetryBanner 
                         canRetry={canRetry}
                         onRetry={retryLastMessage}
                     />
                </KeyboardAvoidingView>
                
                {/* ================================================================== */}
                {/* INPUT SECTION */}
                {/* User text input area with send button, respects safe area on notch devices */}
                {/* ================================================================== */}
                {isIos ? (
                    <KeyboardStickyView>
                        <Animated.View style={animatedBottomStyle}>
                            <MessageInput
                                value={text}
                                onChangeText={setText}
                                onSend={sendChatMessages}
                                disabled={isStreaming}
                            />
                        </Animated.View>
                    </KeyboardStickyView>
                ) : (
                    <Animated.View style={animatedBottomStyle}>
                        <MessageInput
                            value={text}
                            onChangeText={setText}
                            onSend={sendChatMessages}
                            disabled={isStreaming}
                        />
                    </Animated.View>
                )}
            </View>
        </>
    );
}
