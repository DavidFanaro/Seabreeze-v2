import { chat } from "@/db/schema";
import useChat from "@/hooks/useChat";
import useDatabase from "@/hooks/useDatabase";
import { eq } from "drizzle-orm";
import { GlassView } from "expo-glass-effect";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Button,
    Keyboard,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Markdown } from "react-native-remark";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModelMessage } from "ai";

export default function Chat() {
    const db = useDatabase();
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
    const listref = useRef<ScrollView>(null);
    const params = useLocalSearchParams<{ id?: string }>();

    useEffect(() => {
        const update = async () => {
            await db
                .update(chat)
                .set({ messages: messages })
                .where(eq(chat.id, chatID));
        };

        if (isStreaming) {
            console.log("Currently Streaming");
        } else {
            update();
            if (title === "Chat") {
                generateTitle();
            }
        }
    }, [isStreaming]);

    useEffect(() => {
        const updateTitle = async () => {
            await db
                .update(chat)
                .set({ title: title })
                .where(eq(chat.id, chatID));
        };
        updateTitle();
    }, [title]);

    useEffect(() => {
        const keyboard = Keyboard.addListener("keyboardDidShow", () =>
            listref.current?.scrollToEnd(),
        );
        return () => {
            keyboard.remove();
        };
    }, []);

    useEffect(() => {
        const setupChat = async () => {
            if (params.id === "new") {
                if (messages.length === 0) {
                    const data = (
                        await db
                            .insert(chat)
                            .values({ messages: messages, title: "" })
                            .returning({ id: chat.id })
                    )[0];
                    setChatID(data.id);
                    console.log("Chat Created with ID: " + data.id);
                }
            } else {
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
        <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior={"padding"}
                keyboardVerticalOffset={10}
                style={{ flex: 1 }}
            >
                <Stack.Screen
                    options={{
                        headerTitle: title,
                        headerTransparent: true,
                        headerRight: () => (
                            <Button title="Reset" onPress={() => reset()} />
                        ),
                    }}
                />
                <ScrollView
                    style={{ flex: 1, paddingTop: 50 }}
                    ref={listref}
                    onContentSizeChange={() => {
                        listref.current?.scrollToEnd();
                    }}
                >
                    {messages.map((i, idx) =>
                        i.role === "user" ? (
                            <View key={idx} style={{ alignItems: "flex-end" }}>
                                <GlassView
                                    isInteractive
                                    style={{ margin: 5, borderRadius: 25 }}
                                >
                                    <Text
                                        selectable
                                        style={{ color: "white", padding: 12 }}
                                    >
                                        {i.content as string}
                                    </Text>
                                </GlassView>
                            </View>
                        ) : (
                            <Markdown
                                key={idx}
                                markdown={i.content as string}
                            />
                        ),
                    )}
                </ScrollView>
                <GlassView
                    isInteractive
                    style={{
                        flexDirection: "row",
                        marginHorizontal: 10,
                        padding: 10,
                        borderRadius: 25,
                        marginTop: 10,
                    }}
                >
                    <TextInput
                        style={{
                            flexGrow: 1,
                            flexShrink: 1,
                            color: "white",
                        }}
                        onChangeText={setText}
                        value={text}
                    />
                    <Button onPress={() => sendMessage()} title="Send" />
                </GlassView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
