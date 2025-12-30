import { Link, router, Stack } from "expo-router";
import * as React from "react";
import { Button, SafeAreaView, TouchableOpacity, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import useDatabase from "@/hooks/useDatabase";

interface HomeProps {}

export default function Home({}: HomeProps) {
    const db = useDatabase();
    const chats = useLiveQuery(db.query.chat.findMany());

    return (
        <View>
            <Stack.Screen
                options={{
                    title: "Chats",
                    headerTransparent: true,
                    headerRight: () => (
                        <Link href="/chat/new" push asChild>
                            <TouchableOpacity>
                                <MaterialIcons
                                    style={{ marginLeft: 4 }}
                                    name="add"
                                    size={26}
                                    color="white"
                                />
                            </TouchableOpacity>
                        </Link>
                    ),
                    headerLeft: () => (
                        <Link href="/settings" push asChild>
                            <TouchableOpacity>
                                <EvilIcons
                                    style={{ marginLeft: 5 }}
                                    name="gear"
                                    size={26}
                                    color="white"
                                />
                            </TouchableOpacity>
                        </Link>
                    ),
                }}
            />
            <SafeAreaView></SafeAreaView>
        </View>
    );
}
