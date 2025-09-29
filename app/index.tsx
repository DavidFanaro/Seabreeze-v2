import useChat from "@/hooks/useChat";
import {
  FlatList,
  Keyboard,
  ScrollView,
  View,
  VirtualizedList,
} from "react-native";
import ChatBtn from "@/components/ChatButton/Chatbtn";
import ChatBubble from "@/components/ChatBubble.tsx/ChatBubble";
import { Input, InputField } from "@/components/ui/input";
import {
  KeyboardAvoidingView,
  KeyboardGestureArea,
} from "react-native-keyboard-controller";
import { useEffect, useRef } from "react";
import Animated from "react-native-reanimated";
import { ModelMessage } from "ai";

export default function Index() {
  const { text, setText, messages, sendMessage } = useChat();
  const listRef = useRef<ScrollView>(null);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      "keyboardWillShow",
      () => {
        listRef.current?.scrollToEnd({ animated: true });
      },
    );
    return () => {
      keyboardWillShowListener.remove();
    };
  }, []);

  return (
    <Animated.View className="flex-1">
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
          {/*<FlatList
            data={messages}
            keyboardDismissMode="interactive"
            ref={listRef}
            onContentSizeChange={() => {
              if (listRef.current) {
                listRef.current.scrollToEnd();
              }
            }}
            style={{ flex: 1 }}
            renderItem={(i) => (
              <ChatBubble
                role={
                  (i.item as ModelMessage).role === "assistant" ? "AI" : "User"
                }
                message={(i.item as ModelMessage).content as string}
              />
            )}
          />*/}
          <ScrollView
            keyboardDismissMode="interactive"
            ref={listRef}
            onContentSizeChange={() => {
              if (listRef.current) {
                listRef.current.scrollToEnd();
              }
            }}
            style={{ flex: 1 }}
          >
            {messages.map((mes, i) => (
              <ChatBubble
                key={i}
                role={mes.role === "assistant" ? "AI" : "User"}
                message={mes.content as string}
              />
            ))}
          </ScrollView>

          <View className="mx-5 mb-8 mt-3 flex-row gap-2">
            <Input className="flex-grow flex-shrink">
              <InputField
                value={text}
                onChangeText={setText}
                nativeID="composer"
              />
            </Input>
            <ChatBtn
              onClick={() => {
                Keyboard.dismiss();
                sendMessage();
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </KeyboardGestureArea>
    </Animated.View>
  );
}
