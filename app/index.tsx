import { Button, ButtonIcon } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import useKeyBoardHandlerIOS from "@/hooks/useKeyBoardHandler";
import { useEffect, useRef, useState } from "react";
import { FlatList, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { CircleArrowUp } from "lucide-react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import ChatBtn from "@/components/ChatButton/Chatbtn";
import ChatBubble, { roles } from "@/components/ChatBubble.tsx/ChatBubble";
import { useKeyboardHandler } from "react-native-keyboard-controller";

const testdata = [
  {
    id: "0",
    role: "User" as roles,
    message: "Hello World",
  },
  {
    id: "1",
    role: "AI" as roles,
    message: `# Markdown syntax guide

    ## Headers

    # This is a Heading h1
    ## This is a Heading h2
    ###### This is a Heading h6

    ## Emphasis

    *This text will be italic*
    _This will also be italic_

    **This text will be bold**
    __This will also be bold__

    _You **can** combine them_`,
  },
  {
    id: "2",
    role: "User" as roles,
    message: "Can you summarize the following article for me?",
  },
  {
    id: "3",
    role: "AI" as roles,
    message: `Sure — here's a brief summary:

- Main point: The article explains how to manage state in React Native apps.
- Key techniques: useState, useReducer, Context, third-party state managers.
- Recommendation: Start small, lift state up when needed, then consider Context or Redux for global state.

Would you like a code example?`,
  },
  {
    id: "4",
    role: "User" as roles,
    message: "Please show an example of a useReducer counter with TypeScript.",
  },
  {
    id: "5",
    role: "AI" as roles,
    message: `Here's a simple example:

\`\`\`ts
type State = { count: number };
type Action = { type: 'increment' } | { type: 'decrement' } | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    case 'reset':
      return { count: 0 };
    default:
      return state;
  }
}
\`\`\`

This shows the basic pattern you can adapt for your app.`,
  },
  {
    id: "6",
    role: "User" as roles,
    message: "Include an example with asynchronous actions and side effects.",
  },
  {
    id: "7",
    role: "AI" as roles,
    message: `You can combine useReducer with useEffect for side effects:

\`\`\`ts
// pseudo-code
useEffect(() => {
  async function fetchData() {
    dispatch({ type: 'loading' });
    try {
      const res = await fetch(url);
      const data = await res.json();
      dispatch({ type: 'success', payload: data });
    } catch (e) {
      dispatch({ type: 'error' });
    }
  }
  fetchData();
}, [url]);
\`\`\`

For more complex flows consider middleware-like patterns or libraries like redux-saga / redux-thunk.`,
  },
  {
    id: "8",
    role: "User" as roles,
    message:
      "Test with a very long message to check scrolling and rendering performance. " +
      "This message repeats a few times to make it quite long. ".repeat(10),
  },
  {
    id: "9",
    role: "AI" as roles,
    message: `Final notes:

- Use memoization to avoid unnecessary re-renders.
- Profile your app using React DevTools and native profilers.
- Keep components small and focused.

Happy coding! 🚀`,
  },
];

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<[string]>();
  const { height } = useKeyBoardHandlerIOS();
  const flatlistRef = useRef<FlatList>(null);
  const keyboardAnim = useAnimatedStyle(() => {
    return {
      height: Math.abs(height.value),
      marginBottom: height.value > 0 ? -30 : 0,
    };
  }, []);

  return (
    <View className="flex-1 h-full justify-end bg-slate-300">
      <FlatList
        className=" flex-grow mb-5"
        data={testdata}
        keyExtractor={(i) => i.id}
        renderItem={(i) => (
          <ChatBubble message={i.item.message} role={i.item.role} />
        )}
        ref={flatlistRef}
      />
      <View className="flex gap-0 items-center flex-row ml-2 mr-5 mb-8   rounded-full py-5">
        <Input
          size="lg"
          className="hover:outline-cyan-500 ml-4 mr-2 my-0 flex-grow "
        >
          <InputField
            onResponderEnd={() => flatlistRef.current?.scrollToEnd()}
            variant=""
            value={prompt}
            onChangeText={setPrompt}
          />
        </Input>
        <ChatBtn onClick={() => {}} />
      </View>
      <Animated.View style={keyboardAnim} />
    </View>
  );
}
