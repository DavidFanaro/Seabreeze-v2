import { Link, Stack } from "expo-router";
import * as React from "react";
import { FlatList, SafeAreaView, View, Text } from "react-native";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import useDatabase from "@/hooks/useDatabase";
import { chat } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { IconButton, ChatListItem, useTheme } from "@/components";
import { ModelMessage } from "ai";
import Animated, { FadeIn } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";

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
    return content.length > 80 ? content.slice(0, 80) + "..." : content;
};

const EmptyState = () => {
    const { theme, themeType } = useTheme();

    return (
        <Animated.View
            entering={FadeIn.duration(400)}
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 40,
            }}
        >
            <View
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor:
                        themeType === "dark"
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.03)",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 20,
                }}
            >
                <SymbolView
                    name="bubble.left.and.bubble.right"
                    size={36}
                    tintColor={theme.colors.textSecondary}
                />
            </View>
            <Text
                style={{
                    color: theme.colors.text,
                    fontSize: 20,
                    fontWeight: "600",
                    marginBottom: 8,
                    textAlign: "center",
                }}
            >
                No Chats Yet
            </Text>
            <Text
                style={{
                    color: theme.colors.textSecondary,
                    fontSize: 15,
                    textAlign: "center",
                    lineHeight: 22,
                }}
            >
                Start a new conversation by tapping the + button above
            </Text>
        </Animated.View>
    );
};

export default function Home() {
    const db = useDatabase();
    const { theme } = useTheme();
    const chats = useLiveQuery(
        db.query.chat.findMany({
            orderBy: [desc(chat.updatedAt)],
        })
    );

    const deleteChat = async (id: number) => {
        await db.delete(chat).where(eq(chat.id, id));
    };

    const hasChats = chats.data && chats.data.length > 0;

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
                {hasChats ? (
                    <FlatList
                        style={{ flex: 1 }}
                        contentContainerStyle={{
                            flexGrow: 1,
                            paddingTop: 8,
                            paddingBottom: 20,
                        }}
                        data={chats.data}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <ChatListItem
                                id={item.id}
                                title={item.title}
                                preview={getPreview(item.messages)}
                                timestamp={item.updatedAt}
                                onDelete={deleteChat}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <EmptyState />
                )}
            </SafeAreaView>
        </View>
    );
}
