import { Link, router, Stack } from "expo-router";
import * as React from "react";
import { SafeAreaView, TouchableOpacity, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import useDatabase from "@/hooks/useDatabase";
import ChatCell from "@/components/ChatCell";
import { Host, Button, List, Text } from "@expo/ui/swift-ui";
import { eq } from "drizzle-orm";
import { chat } from "@/db/schema";

interface HomeProps {}

export default function Home({}: HomeProps) {
    const db = useDatabase();
    const chats = useLiveQuery(db.query.chat.findMany());

    return (
        <View style={{ flex: 1 }}>
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
            <SafeAreaView style={{ flex: 1 }}>
                <Host style={{ flex: 1 }}>
                    <List
                        scrollEnabled
                        onDeleteItem={async (i) =>
                            await db
                                .delete(chat)
                                .where(eq(chat.id, chats.data[i].id))
                        }
                        listStyle={"plain"}
                    >
                        {chats.data.map((i, idx) => (
                            <Link href={`/chat/${i.id}`} push asChild key={idx}>
                                <Button>
                                    {i.title !== "" ? i.title! : "No Title"}
                                </Button>
                            </Link>
                        ))}
                    </List>
                </Host>
            </SafeAreaView>
        </View>
    );
}
