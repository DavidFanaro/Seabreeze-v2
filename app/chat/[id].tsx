import { chat } from "@/db/schema";
import useChat from "@/hooks/chat/useChat";
import useDatabase from "@/hooks/useDatabase";
import { useChatState } from "@/hooks/useChatState";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useMessagePersistence } from "@/hooks/useMessagePersistence";
import {
    isChatDeleteLocked,
    runChatOperation,
} from "@/lib/chat-persistence-coordinator";
import { normalizePersistedMessages } from "@/lib/chat-message-normalization";
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
import { createIdempotencyKey, createSequenceGuard } from "@/lib/concurrency";
import { DEFAULT_CHAT_TITLE, getChatTitleForDisplay } from "@/lib/chat-title";
import { ProviderId } from "@/types/provider.types";
import {
    failPersistenceOperation,
    startPersistenceOperation,
    succeedPersistenceOperation,
} from "@/lib/persistence-telemetry";

const AUTO_TITLE_MAX_ATTEMPTS = 3;

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
    const autoTitleAttemptCountRef = useRef(0);
    const isAutoTitleGenerationInFlightRef = useRef(false);
    const autoTitleSucceededRef = useRef(false);
    const lastAutoTitleTriggerSignatureRef = useRef<string | null>(null);
    const backfilledChatIdsRef = useRef<Set<number>>(new Set());
    
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

    const isInputLocked = streamState === "streaming" || streamState === "completing";

    const attemptAutoTitleGeneration = useCallback(async () => {
        if (messages.length === 0) {
            return;
        }

        if (title && title !== DEFAULT_CHAT_TITLE) {
            autoTitleSucceededRef.current = true;
            return;
        }

        if (autoTitleSucceededRef.current) {
            return;
        }

        if (isAutoTitleGenerationInFlightRef.current) {
            return;
        }

        if (autoTitleAttemptCountRef.current >= AUTO_TITLE_MAX_ATTEMPTS) {
            return;
        }

        autoTitleAttemptCountRef.current += 1;
        isAutoTitleGenerationInFlightRef.current = true;

        try {
            const generatedTitle = await generateTitle();
            if (generatedTitle.trim().length > 0) {
                autoTitleSucceededRef.current = true;
            }
        } finally {
            isAutoTitleGenerationInFlightRef.current = false;
        }
    }, [generateTitle, messages.length, title]);

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
            setChatID((current) => (current === 0 ? savedChatId : current));
            void attemptAutoTitleGeneration();
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

    const sendChatMessages = useCallback(async (textOverride?: string) => {
        await sendMessage(textOverride);
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
            setTitle(DEFAULT_CHAT_TITLE);
            setText("");
            setChatID(0);
        });
        clearOverride();
        currentChatIdRef.current = nextChatScope;
        lastHydratedSignatureRef.current = null;
        autoTitleAttemptCountRef.current = 0;
        isAutoTitleGenerationInFlightRef.current = false;
        autoTitleSucceededRef.current = false;
        lastAutoTitleTriggerSignatureRef.current = null;
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
        autoTitleAttemptCountRef.current = 0;
        isAutoTitleGenerationInFlightRef.current = false;
        autoTitleSucceededRef.current = snapshot.title !== DEFAULT_CHAT_TITLE;
        lastAutoTitleTriggerSignatureRef.current = null;

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

    useEffect(() => {
        if (isInitializing) {
            return;
        }

        if (messages.length === 0) {
            return;
        }

        if (title && title !== DEFAULT_CHAT_TITLE) {
            autoTitleSucceededRef.current = true;
            return;
        }

        if (
            streamState !== "completed"
            && streamState !== "error"
            && streamState !== "cancelled"
        ) {
            return;
        }

        const lastMessage = messages[messages.length - 1];
        const lastContent = typeof lastMessage?.content === "string"
            ? lastMessage.content
            : JSON.stringify(lastMessage?.content ?? "");
        const triggerSignature = createIdempotencyKey("auto-title-trigger", [
            chatIdParam,
            String(lastSavedChatId ?? ""),
            String(messages.length),
            String(lastMessage?.role ?? ""),
            lastContent,
            streamState,
            title,
        ]);

        if (lastAutoTitleTriggerSignatureRef.current === triggerSignature) {
            return;
        }

        lastAutoTitleTriggerSignatureRef.current = triggerSignature;
        void attemptAutoTitleGeneration();
    }, [
        attemptAutoTitleGeneration,
        chatIdParam,
        isInitializing,
        lastSavedChatId,
        messages,
        streamState,
        title,
    ]);

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

        const normalizeThinkingOutput = (value: unknown): string[] => {
            if (!Array.isArray(value)) {
                return [];
            }

            return value.filter((entry): entry is string => typeof entry === "string");
        };

        const setupChat = async () => {
            if (chatIdParam !== "new") {
                const loadOperation = startPersistenceOperation("load", {
                    chatScope: chatIdParam,
                    hydrationAttempt,
                });
                const id = Number(chatIdParam);
                if (Number.isNaN(id)) {
                    if (!hydrationGuardRef.current.isCurrent(token)) {
                        return;
                    }

                    failPersistenceOperation(loadOperation, new Error(`Invalid chat id: ${chatIdParam}`), {
                        chatScope: chatIdParam,
                    });
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
                        const {
                            messages,
                            didCoerceContent,
                            droppedMessages,
                        } = normalizePersistedMessages(data.messages);
                        const thinkingOutput = normalizeThinkingOutput(data.thinkingOutput);
                        const title = typeof data.title === "string" && data.title.trim().length > 0
                            ? data.title
                            : DEFAULT_CHAT_TITLE;

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
                        succeedPersistenceOperation(loadOperation, {
                            chatId: id,
                            chatFound: true,
                            messageCount: messages.length,
                            thinkingOutputCount: thinkingOutput.length,
                        });

                        const shouldBackfillLegacyPayload = (didCoerceContent || droppedMessages > 0)
                            && !backfilledChatIdsRef.current.has(id);

                        if (shouldBackfillLegacyPayload) {
                            backfilledChatIdsRef.current.add(id);

                            void runChatOperation(String(id), async () => {
                                if (isChatDeleteLocked(id)) {
                                    backfilledChatIdsRef.current.delete(id);
                                    return;
                                }

                                await db
                                    .update(chat)
                                    .set({
                                        messages,
                                        thinkingOutput,
                                    })
                                    .where(eq(chat.id, id));
                            }).catch((error) => {
                                backfilledChatIdsRef.current.delete(id);
                                console.warn("[Chat] Failed to backfill legacy chat payload:", error);
                            });
                        }
                    } else {
                        resetHydratedState(null);
                        succeedPersistenceOperation(loadOperation, {
                            chatId: id,
                            chatFound: false,
                        });
                    }
                } catch (error) {
                    if (!hydrationGuardRef.current.isCurrent(token)) {
                        return;
                    }

                    failPersistenceOperation(loadOperation, error, {
                        chatId: id,
                    });
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
                      headerTitle: getChatTitleForDisplay(title),
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
                                disabled={isInputLocked}
                                isStreaming={isStreaming}
                                onCancel={cancel}
                            />
                        </Animated.View>
                    </KeyboardStickyView>
                ) : (
                    <Animated.View style={animatedBottomStyle}>
                        <MessageInput
                            value={text}
                            onChangeText={setText}
                            onSend={sendChatMessages}
                            disabled={isInputLocked}
                            isStreaming={isStreaming}
                            onCancel={cancel}
                        />
                    </Animated.View>
                )}
            </View>
        </>
    );
}
