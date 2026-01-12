import { chat } from "@/db/schema";
import useChat from "@/hooks/useChat";
import useDatabase from "@/hooks/useDatabase";
import { eq } from "drizzle-orm";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModelMessage } from "ai";
import { MessageList, MessageInput, useTheme, IconButton } from "@/components";

export default function Chat() {
    const db = useDatabase();
    const { theme } = useTheme();
    const [chatID, setChatID] = useState(0);
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
    } = useChat();
    const params = useLocalSearchParams<{ id?: string }>();

    const handleReset = () => {
        reset();
    };

    const sendChatMessages = async () => {
        sendMessage();
    };

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
                                createdAt: now,
                                updatedAt: now,
                            })
                            .returning({ id: chat.id })
                    )[0];
                    setChatID(data.id);
                    console.log("Chat Created with ID: " + data.id);
                }
            } else {
                // Existing chat - update messages
                await db
                    .update(chat)
                    .set({ messages: messages, updatedAt: now })
                    .where(eq(chat.id, chatID));
            }
        };

        if (isStreaming) {
            console.log("Currently Streaming");
        } else {
            saveOrUpdate();
            if (!title || title === "Chat") {
                generateTitle();
            }
        }
    }, [isStreaming]);

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
    }, [title]);

    useEffect(() => {
        const setupChat = async () => {
            if (params.id !== "new") {
                const id = Number(params.id);
                const data = await db
                    .select()
                    .from(chat)
                    .where(eq(chat.id, id))
                    .all()[0];
                setMessages(data.messages as ModelMessage[]);
                setTitle(data.title as string);
                setChatID(id);
                console.log(`Chat: ${params.id}`);
            }
        };
        setupChat();
    }, []);

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: title,
                    headerTransparent: true,

                    headerRight: () => (
                        <IconButton icon="arrow.clockwise" onPress={handleReset} size={22} />
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
