import useChat from "@/hooks/useChat";
import { GlassView } from "expo-glass-effect";
import { Stack } from "expo-router";
import React, { useEffect, useRef } from "react";
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

interface ChatProps {}

export default function Chat({}: ChatProps) {
    const { text, setText, messages, sendMessage, reset } = useChat();
    const listref = useRef<ScrollView>(null);

    useEffect(() => {
        const keyboard = Keyboard.addListener("keyboardDidShow", () =>
            listref.current?.scrollToEnd(),
        );
        return () => {
            keyboard.remove();
        };
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
                        headerTitle: "Chat",
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
