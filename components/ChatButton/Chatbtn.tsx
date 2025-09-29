import * as React from "react";
import { Pressable } from "../ui/pressable";
import { Icon } from "../ui/icon";
import { ArrowBigUp, ArrowUpRight, CircleArrowUp } from "lucide-react-native";

interface ChatBtnProps {
  onClick: () => void;
}

const ChatBtn: React.FC<ChatBtnProps> = ({ onClick }) => {
  return (
    <Pressable onPress={() => onClick()}>
      {({ pressed }) =>
        pressed ? (
          <Icon
            size="sm"
            className="rounded-full text-typography-0 bg-slate-400 p-5"
            as={ArrowUpRight}
          />
        ) : (
          <Icon
            size="sm"
            className="rounded-full text-typography-0  bg-slate-600 p-5"
            as={ArrowUpRight}
          />
        )
      }
    </Pressable>
  );
};

export default ChatBtn;
