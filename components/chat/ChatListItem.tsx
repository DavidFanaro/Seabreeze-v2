import React, { useEffect, useRef, useState } from "react";
import { Text, View, ViewStyle, Pressable } from "react-native";
import { useRouter } from "expo-router";
import ReanimatedSwipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";
import * as Haptics from "expo-haptics";
import Animated, { SharedValue, useAnimatedStyle, withSpring, interpolate } from "react-native-reanimated";

interface ChatListItemProps {
    id: number;
    title: string | null;
    preview?: string | null;
    timestamp?: Date | null;
    onDelete: (id: number) => void;
    isScreenFocused: boolean;
    style?: ViewStyle;
}

interface RightActionProps {
    dragX: SharedValue<number>;
    onPress: () => void;
    theme: ReturnType<typeof useTheme>["theme"];
}

const RightAction: React.FC<RightActionProps> = ({ dragX, onPress, theme }) => {
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(dragX.value, [-100, -50, 0], [1, 0.5, 0], "clamp"),
        transform: [{ scale: withSpring(1, { damping: 20, stiffness: 300 }) }],
    }));

    return (
        <Animated.View
            className="justify-center items-center mx-3"
            style={animatedStyle}
        >
            <Pressable
                onPress={onPress}
                className="justify-center items-center w-[44px] h-[44px] rounded-full"
                style={({ pressed }) => ({
                    backgroundColor: theme.colors.error,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                    shadowColor: theme.colors.error,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                })}
            >
                <SymbolView name="trash" size={20} tintColor={theme.colors.surface} />
            </Pressable>
        </Animated.View>
    );
};

export const ChatListItem: React.FC<ChatListItemProps> = ({
    id,
    title,
    preview,
    timestamp,
    onDelete,
    isScreenFocused,
    style,
}) => {
    const { theme } = useTheme();
    const swipeableRef = useRef<SwipeableMethods>(null);
    const router = useRouter();
    const [isPressed, setIsPressed] = useState(false);

    const displayPreview = preview || "No messages yet";

    const displayTime = timestamp
        ? (() => {
              const now = new Date();
              const diff = now.getTime() - timestamp.getTime();
              const minutes = Math.floor(diff / 60000);
              const hours = Math.floor(minutes / 60);
              const days = Math.floor(hours / 24);

              if (minutes < 1) return "Just now";
              if (minutes < 60) return `${minutes}m ago`;
              if (hours < 24) return `${hours}h ago`;
              if (days === 1) return "Yesterday";
              if (days < 7) return `${days}d ago`;
              return timestamp.toLocaleDateString();
          })()
        : null;

    const handleNavigate = () => {
        setIsPressed(false);
        router.push(`/chat/${id}`);
    };

    useEffect(() => {
        if (!isScreenFocused) {
            swipeableRef.current?.close();
            setIsPressed(false);
        }
    }, [isScreenFocused]);

    const renderRightActions = (_progress: SharedValue<number>, dragX: SharedValue<number>) => {
        return (
            <RightAction
                dragX={dragX}
                theme={theme}
                onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    onDelete(id);
                    swipeableRef.current?.close();
                }}
            />
        );
    };

    return (
        <View style={{ marginBottom: 10 }}>
            <ReanimatedSwipeable
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                overshootRight={false}
                friction={2}
                rightThreshold={40}
                enabled={isScreenFocused}
                containerStyle={{ backgroundColor: "transparent" }}
            >
                <Pressable
                    onPress={handleNavigate}
                    onPressIn={() => {
                        setIsPressed(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                    onPressOut={() => setIsPressed(false)}
                    className="px-2 pb-[14px] min-h-[85px] justify-center"
                    style={[style, { opacity: isPressed ? 0.6 : 1 }]}
                >
                    <View
                        className="p-3 rounded-lg min-h-[75px] justify-center border"
                        style={{
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.glass,
                            shadowColor: theme.colors.text,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 5,
                        }}
                    >
                        {/* Header row with title and timestamp */}
                        <View className="flex-row justify-between items-center mb-2">
                            <View className="flex-row items-center flex-1">
                                <Text
                                    className="text-[16px] font-bold flex-1 mr-2 tracking-tight"
                                    style={{ color: theme.colors.text, letterSpacing: -0.3 }}
                                    numberOfLines={1}
                                >
                                    {title || "New Chat"}
                                </Text>
                            </View>
                            {displayTime ? (
                                <Text
                                    className="text-[11px] font-medium px-1.5 py-0.5 rounded overflow-hidden"
                                    style={{
                                        color: theme.colors.textSecondary,
                                        backgroundColor: theme.colors.glass,
                                    }}
                                >
                                    {displayTime}
                                </Text>
                            ) : null}
                        </View>

                        {/* Preview text */}
                        <Text
                            className="text-[14px] mt-0.5 leading-[18px]"
                            style={{ color: theme.colors.textSecondary }}
                            numberOfLines={2}
                        >
                            {displayPreview}
                        </Text>
                    </View>
                </Pressable>
            </ReanimatedSwipeable>
        </View>
    );
};
