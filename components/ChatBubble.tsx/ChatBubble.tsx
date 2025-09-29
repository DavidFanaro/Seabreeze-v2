import { DarkTheme } from "@react-navigation/native";
import * as React from "react";
import { View, Text } from "react-native";
import Markdown, { MarkedStyles } from "react-native-marked";

export type roles = "User" | "AI";

interface ChatBubbleProps {
  role: roles;
  message: string;
}

export default function ChatBubble({ role, message }: ChatBubbleProps) {
  switch (role) {
    case "User":
      return <UserBubble message={message} />;
    case "AI":
      return <AiBubble message={message} />;
  }
}

interface AiBubbleProps {
  message: string;
}

function AiBubble({ message }: AiBubbleProps) {
  return (
    <View className="flex-grow">
      <Markdown styles={{ em: { paddingHorizontal: 3 } }} value={message} />
    </View>
  );
}

interface UserBubbleProps {
  message: string;
}

function UserBubble({ message }: UserBubbleProps) {
  return (
    <View className="flex-auto ">
      <View className="self-end max-w-[85%] my-1">
        <View className="bg-slate-700 rounded-lg px-3 py-2">
          <Text className="text-white">{message}</Text>
        </View>
      </View>
    </View>
  );
}
