import * as React from "react";
import { HStack } from "./ui/hstack";

interface ChatInputProps {
  text: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
}

export default function ChatInput(props: ChatInputProps) {
  return <HStack></HStack>;
}
