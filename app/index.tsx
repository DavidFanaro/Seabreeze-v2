import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { FlatList, View, Text } from "react-native";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useIsFocused } from "@react-navigation/native";
import useDatabase from "@/hooks/useDatabase";
import { chat } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { IconButton, ChatListItem, useTheme } from "@/components";
import { normalizeTitleForPersistence } from "@/lib/chat-title";
import {
  acquireChatDeleteLock,
  isChatDeleteLocked,
  runChatOperation,
  runListOperation,
} from "@/lib/chat-persistence-coordinator";
import Animated, { FadeIn } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { getMessagePreviewText } from "@/lib/chat-content-parts";
import {
  failPersistenceOperation,
  startPersistenceOperation,
  succeedPersistenceOperation,
  type PersistenceOperationContext,
} from "@/lib/persistence-telemetry";

interface ChatListRow {
  id: number;
  title: string | null;
  preview: string | null;
  timestamp: Date | null;
}

const REFRESH_ERROR_MESSAGE = "Couldn't refresh chats right now. Pull to retry.";
const PARTIAL_ROW_MESSAGE = "Some chats could not be displayed.";

export const getPreview = (messages: unknown): string | null => {
  try {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return null;
    }

    const lastMessage = messages[messages.length - 1] as { content?: unknown };
    if (!lastMessage?.content) return null;

    return getMessagePreviewText(lastMessage.content);
  } catch {
    return null;
  }
};

const coerceTimestamp = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const normalizeChatRow = (row: unknown): ChatListRow | null => {
  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id =
    typeof record.id === "number"
      ? record.id
      : typeof record.id === "string"
        ? Number(record.id)
        : NaN;

  if (!Number.isFinite(id)) {
    return null;
  }

  return {
    id,
    title: typeof record.title === "string" ? normalizeTitleForPersistence(record.title) : null,
    preview: getPreview(record.messages),
    timestamp: coerceTimestamp(record.updatedAt),
  };
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

  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);
  const [deletingIds, setDeletingIds] = React.useState<Set<number>>(new Set());
  const listQueryOperationRef = React.useRef<PersistenceOperationContext | null>(null);

  // Live query: Fetches all chats ordered by most recently updated
  // Automatically re-renders when chat data changes
  const chatsQuery = useLiveQuery(
    db
      .select()
      .from(chat)
      .orderBy(desc(chat.updatedAt)),
    [refreshNonce],
  );

  // Delete handler: Removes a chat from database by ID
  const deleteChat = React.useCallback(async (id: number) => {
    await runListOperation(async () => {
      if (isChatDeleteLocked(id)) {
        return;
      }

      const releaseDeleteLock = acquireChatDeleteLock(id);
      setDeletingIds((current) => {
        const next = new Set(current);
        next.add(id);
        return next;
      });

      try {
        await runChatOperation(String(id), async () => {
          await db.delete(chat).where(eq(chat.id, id));
        }, "list");
      } finally {
        releaseDeleteLock();
        setDeletingIds((current) => {
          if (!current.has(id)) {
            return current;
          }

          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    });
  }, [db]);

  const openChat = React.useCallback((id: number) => {
    if (isChatDeleteLocked(id)) {
      return;
    }

    router.push(`/chat/${id}`);
  }, [router]);

  const openNewChat = React.useCallback(() => {
    router.push("/chat/new");
  }, [router]);

  const chatRows = React.useMemo(() => {
    if (!Array.isArray(chatsQuery.data)) {
      return [] as ChatListRow[];
    }

    return chatsQuery.data
      .map((row) => normalizeChatRow(row))
      .filter((row): row is ChatListRow => row !== null);
  }, [chatsQuery.data]);

  const droppedRowCount = React.useMemo(() => {
    if (!Array.isArray(chatsQuery.data)) {
      return 0;
    }

    return chatsQuery.data.length - chatRows.length;
  }, [chatRows.length, chatsQuery.data]);

  React.useEffect(() => {
    listQueryOperationRef.current = startPersistenceOperation("list", {
      refreshNonce,
      isScreenFocused,
    });
  }, [refreshNonce, isScreenFocused]);

  React.useEffect(() => {
    const operation = listQueryOperationRef.current;
    if (!operation) {
      return;
    }

    if (chatsQuery.error) {
      failPersistenceOperation(operation, chatsQuery.error, {
        refreshNonce,
      });
      listQueryOperationRef.current = null;
      return;
    }

    if (Array.isArray(chatsQuery.data)) {
      succeedPersistenceOperation(operation, {
        refreshNonce,
        rowCount: chatsQuery.data.length,
        normalizedRowCount: chatRows.length,
        droppedRowCount,
      });
      listQueryOperationRef.current = null;
    }
  }, [chatRows.length, chatsQuery.data, chatsQuery.error, droppedRowCount, refreshNonce]);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      await runListOperation(async () => {
        setRefreshNonce((current) => current + 1);
        await db
          .select()
          .from(chat)
          .orderBy(desc(chat.updatedAt));
      });
    } catch {
      setRefreshError(REFRESH_ERROR_MESSAGE);
    } finally {
      setIsRefreshing(false);
    }
  }, [db]);

  const bannerMessage =
    refreshError ||
    (chatsQuery.error ? REFRESH_ERROR_MESSAGE : null) ||
    (droppedRowCount > 0 ? PARTIAL_ROW_MESSAGE : null);

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
              onPress={openNewChat}
              testID="chat-list-new-chat-button"
              accessibilityLabel="Start new chat"
              style={{ marginLeft: 6 }}
            />
          ),
          // Left button: Settings gear icon to access settings
          headerLeft: () => (
            <IconButton
              icon="gear"
              onPress={() => router.push("/settings")}
              testID="chat-list-settings-button"
              accessibilityLabel="Open settings"
              style={{ marginLeft: 6 }}
            />
          ),
        }}
      />

      {/* Content section: Conditional rendering of chat list or empty state */}
      <View className="flex-1">
        {bannerMessage ? (
          <View className="px-5 pt-[110px] pb-2">
            <Text
              className="text-[13px] leading-[18px]"
              style={{ color: theme.colors.textSecondary }}
            >
              {bannerMessage}
            </Text>
          </View>
        ) : null}

        <FlatList
          className="flex-1"
          contentContainerClassName="flex-grow pt-[125px] pb-5"
          data={chatRows}
          keyExtractor={(item) => item.id.toString()}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          // Each list item: Chat preview with delete capability
          renderItem={({ item }) => (
            <ChatListItem
              id={item.id}
              title={item.title}
              preview={item.preview}
              timestamp={item.timestamp}
              onDelete={deleteChat}
              onOpen={openChat}
              isDeleting={deletingIds.has(item.id)}
              isScreenFocused={isScreenFocused}
            />
          )}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}
