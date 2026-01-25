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

/**
 * EmptyState Component
 * Displays a friendly message when no chats exist
 * Features:
 * - Fade-in animation on render (400ms duration)
 * - Centered layout with icon, title, and description
 * - Responsive to theme colors
 */
const EmptyState = () => {
  const { theme } = useTheme();

  return (
    // Root container: Animated view with fade-in effect, centered content
    <Animated.View
      entering={FadeIn.duration(400)}
      className="flex-1 justify-center items-center px-10"
    >
      {/* Icon section: Circular container with chat bubble icon */}
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

      {/* Title section: Main heading "No Chats Yet" */}
      <Text
        className="text-[20px] font-bold mb-2 text-center"
        style={{ color: theme.colors.text }}
      >
        No Chats Yet
      </Text>

      {/* Description section: Instructional text guiding user to create a new chat */}
      <Text
        className="text-[15px] text-center leading-[22px]"
        style={{ color: theme.colors.textSecondary }}
      >
        Start a new conversation by tapping + button above
      </Text>
    </Animated.View>
  );
};

/**
 * Home Screen Component
 * Main chat list screen displaying all user conversations
 * Features:
 * - Live query database sync with automatic updates
 * - Header with navigation buttons (settings + new chat)
 * - Scrollable list of chats or empty state message
 * - Swipe-to-delete functionality on chat items
 */
export default function Home() {
  // Database hook for direct access to SQLite
  const db = useDatabase();
  // Theme hook for consistent styling across the app
  const { theme } = useTheme();
  // Router for navigation between screens
  const router = useRouter();
  // Track if screen is currently focused (for optimizing updates)
  const isScreenFocused = useIsFocused();

  // Live query: Fetches all chats ordered by most recently updated
  // Automatically re-renders when chat data changes
  const chats = useLiveQuery(
    db.query.chat.findMany({
      orderBy: [desc(chat.updatedAt)],
    }),
  );

  // Delete handler: Removes a chat from database by ID
  const deleteChat = async (id: number) => {
    await db.delete(chat).where(eq(chat.id, id));
  };

  // Derived state: Determines if any chats exist
  const hasChats = chats.data && chats.data.length > 0;

  return (
    // Root container: Full-screen view with background color from theme
    <View
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
    >
      {/* Header section: Navigation bar with title and action buttons */}
      <Stack.Screen
        options={{
          title: "Chats",
          headerTransparent: true,
          headerTintColor: theme.colors.text,
          // Right button: "+" icon to create new chat
          headerRight: () => (
            <IconButton
              icon="plus"
              onPress={() => router.push("/chat/new")}
              style={{ marginLeft: 6 }}
            />
          ),
          // Left button: Settings gear icon to access settings
          headerLeft: () => (
            <IconButton
              icon="gear"
              onPress={() => router.push("/settings")}
              style={{ marginLeft: 6 }}
            />
          ),
        }}
      />

      {/* Content section: Conditional rendering of chat list or empty state */}
      <View className="flex-1">
        {hasChats ? (
          // Chat list: Scrollable list of chat conversations
          // Shows most recent chats at the top
          <FlatList
            className="flex-1"
            contentContainerClassName="flex-grow pt-[125px] pb-5"
            data={chats.data}
            keyExtractor={(item) => item.id.toString()}
            // Each list item: Chat preview with delete capability
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
          // Empty state: Friendly message when no chats exist
          <EmptyState />
        )}
      </View>
    </View>
  );
}
