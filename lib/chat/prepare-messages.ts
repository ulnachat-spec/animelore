import {
  CHAT_MAX_ASSISTANT_MESSAGE_CHARS,
  CHAT_MAX_HISTORY_MESSAGES,
  CHAT_MAX_USER_MESSAGE_CHARS
} from "@/lib/chat/constants";
import type { ChatRequestBody } from "@/lib/chat/schemas";

export function trimChatHistory(
  messages: ChatRequestBody["messages"]
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages.slice(-CHAT_MAX_HISTORY_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content
      .trim()
      .slice(
        0,
        message.role === "user"
          ? CHAT_MAX_USER_MESSAGE_CHARS
          : CHAT_MAX_ASSISTANT_MESSAGE_CHARS
      )
  }));
}

export function validateLatestUserMessage(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): string | null {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return "最后一条消息必须由用户发送";
  const text = last.content.trim();
  if (!text) return "消息不能为空";
  if (text.length > CHAT_MAX_USER_MESSAGE_CHARS) {
    return `消息过长（最多 ${CHAT_MAX_USER_MESSAGE_CHARS} 字）`;
  }
  return null;
}
