import { router, Stack } from "expo-router";
import * as React from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";

export default function Settings() {
    return (
        <View>
            <Stack.Screen
                options={{
                    headerTitle: "Settings",
                    headerTransparent: true,
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => {
                                router.dismiss();
                            }}
                        >
                            <AntDesign
                                style={{ marginLeft: 6 }}
                                name="close"
                                size={24}
                                color="white"
                            />
                        </TouchableOpacity>
                    ),
                }}
            />
            <SafeAreaView>
                <Text style={{ color: "white" }}>Settings</Text>
            </SafeAreaView>
        </View>
    );
}
