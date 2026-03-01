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
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { ActionSheetIOS, Alert, Linking, Modal, Platform, Pressable, Text, TextInput, View, unstable_batchedUpdates } from "react-native";
import { KeyboardAvoidingView, KeyboardStickyView, useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";
import { ModelMessage } from "ai";
import { MessageList, MessageInput, useTheme, ChatContextMenu, RetrievalRecoveryView, RetryBanner } from "@/components";
import { SaveErrorBanner } from "@/components/chat/SaveErrorBanner";
import {
    asDataUri,
    isModelSupportedImageType,
    MAX_CHAT_ATTACHMENTS,
    MAX_CHAT_ATTACHMENT_BYTES,
    normalizePickerAsset,
} from "@/lib/chat-attachments";
import { getMessagePreviewText } from "@/lib/chat-content-parts";
import { createIdempotencyKey, createSequenceGuard } from "@/lib/concurrency";
import { DEFAULT_CHAT_TITLE, getChatTitleForDisplay } from "@/lib/chat-title";
import type { ChatAttachment, ChatSendInput } from "@/types/chat.types";
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
    const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
    const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
    const [renameTitleDraft, setRenameTitleDraft] = useState("");
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
        setPendingAttachments([]);
        setIsRenameModalVisible(false);
        setRenameTitleDraft("");
        // Clear any chat-specific overrides
        clearOverride();
        autoTitleAttemptCountRef.current = 0;
        isAutoTitleGenerationInFlightRef.current = false;
        autoTitleSucceededRef.current = false;
        lastAutoTitleTriggerSignatureRef.current = null;
    }, [reset, clearOverride]);

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
        handleCloseRenameModal();
    }, [handleCloseRenameModal, renameTitleDraft, setTitle, title]);

    const sendChatMessages = useCallback(async (input?: ChatSendInput) => {
        await sendMessage(input);
        setPendingAttachments([]);
    }, [sendMessage]);

    const handleRemoveAttachment = useCallback((attachmentId: string) => {
        setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
    }, []);

    const processSelectedAssets = useCallback((assets: ImagePicker.ImagePickerAsset[]) => {
        const skippedUnsupportedImages: string[] = [];
        const normalized = assets.flatMap((asset, index) => {
            const nextAttachment = normalizePickerAsset(asset, index);

            if (nextAttachment.kind === "image") {
                if (typeof asset.base64 === "string" && asset.base64.length > 0) {
                    return [{
                        ...nextAttachment,
                        uri: asDataUri(asset.base64, "image/jpeg"),
                        mediaType: "image/jpeg",
                    }];
                }

                if (!isModelSupportedImageType(nextAttachment.mediaType)) {
                    skippedUnsupportedImages.push(nextAttachment.fileName ?? "image");
                    return [];
                }
            }

            return [nextAttachment];
        });

        if (skippedUnsupportedImages.length > 0) {
            Alert.alert(
                "Unsupported image format",
                "Some images were skipped. Supported formats are JPEG, PNG, GIF, and WEBP.",
            );
        }

        const acceptedAttachments = normalized.filter((attachment) => {
            return typeof attachment.fileSize !== "number"
                || attachment.fileSize <= MAX_CHAT_ATTACHMENT_BYTES;
        });

        if (acceptedAttachments.length < normalized.length) {
            Alert.alert(
                "File too large",
                "Each attachment must be 30 MB or smaller.",
            );
        }

        if (acceptedAttachments.length === 0) {
            return;
        }

        setPendingAttachments((current) => [
            ...current,
            ...acceptedAttachments,
        ].slice(0, MAX_CHAT_ATTACHMENTS));
    }, []);

    const openAppSettings = useCallback(() => {
        void Linking.openSettings().catch((error) => {
            console.warn("[Chat] Failed to open app settings:", error);
        });
    }, []);

    const ensureCameraPermission = useCallback(async () => {
        let permission = await ImagePicker.getCameraPermissionsAsync();

        if (!permission.granted && permission.canAskAgain) {
            permission = await ImagePicker.requestCameraPermissionsAsync();
        }

        return permission;
    }, []);

    const mapCameraLaunchError = useCallback((error: unknown) => {
        const message = error instanceof Error ? error.message : "";
        const normalized = message.toLowerCase();

        if (
            normalized.includes("camera not available on simulator")
            || normalized.includes("camera unavailable")
            || normalized.includes("no camera")
        ) {
            return {
                title: "Camera unavailable",
                message: "This device does not have an available camera. Choose from Library instead.",
                allowLibraryFallback: true,
                allowOpenSettings: false,
            };
        }

        if (
            normalized.includes("missing camera")
            || normalized.includes("camera permission")
            || normalized.includes("camera roll permission")
            || normalized.includes("user rejected permissions")
            || normalized.includes("permission")
        ) {
            return {
                title: "Camera permission required",
                message: "Allow camera access in Settings to take photos.",
                allowLibraryFallback: false,
                allowOpenSettings: true,
            };
        }

        return {
            title: "Unable to open camera",
            message: "Could not open the camera right now. Please try again.",
            allowLibraryFallback: false,
            allowOpenSettings: false,
        };
    }, []);

    const launchLibraryPicker = useCallback(async (remainingSlots: number) => {
        let result: ImagePicker.ImagePickerResult;

        try {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images", "videos"] as ImagePicker.MediaType[],
                allowsMultipleSelection: true,
                selectionLimit: remainingSlots,
                base64: true,
                quality: 1,
            });
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Could not open your media library.";

            Alert.alert("Unable to open media library", message);
            return;
        }

        if (result.canceled || result.assets.length === 0) {
            return;
        }

        processSelectedAssets(result.assets);
    }, [processSelectedAssets]);

    const launchCameraPicker = useCallback(async (remainingSlots: number) => {
        let permission: Awaited<ReturnType<typeof ImagePicker.getCameraPermissionsAsync>>;

        try {
            permission = await ensureCameraPermission();
        } catch (error) {
            console.warn("[Chat] Failed to check camera permission:", error);
            Alert.alert(
                "Unable to access camera",
                "Could not verify camera permissions right now. Please try again.",
            );
            return;
        }

        if (!permission.granted) {
            if (permission.canAskAgain) {
                Alert.alert(
                    "Camera permission required",
                    "Allow camera access to take photos in chat.",
                );
                return;
            }

            Alert.alert(
                "Camera permission required",
                "Camera access is disabled. Enable it in Settings to take photos in chat.",
                [
                    {
                        text: "Not now",
                        style: "cancel",
                    },
                    {
                        text: "Open Settings",
                        onPress: openAppSettings,
                    },
                ],
            );
            return;
        }

        let result: ImagePicker.ImagePickerResult;

        try {
            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ["images"] as ImagePicker.MediaType[],
                allowsEditing: false,
                base64: true,
                quality: 1,
            });
        } catch (error) {
            console.warn("[Chat] launchCameraAsync failed:", error);
            const resolution = mapCameraLaunchError(error);
            const actions = [] as {
                text: string;
                style?: "default" | "cancel" | "destructive";
                onPress?: () => void;
            }[];

            if (resolution.allowLibraryFallback && remainingSlots > 0) {
                actions.push({
                    text: "Choose from Library",
                    onPress: () => {
                        void launchLibraryPicker(remainingSlots);
                    },
                });
            }

            if (resolution.allowOpenSettings) {
                actions.push({
                    text: "Open Settings",
                    onPress: openAppSettings,
                });
            }

            actions.push({
                text: "OK",
                style: "cancel",
            });

            Alert.alert(resolution.title, resolution.message, actions);
            return;
        }

        if (result.canceled || result.assets.length === 0) {
            return;
        }

        processSelectedAssets(result.assets);
    }, [ensureCameraPermission, launchLibraryPicker, mapCameraLaunchError, openAppSettings, processSelectedAssets]);

    const handleAddAttachment = useCallback(async () => {
        if (isInputLocked) {
            return;
        }

        if (pendingAttachments.length >= MAX_CHAT_ATTACHMENTS) {
            Alert.alert(
                "Attachment limit reached",
                `You can attach up to ${MAX_CHAT_ATTACHMENTS} items per message.`,
            );
            return;
        }

        const remainingSlots = MAX_CHAT_ATTACHMENTS - pendingAttachments.length;
        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ["Take Photo", "Choose from Library", "Cancel"],
                    cancelButtonIndex: 2,
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) {
                        void launchCameraPicker(remainingSlots);
                    } else if (buttonIndex === 1) {
                        void launchLibraryPicker(remainingSlots);
                    }
                },
            );
            return;
        }

        Alert.alert(
            "Add attachment",
            "Choose how you want to add media.",
            [
                {
                    text: "Take Photo",
                    onPress: () => {
                        void launchCameraPicker(remainingSlots);
                    },
                },
                {
                    text: "Choose from Library",
                    onPress: () => {
                        void launchLibraryPicker(remainingSlots);
                    },
                },
                {
                    text: "Cancel",
                    style: "cancel",
                },
            ],
        );
    }, [isInputLocked, launchCameraPicker, launchLibraryPicker, pendingAttachments.length]);

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
            setPendingAttachments([]);
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
                setPendingAttachments([]);
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
                              onRename={handleOpenRenameModal}
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
                                attachments={pendingAttachments}
                                onAddAttachment={handleAddAttachment}
                                onRemoveAttachment={handleRemoveAttachment}
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
                            attachments={pendingAttachments}
                            onAddAttachment={handleAddAttachment}
                            onRemoveAttachment={handleRemoveAttachment}
                            disabled={isInputLocked}
                            isStreaming={isStreaming}
                            onCancel={cancel}
                         />
                     </Animated.View>
                 )}

                 <Modal
                     animationType="fade"
                     transparent
                     visible={isRenameModalVisible}
                     onRequestClose={handleCloseRenameModal}
                 >
                     <KeyboardAvoidingView
                         behavior={isIos ? "translate-with-padding" : "padding"}
                         keyboardVerticalOffset={isIos ? -10 : 0}
                         className="flex-1"
                     >
                         <View
                             className="flex-1 justify-center px-6"
                             style={{ backgroundColor: "rgba(0, 0, 0, 0.35)" }}
                         >
                             <Pressable
                                 style={{
                                     position: "absolute",
                                     top: 0,
                                     left: 0,
                                     right: 0,
                                     bottom: 0,
                                 }}
                                 onPress={handleCloseRenameModal}
                             />

                             <View
                                 style={{
                                     backgroundColor: theme.colors.surface,
                                     borderColor: theme.colors.border,
                                     borderWidth: 1,
                                     borderRadius: 16,
                                     padding: 16,
                                 }}
                             >
                                 <Text
                                     style={{
                                         color: theme.colors.text,
                                         fontSize: 18,
                                         fontWeight: "600",
                                     }}
                                 >
                                     Rename Chat
                                 </Text>

                                 <Text
                                     style={{
                                         color: theme.colors.textSecondary,
                                         fontSize: 14,
                                         marginTop: 6,
                                         marginBottom: 12,
                                     }}
                                 >
                                     Choose a new title for this thread.
                                 </Text>

                                 <TextInput
                                     value={renameTitleDraft}
                                     onChangeText={setRenameTitleDraft}
                                     placeholder="Enter chat title"
                                     placeholderTextColor={theme.colors.textSecondary}
                                     autoFocus
                                     returnKeyType="done"
                                     onSubmitEditing={handleRenameSubmit}
                                     style={{
                                         borderColor: theme.colors.border,
                                         borderWidth: 1,
                                         borderRadius: 12,
                                         paddingHorizontal: 12,
                                         paddingVertical: isIos ? 10 : 8,
                                         color: theme.colors.text,
                                         backgroundColor: theme.colors.background,
                                     }}
                                     maxLength={120}
                                 />

                                 <View
                                     style={{
                                         flexDirection: "row",
                                         justifyContent: "flex-end",
                                         marginTop: 14,
                                     }}
                                 >
                                     <Pressable
                                         onPress={handleCloseRenameModal}
                                         style={{
                                             borderColor: theme.colors.border,
                                             borderWidth: 1,
                                             borderRadius: 10,
                                             paddingHorizontal: 12,
                                             paddingVertical: 8,
                                         }}
                                     >
                                         <Text style={{ color: theme.colors.text }}>Cancel</Text>
                                     </Pressable>

                                     <Pressable
                                         onPress={handleRenameSubmit}
                                         style={{
                                             marginLeft: 10,
                                             borderColor: theme.colors.accent,
                                             backgroundColor: theme.colors.accent,
                                             borderWidth: 1,
                                             borderRadius: 10,
                                             paddingHorizontal: 12,
                                             paddingVertical: 8,
                                         }}
                                     >
                                         <Text style={{ color: theme.colors.surface }}>Save</Text>
                                     </Pressable>
                                 </View>
                             </View>
                         </View>
                     </KeyboardAvoidingView>
                 </Modal>
             </View>
         </>
     );
}
