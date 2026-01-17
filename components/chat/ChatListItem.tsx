import React, { useRef } from "react";
import { Text, View, ViewStyle, Pressable, Animated } from "react-native";
import { Link } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";
import * as Haptics from "expo-haptics";

interface ChatListItemProps {
    id: number;
    title: string | null;
    preview?: string | null;
    timestamp?: Date | null;
    onDelete: (id: number) => void;
    style?: ViewStyle;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
    id,
    title,
    preview,
    timestamp,
    onDelete,
    style,
}) => {
    const { theme } = useTheme();
    const swipeableRef = useRef<Swipeable>(null);
    const scaleValue = useRef(new Animated.Value(1)).current;
    const fadeValue = useRef(new Animated.Value(0)).current;
    const pressOpacity = useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        Animated.timing(fadeValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

        const deleteScale = useRef(new Animated.Value(0.8)).current;
    
    React.useEffect(() => {
        Animated.spring(deleteScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 8,
        }).start();
    }, []);

    const renderRightActions = (_: any, dragX: Animated.AnimatedAddition<number>) => {
        return (
            <Animated.View
                className="justify-center items-center mx-3"
                style={[
                    { transform: [{ scale: deleteScale }] },
                    {
                        opacity: dragX.interpolate({
                            inputRange: [-100, -50, 0],
                            outputRange: [1, 0.5, 0],
                            extrapolate: "clamp",
                        }),
                    },
                ]}
            >
                <Pressable
                    onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        onDelete(id);
                        swipeableRef.current?.close();
                    }}
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
                    <SymbolView name="trash" size={20} tintColor="#ffffff" />
                </Pressable>
            </Animated.View>
        );
    };

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

    const handlePressIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.parallel([
            Animated.spring(scaleValue, {
                toValue: 0.95,
                useNativeDriver: true,
                tension: 80,
                friction: 5,
            }),
            Animated.timing(pressOpacity, {
                toValue: 0.85,
                duration: 80,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.spring(scaleValue, {
                toValue: 1.05,
                useNativeDriver: true,
                tension: 120,
                friction: 4,
            }),
            Animated.timing(pressOpacity, {
                toValue: 1,
                duration: 120,
                useNativeDriver: true,
            }),
        ]).start();
        
        // Reset the bounce back to normal after overshoot
        setTimeout(() => {
            Animated.spring(scaleValue, {
                toValue: 1,
                useNativeDriver: true,
                tension: 200,
                friction: 8,
            }).start();
        }, 100);
    };

    const slideValue = useRef(new Animated.Value(-20)).current;
    const progressValue = useRef(new Animated.Value(0)).current;
    
    React.useEffect(() => {
        Animated.timing(slideValue, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            delay: 100,
        }).start();

        Animated.timing(progressValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            delay: 300,
        }).start();
    }, []);

    return (
        <Animated.View style={{ opacity: Animated.multiply(fadeValue, pressOpacity) }}>
            <Swipeable
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                overshootRight={false}
                friction={2}
                rightThreshold={40}
                containerStyle={{ marginBottom: 10 }}
                childrenContainerStyle={{
                    backgroundColor: "transparent",
                }}
            >
                <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                    <Link href={`/chat/${id}`} push asChild>
                        <Pressable
                            onPressIn={handlePressIn}
                            onPressOut={handlePressOut}
                            className="px-2 pb-[14px] min-h-[85px] justify-center"
                            style={style}
                        >
                        <Animated.View
                            style={{
                                transform: [{ translateY: slideValue }],
                            }}
                        >
                            <View
                                className="p-3 rounded-lg min-h-[75px] justify-center border"
                                style={{
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.glass,
                                    shadowColor: "#000",
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
                                        <Animated.View
                                            style={{
                                                opacity: fadeValue.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, 1],
                                                }),
                                            }}
                                        >
                                            <Text
                                                className="text-[11px] font-medium px-1.5 py-0.5 rounded overflow-hidden"
                                                style={{
                                                    color: theme.colors.textSecondary,
                                                    backgroundColor: theme.colors.glass,
                                                }}
                                            >
                                                {displayTime}
                                            </Text>
                                        </Animated.View>
                                    ) : null}
                                </View>

                                {/* Preview text */}
                                <Animated.View
                                    style={{
                                        opacity: fadeValue.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 0.8],
                                        }),
                                    }}
                                >
                                    <Text
                                        className="text-[14px] mt-0.5 leading-[18px]"
                                        style={{ color: theme.colors.textSecondary }}
                                        numberOfLines={2}
                                    >
                                        {displayPreview}
                                    </Text>
                                </Animated.View>
                                
                                
                            </View>
                        </Animated.View>
                        </Pressable>
                    </Link>
                </Animated.View>
            </Swipeable>
        </Animated.View>
    );
};
