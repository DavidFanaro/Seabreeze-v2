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
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addAIMessage = async () => {
    const mesUUID = uuid.v4();
    const i: ModelMessage[] = messages.flatMap((e) => ({
      role: e.role === "AI" ? "assistant" : "user",
      content: [{ type: "text", text: e.message }],
    }));
    if (i.length !== 0) {
      try {
        const result = streamText({
          model: apple(),
          messages: i,
        });
        setMessages([
          ...messages,
          {
            id: mesUUID,
            role: "AI",
            message: "",
          },
        ]);
        const lastMesIdx = messages.length;
        let buffer = "";
        for await (const textPart of result.textStream) {
          buffer += textPart;
          setMessages((e) => {
            const mes = [...e];
            mes[lastMesIdx] = {
              id: mesUUID,
              role: "AI",
              message: buffer,
            };
            return mes;
          });
        }
      } catch (e) {
        console.log(e);
      }
    }
  };

  const sendUserMessage = () => {
    setMessages([
      ...messages,
      {
        id: uuid.v4(),
        role: "User",
        message: text,
      },
    ]);
    setText("");
    addAIMessage();
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
          inverted
          data={messages}
          renderItem={(i) =>
            i.item.role === "AI" ? (
              <ChatBubble message={i.item.message} role="AI" />
            ) : (
              <ChatBubble message={i.item.message} role="User" />
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
          <ChatBtn onClick={sendUserMessage} />
        </View>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
}
