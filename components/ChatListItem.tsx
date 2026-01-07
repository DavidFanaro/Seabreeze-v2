import React from "react";
import { TouchableOpacity, Text, View, ViewStyle } from "react-native";
import { Link } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
import { SymbolView } from "expo-symbols";
import { useTheme } from "./ThemeProvider";

interface ChatListItemProps {
    id: number;
    title: string | null;
    preview?: string | null;
    onDelete: (id: number) => void;
    style?: ViewStyle;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
    id,
    title,
    preview,
    onDelete,
    style,
}) => {
    const { theme } = useTheme();

    const renderRightActions = () => (
        <View
            style={{
                justifyContent: "center",
                alignItems: "center",
                marginHorizontal: 12,
            }}
        >
            <TouchableOpacity
                onPress={() => onDelete(id)}
                style={{
                    backgroundColor: theme.colors.error,
                    justifyContent: "center",
                    alignItems: "center",
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                }}
            >
                <SymbolView name="trash" size={20} tintColor="#ffffff" />
            </TouchableOpacity>
        </View>
    );

    const displayPreview = preview || "No messages yet";

    return (
        <Swipeable
            renderRightActions={renderRightActions}
            overshootRight={false}
        >
            <Link href={`/chat/${id}`} push asChild>
                <TouchableOpacity
                    style={[
                        {
                            padding: theme.spacing.sm,
                            backgroundColor: theme.colors.background,
                            minHeight: 70,
                            justifyContent: "center",
                        },
                        style,
                    ]}
                >
                    <View
                        style={{
                            padding: theme.spacing.md,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            borderRadius: 8,
                            marginBottom: 10,
                        }}
                    >
                        <Text
                            style={{
                                color: theme.colors.text,
                                fontSize: 16,
                                fontWeight: "600",
                            }}
                            numberOfLines={1}
                        >
                            {title || "No Title"}
                        </Text>
                        <Text
                            style={{
                                color: theme.colors.textSecondary,
                                fontSize: 14,
                                marginTop: 4,
                            }}
                            numberOfLines={1}
                        >
                            {displayPreview}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Link>
        </Swipeable>
    );
};
