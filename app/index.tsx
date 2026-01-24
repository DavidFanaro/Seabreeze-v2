import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { FlatList, View, Text } from "react-native";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useIsFocused } from "@react-navigation/native";
import useDatabase from "@/hooks/useDatabase";
import { chat } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { IconButton, ChatListItem, useTheme } from "@/components";
import { ModelMessage } from "ai";
import Animated, { FadeIn } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";

export const getPreview = (messages: unknown): string | null => {
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
  const { theme } = useTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      className="flex-1 justify-center items-center px-10"
    >
      <View
        className="w-20 h-20 rounded-full justify-center items-center mb-5"
        style={{
          backgroundColor: theme.colors.glass,
        }}
      >
        <SymbolView
          name="bubble.left.and.bubble.right"
          size={36}
          tintColor={theme.colors.textSecondary}
        />
      </View>
      <Text
        className="text-[20px] font-bold mb-2 text-center"
        style={{ color: theme.colors.text }}
      >
        No Chats Yet
      </Text>
      <Text
        className="text-[15px] text-center leading-[22px]"
        style={{ color: theme.colors.textSecondary }}
      >
        Start a new conversation by tapping + button above
      </Text>
    </Animated.View>
  );
};

export default function Home() {
  const db = useDatabase();
  const { theme } = useTheme();
  const router = useRouter();
  const isScreenFocused = useIsFocused();
  
  const chats = useLiveQuery(
    db.query.chat.findMany({
      orderBy: [desc(chat.updatedAt)],
    }),
  );

  const deleteChat = async (id: number) => {
    await db.delete(chat).where(eq(chat.id, id));
  };

  const hasChats = chats.data && chats.data.length > 0;

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Stack.Screen
        options={{
          title: "Chats",
          headerTransparent: true,
          headerTintColor: theme.colors.text,
          headerRight: () => (
            <IconButton
              icon="plus"
              onPress={() => router.push("/chat/new")}
              style={{ marginLeft: 4 }}
            />
          ),
          headerLeft: () => (
            <IconButton
              icon="gear"
              onPress={() => router.push("/settings")}
              style={{ marginLeft: 5 }}
            />
          ),
        }}
      />
      <View className="flex-1">
        {hasChats ? (
          <FlatList
            className="flex-1"
            contentContainerClassName="flex-grow pt-[125px] pb-5"
            data={chats.data}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ChatListItem
                id={item.id}
                title={item.title}
                preview={getPreview(item.messages)}
                timestamp={item.updatedAt}
                onDelete={deleteChat}
                isScreenFocused={isScreenFocused}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState />
        )}
      </View>
    </View>
  );
}
