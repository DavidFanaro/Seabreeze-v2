import { roles } from "@/components/ChatBubble.tsx/ChatBubble";

export interface ChatMessage {
  id: string;
  role: roles;
  message: string;
}
