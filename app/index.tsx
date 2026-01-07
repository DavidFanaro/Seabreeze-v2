import { Link, Stack } from "expo-router";
import * as React from "react";
import { FlatList, SafeAreaView, View } from "react-native";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import useDatabase from "@/hooks/useDatabase";
import { chat } from "@/db/schema";
import { eq } from "drizzle-orm";
import { IconButton, ChatListItem, useTheme } from "@/components";
import { ModelMessage } from "ai";

const getPreview = (messages: unknown): string | null => {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return null;
    }
    const lastMessage = messages[messages.length - 1] as ModelMessage;
    if (!lastMessage?.content) return null;
    const content =
        typeof lastMessage.content === "string"
            ? lastMessage.content
            : String(lastMessage.content);
    return content.length > 50 ? content.slice(0, 50) + "..." : content;
};

export default function Home() {
    const db = useDatabase();
    const { theme } = useTheme();
    const chats = useLiveQuery(db.query.chat.findMany());

    const deleteChat = async (id: number) => {
        await db.delete(chat).where(eq(chat.id, id));
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Stack.Screen
                options={{
                    title: "Chats",
                    headerTransparent: true,
                    headerRight: () => (
                        <Link href="/chat/new" push asChild>
                            <IconButton
                                icon="plus"
                                onPress={() => {}}
                                style={{ marginLeft: 4 }}
                            />
                        </Link>
                    ),
                    headerLeft: () => (
                        <Link href="/settings" push asChild>
                            <IconButton
                                icon="gear"
                                onPress={() => {}}
                                style={{ marginLeft: 5 }}
                            />
                        </Link>
                    ),
                }}
            />
            <SafeAreaView style={{ flex: 1 }}>
                <FlatList
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1 }}
                    data={chats.data}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <ChatListItem
                            id={item.id}
                            title={item.title}
                            preview={getPreview(item.messages)}
                            onDelete={deleteChat}
                        />
                    )}
                />
            </SafeAreaView>
        </View>
    );
}
