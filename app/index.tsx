import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, View } from "react-native";
import ChatBtn from "@/components/ChatButton/Chatbtn";
import ChatBubble, { roles } from "@/components/ChatBubble.tsx/ChatBubble";
import { Input, InputField } from "@/components/ui/input";
import {
  KeyboardAvoidingView,
  KeyboardGestureArea,
} from "react-native-keyboard-controller";
import { ChatMessage } from "../util/types";
import uuid from "react-native-uuid";
import { testdata } from "@/util/testdata";
import { ModelMessage, streamText } from "ai";
import { apple } from "@react-native-ai/apple";

export default function Index() {
  const [text, setText] = useState("");
  // const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messages, setMessages] = useState<ModelMessage[]>([]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const userMessage: ModelMessage = {
      role: "user",
      content: text.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setText("");

    const messageIdx = updatedMessages.length;

    setMessages([
      ...updatedMessages,
      {
        role: "assistant",
        content: "...",
      },
    ]);

    let accumulatedContent = "";

    try {
      const result = streamText({
        model: apple(),
        messages: updatedMessages,
      });

      for await (const chunk of result.textStream) {
        accumulatedContent += chunk;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[messageIdx] = {
            role: "assistant",
            content: accumulatedContent,
          };
          return newMessages;
        });
      }
    } catch (error) {
      const errorMessage = `Error: ${error instanceof Error ? error.message : "Failed to generate response"}`;
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[messageIdx] = {
          role: "assistant",
          content: errorMessage,
        };
        return newMessages;
      });
    }
  };

  return (
    <KeyboardGestureArea
      interpolator="ios"
      offset={50}
      textInputNativeID="composer"
      style={{ flex: 1, backgroundColor: "gray" }}
    >
      <KeyboardAvoidingView
        behavior="translate-with-padding"
        keyboardVerticalOffset={100}
        style={{ flex: 1, gap: 0 }}
      >
        <FlatList
          keyboardDismissMode="interactive"
          data={messages}
          renderItem={(i) =>
            i.item.role === "assistant" ? (
              <ChatBubble message={i.item.content as string} role="AI" />
            ) : (
              <ChatBubble message={i.item.content as string} role="User" />
            )
          }
        />

        <View className="mx-5 mb-8 mt-3 flex-row gap-2">
          <Input className="flex-grow flex-shrink">
            <InputField
              value={text}
              onChangeText={setText}
              nativeID="composer"
            />
          </Input>
          <ChatBtn onClick={sendMessage} />
        </View>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
}
