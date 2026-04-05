import { RenameChatModal } from "@/components/chat/RenameChatModal";
import useChat from "@/hooks/chat/useChat";
import { useChatHydration } from "@/hooks/chat/useChatHydration";
import { useChatMediaPicker } from "@/hooks/chat/useChatMediaPicker";
import useDatabase from "@/hooks/useDatabase";
import { useChatState } from "@/hooks/useChatState";
import { useAuthStore } from "@/stores";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useMessagePersistence } from "@/hooks/useMessagePersistence";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Alert, Keyboard, Platform, View, type LayoutChangeEvent } from "react-native";
import { KeyboardAvoidingView, KeyboardStickyView, useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";
import { ChatContextMenu } from "@/components/chat/ChatContextMenu";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { RetrievalRecoveryView } from "@/components/chat/RetrievalRecoveryView";
import { RetryBanner } from "@/components/chat/RetryBanner";
import { SaveErrorBanner } from "@/components/chat/SaveErrorBanner";
import { useTheme } from "@/components/ui/ThemeProvider";
import { getMessagePreviewText } from "@/lib/chat-content-parts";
import { createIdempotencyKey } from "@/lib/concurrency";
import { DEFAULT_CHAT_TITLE, getChatTitleForDisplay } from "@/lib/chat-title";
import type { ChatSendInput } from "@/types/chat.types";

const AUTO_TITLE_MAX_ATTEMPTS = 3;

export default function Chat() {
    const db = useDatabase();
    const { theme } = useTheme();
    const thinkingEnabled = useSettingsStore((state) => state.thinkingEnabled);
    const thinkingLevel = useSettingsStore((state) => state.thinkingLevel);
    const webSearchEnabled = useSettingsStore((state) => state.webSearchEnabled);
    const searxngUrl = useAuthStore((state) => state.searxngUrl);
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

    const [composerHeight, setComposerHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
    const [renameTitleDraft, setRenameTitleDraft] = useState("");
    const autoTitleAttemptCountRef = useRef(0);
    const isAutoTitleGenerationInFlightRef = useRef(false);
    const autoTitleSucceededRef = useRef(false);
    const lastAutoTitleTriggerSignatureRef = useRef<string | null>(null);
    
    // Initialize useChat with chatId for unified state management
    const {
        text,
        setText,
        messages,
        thinkingOutput,
        activeWebSearchState,
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
        enableWebSearch: webSearchEnabled,
        searxngUrl,
        onFallback: (from, to, reason) => {
        },
        onError: (error) => {
        },
    });

    const isInputLocked = streamState === "streaming" || streamState === "completing";
    const messageListBottomInset = isIos && isKeyboardVisible ? composerHeight : 0;

    const resetAutoTitleState = useCallback(() => {
        autoTitleAttemptCountRef.current = 0;
        isAutoTitleGenerationInFlightRef.current = false;
        autoTitleSucceededRef.current = false;
        lastAutoTitleTriggerSignatureRef.current = null;
    }, []);

    const syncAutoTitleState = useCallback((nextTitle: string) => {
        resetAutoTitleState();
        autoTitleSucceededRef.current = nextTitle !== DEFAULT_CHAT_TITLE;
    }, [resetAutoTitleState]);

    const {
        pendingAttachments,
        clearPendingAttachments,
        handleRemoveAttachment,
        handleTakePhoto,
        handleChooseFromLibrary,
    } = useChatMediaPicker({
        isInputLocked,
    });

    const {
        chatID,
        setChatID,
        isInitializing,
        hydrationError,
        retryHydration,
    } = useChatHydration({
        chatIdParam,
        db,
        clearOverride,
        syncFromDatabase,
        setMessages,
        setThinkingOutput,
        setTitle,
        setText,
        clearPendingAttachments,
        resetAutoTitleState,
        syncAutoTitleState,
    });

    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            isIos ? "keyboardWillShow" : "keyboardDidShow",
            () => setIsKeyboardVisible(true)
        );
        const hideSubscription = Keyboard.addListener(
            isIos ? "keyboardWillHide" : "keyboardDidHide",
            () => setIsKeyboardVisible(false)
        );

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, [isIos]);

    const initialUserRequest = useMemo(() => {
        for (const message of messages) {
            if (message.role !== "user") {
                continue;
            }

            const preview = getMessagePreviewText(message.content)?.trim() ?? "";
            if (preview.length > 0) {
                return preview;
            }
        }

        return "";
    }, [messages]);

    const attemptAutoTitleGeneration = useCallback(async () => {
        if (!initialUserRequest) {
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
    }, [generateTitle, initialUserRequest, title]);

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
        },
        onSaveError: (error, attempts) => {
            console.error(`[Chat] Save failed after ${attempts} attempts:`, error);
        },
        enabled: !isInitializing && messages.length > 0,
    });

    const handleReset = useCallback(() => {
        reset();
        clearPendingAttachments();
        setIsRenameModalVisible(false);
        setRenameTitleDraft("");
        clearOverride();
        resetAutoTitleState();
    }, [clearOverride, clearPendingAttachments, reset, resetAutoTitleState]);

    const handleOpenRenameModal = useCallback(() => {
        const currentTitle = title.trim() === DEFAULT_CHAT_TITLE ? "" : title.trim();
        setRenameTitleDraft(currentTitle);
        setIsRenameModalVisible(true);
    }, [title]);

    const handleCloseRenameModal = useCallback(() => {
        setIsRenameModalVisible(false);
        setRenameTitleDraft("");
    }, []);

    const handleRenameSubmit = useCallback(() => {
        const nextTitle = renameTitleDraft.trim();

        if (nextTitle.length === 0) {
            Alert.alert("Title required", "Please enter a chat title before saving.");
            return;
        }

        if (nextTitle === title.trim()) {
            handleCloseRenameModal();
            return;
        }

        setTitle(nextTitle);
        autoTitleSucceededRef.current = true;
        lastAutoTitleTriggerSignatureRef.current = null;
        handleCloseRenameModal();
    }, [handleCloseRenameModal, renameTitleDraft, setTitle, title]);

    const sendChatMessages = useCallback(async (input?: ChatSendInput) => {
        await sendMessage(input);
        clearPendingAttachments();
    }, [clearPendingAttachments, sendMessage]);

    const handleComposerLayout = useCallback((event: LayoutChangeEvent) => {
        const nextComposerHeight = Math.ceil(event.nativeEvent.layout.height);
        setComposerHeight((currentHeight) => (
            currentHeight === nextComposerHeight ? currentHeight : nextComposerHeight
        ));
    }, []);

    // Sync chatID with lastSavedChatId when persistence succeeds for new chats
    useEffect(() => {
        if (lastSavedChatId && chatID === 0) {
            setChatID(lastSavedChatId);
        }
    }, [chatID, lastSavedChatId, setChatID]);

    useEffect(() => {
        if (isInitializing) {
            return;
        }

        if (!initialUserRequest) {
            return;
        }

        if (title && title !== DEFAULT_CHAT_TITLE) {
            autoTitleSucceededRef.current = true;
            return;
        }

        const triggerSignature = createIdempotencyKey("auto-title-trigger", [
            chatIdParam,
            initialUserRequest,
        ]);

        if (lastAutoTitleTriggerSignatureRef.current === triggerSignature) {
            return;
        }

        lastAutoTitleTriggerSignatureRef.current = triggerSignature;
        void attemptAutoTitleGeneration();
    }, [
        attemptAutoTitleGeneration,
        chatIdParam,
        initialUserRequest,
        isInitializing,
        title,
    ]);

     return (
         <>
             {/* ============================================================================ */}
             {/* HEADER SECTION */}
             {/* Configures the navigation stack screen header with the chat title and menu */}
             {/* ============================================================================ */}
             <Stack.Screen
                  options={{
                      headerTitle: getChatTitleForDisplay(title),
                      headerTransparent: true,
                      headerTintColor: theme.colors.text,
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
                          activeWebSearchState={activeWebSearchState}
                          isThinking={isThinking}
                          isStreaming={isStreaming}
                         bottomInset={messageListBottomInset}
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

                     {messageListBottomInset > 0 ? (
                         <View style={{ height: messageListBottomInset }} />
                     ) : null}
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
                                 onLayout={handleComposerLayout}
                                 attachments={pendingAttachments}
                                 onTakePhoto={handleTakePhoto}
                                 onChooseFromLibrary={handleChooseFromLibrary}
                                 onRemoveAttachment={handleRemoveAttachment}
                                disabled={isInputLocked}
                                isStreaming={isStreaming}
                                onCancel={cancel}
                                toolbar={
                                    <ChatContextMenu
                                        onReset={handleReset}
                                        onRename={handleOpenRenameModal}
                                    />
                                }
                            />
                        </Animated.View>
                    </KeyboardStickyView>
                 ) : (
                     <Animated.View style={animatedBottomStyle}>
                          <MessageInput
                             value={text}
                             onChangeText={setText}
                             onSend={sendChatMessages}
                             onLayout={handleComposerLayout}
                             attachments={pendingAttachments}
                             onTakePhoto={handleTakePhoto}
                             onChooseFromLibrary={handleChooseFromLibrary}
                             onRemoveAttachment={handleRemoveAttachment}
                            disabled={isInputLocked}
                            isStreaming={isStreaming}
                            onCancel={cancel}
                            toolbar={
                                <ChatContextMenu
                                    onReset={handleReset}
                                    onRename={handleOpenRenameModal}
                                />
                            }
                         />
                     </Animated.View>
                 )}

                 <RenameChatModal
                     visible={isRenameModalVisible}
                     value={renameTitleDraft}
                     onChangeText={setRenameTitleDraft}
                     onClose={handleCloseRenameModal}
                     onSubmit={handleRenameSubmit}
                 />
             </View>
         </>
     );
}
