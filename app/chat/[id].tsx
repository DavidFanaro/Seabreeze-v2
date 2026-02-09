import { chat } from "@/db/schema";
import useChat from "@/hooks/chat/useChat";
import useDatabase from "@/hooks/useDatabase";
import { useChatState } from "@/hooks/useChatState";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useMessagePersistence } from "@/hooks/useMessagePersistence";
import { eq } from "drizzle-orm";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Platform, View, unstable_batchedUpdates } from "react-native";
import { KeyboardAvoidingView, KeyboardStickyView, useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";
import { ModelMessage } from "ai";
import { MessageList, MessageInput, useTheme, ChatContextMenu, RetrievalRecoveryView, RetryBanner } from "@/components";
import { SaveErrorBanner } from "@/components/chat/SaveErrorBanner";
import { StreamControlBanner } from "@/components/chat/StreamControlBanner";
import { createIdempotencyKey, createSequenceGuard } from "@/lib/concurrency";
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
    const [hydrationError, setHydrationError] = useState<string | null>(null);
    const [hydrationAttempt, setHydrationAttempt] = useState(0);
    const hydrationGuardRef = useRef(createSequenceGuard("chat-hydration"));
    const lastHydratedSignatureRef = useRef<string | null>(null);
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
        streamState,
        setMessages,
        setThinkingOutput,
        generateTitle,
        setTitle,
        title,
        currentProvider,
        currentModel,
        retryLastMessage,
        canRetry,
        errorMessage,
        cancel,
    } = useChat({ 
        chatId: chatIdParam,
        enableThinking: thinkingEnabled,
        thinkingLevel,
        onFallback: (from, to, reason) => {
        },
        onError: (error) => {
        },
    });

    // Use atomic message persistence with retry logic
    const {
        saveStatus,
        hasSaveError,
        userFriendlyError,
        triggerSave,
        saveAttempts,
        lastSavedChatId,
    } = useMessagePersistence({
        streamState,
        chatIdParam,
        messages,
        thinkingOutput,
        providerId: currentProvider,
        modelId: currentModel,
        title,
        onSaveComplete: (savedChatId) => {
            if (chatID === 0) {
                setChatID(savedChatId);
            }
            // Generate title if needed
            if (!title || title === "Chat") {
                generateTitle();
            }
        },
        onSaveError: (error, attempts) => {
            console.error(`[Chat] Save failed after ${attempts} attempts:`, error);
        },
        enabled: !isInitializing && messages.length > 0,
    });

    const handleReset = useCallback(() => {
        reset();
        // Clear any chat-specific overrides
        clearOverride();
    }, [reset, clearOverride]);

    const sendChatMessages = useCallback(async () => {
        await sendMessage();
    }, [sendMessage]);

    const retryHydration = useCallback(() => {
        if (isInitializing) {
            return;
        }

        setIsInitializing(true);
        setHydrationAttempt((attempt) => attempt + 1);
    }, [isInitializing]);

    const resetHydratedState = useCallback((nextChatScope: string | null) => {
        unstable_batchedUpdates(() => {
            setMessages([]);
            setThinkingOutput([]);
            setTitle("Chat");
            setText("");
            setChatID(0);
        });
        clearOverride();
        currentChatIdRef.current = nextChatScope;
        lastHydratedSignatureRef.current = null;
    }, [setMessages, setThinkingOutput, setTitle, setText, clearOverride]);

    const applyHydrationSnapshot = useCallback((snapshot: {
        signature: string;
        chatScope: string;
        chatId: number;
        messages: ModelMessage[];
        thinkingOutput: string[];
        title: string;
        providerId: ProviderId | null;
        modelId: string | null;
    }) => {
        if (snapshot.signature === lastHydratedSignatureRef.current) {
            return;
        }

        unstable_batchedUpdates(() => {
            setMessages(snapshot.messages);
            setThinkingOutput(snapshot.thinkingOutput);
            setTitle(snapshot.title);
            setChatID(snapshot.chatId);
            setHydrationError(null);
        });
        currentChatIdRef.current = snapshot.chatScope;
        lastHydratedSignatureRef.current = snapshot.signature;

        if (snapshot.providerId && snapshot.modelId) {
            syncFromDatabase(snapshot.providerId, snapshot.modelId);
        }
    }, [setMessages, setThinkingOutput, setTitle, syncFromDatabase]);

    // Sync chatID with lastSavedChatId when persistence succeeds for new chats
    useEffect(() => {
        if (lastSavedChatId && chatID === 0) {
            setChatID(lastSavedChatId);
        }
    }, [lastSavedChatId, chatID]);

    // Reset state immediately on chat change
    useEffect(() => {
        if (currentChatIdRef.current === chatIdParam) {
            return;
        }
        setIsInitializing(true);
        setHydrationError(null);
        resetHydratedState(null);
    }, [chatIdParam, resetHydratedState]);

    // Load existing chat data
    useEffect(() => {
        const token = hydrationGuardRef.current.next();

        const normalizeMessages = (value: unknown): ModelMessage[] => {
            if (!Array.isArray(value)) {
                return [];
            }

            return value
                .filter((message): message is ModelMessage => (
                    typeof message === "object"
                    && message !== null
                    && "role" in message
                    && "content" in message
                    && typeof (message as { role?: unknown }).role === "string"
                ))
                .map((message) => ({
                    ...message,
                }));
        };

        const normalizeThinkingOutput = (value: unknown): string[] => {
            if (!Array.isArray(value)) {
                return [];
            }

            return value.filter((entry): entry is string => typeof entry === "string");
        };

        const setupChat = async () => {
            if (chatIdParam !== "new") {
                const id = Number(chatIdParam);
                if (Number.isNaN(id)) {
                    if (!hydrationGuardRef.current.isCurrent(token)) {
                        return;
                    }

                    setHydrationError("Invalid chat id. Please reopen from chat history.");
                    resetHydratedState(null);
                    setIsInitializing(false);
                    return;
                }

                try {
                    const data = await db
                        .select()
                        .from(chat)
                        .where(eq(chat.id, id))
                        .get();

                    if (!hydrationGuardRef.current.isCurrent(token)) return;

                    if (data) {
                        const messages = normalizeMessages(data.messages);
                        const thinkingOutput = normalizeThinkingOutput(data.thinkingOutput);
                        const title = typeof data.title === "string" && data.title.trim().length > 0
                            ? data.title
                            : "Chat";

                        const signature = createIdempotencyKey("chat-hydration", [
                            chatIdParam,
                            String(data.updatedAt?.toISOString?.() ?? ""),
                            JSON.stringify(messages),
                            JSON.stringify(thinkingOutput),
                            title,
                            String(data.providerId ?? ""),
                            String(data.modelId ?? ""),
                        ]);

                        applyHydrationSnapshot({
                            signature,
                            chatScope: chatIdParam,
                            chatId: id,
                            messages,
                            thinkingOutput,
                            title,
                            providerId: (data.providerId as ProviderId | null) ?? null,
                            modelId: data.modelId,
                        });
                    } else {
                        resetHydratedState(null);
                    }
                } catch {
                    if (!hydrationGuardRef.current.isCurrent(token)) {
                        return;
                    }

                    resetHydratedState(null);
                    setHydrationError("Unable to hydrate this chat right now. You can keep using a new chat and try reopening this conversation.");
                } finally {
                    if (hydrationGuardRef.current.isCurrent(token)) {
                        setIsInitializing(false);
                    }
                }
            } else {
                if (!hydrationGuardRef.current.isCurrent(token)) {
                    return;
                }

                currentChatIdRef.current = "new";
                setHydrationError(null);
                lastHydratedSignatureRef.current = null;
                setThinkingOutput([]);
                setIsInitializing(false);
            }
        };
        setupChat();
        // Only run when params.id changes to load a different chat
    }, [chatIdParam, db, setThinkingOutput, applyHydrationSnapshot, hydrationAttempt, resetHydratedState]);

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

                      <RetrievalRecoveryView
                          visible={!!hydrationError}
                          errorMessage={hydrationError ?? "Unable to load this chat right now."}
                          onRetry={retryHydration}
                          retryDisabled={isInitializing}
                      />
                     
                      {/* ================================================================== */}
                      {/* RETRY BANNER SECTION */}
                      {/* Shows retry button when last message fails, allows re-sending failed msg */}
                      {/* ================================================================== */}
                      <RetryBanner 
                           canRetry={canRetry}
                           onRetry={retryLastMessage}
                           errorMessage={errorMessage}
                       />

                     {/* ================================================================== */}
                     {/* STREAM CONTROL BANNER SECTION */}
                     {/* Shows cancel button during streaming and 'Stopped' when cancelled */}
                     {/* ================================================================== */}
                     <StreamControlBanner 
                         isStreaming={isStreaming}
                         streamState={streamState}
                         onCancel={cancel}
                     />

                     {/* ================================================================== */}
                     {/* SAVE ERROR BANNER SECTION */}
                     {/* Shows error when message persistence fails with retry option */}
                     {/* ================================================================== */}
                     <SaveErrorBanner
                         visible={hasSaveError}
                         errorMessage={userFriendlyError}
                         onRetry={triggerSave}
                         attempts={saveStatus === "retrying" ? saveAttempts : undefined}
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
