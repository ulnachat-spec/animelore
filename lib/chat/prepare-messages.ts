import {
  CHAT_MAX_HISTORY_MESSAGES,
  CHAT_MAX_USER_MESSAGE_CHARS
} from "@/lib/chat/constants";
import type { ChatRequestBody } from "@/lib/chat/schemas";

export function trimChatHistory(
  messages: ChatRequestBody["messages"]
): Array<{ role: "user" | "assistant"; content: string }> {
  const sliced = messages.slice(-CHAT_MAX_HISTORY_MESSAGES);
  return sliced.map((m) => ({
    role: m.role,
    content:
      m.role === "user"
        ? m.content.trim().slice(0, CHAT_MAX_USER_MESSAGE_CHARS)
        : m.content.trim()
  }));
}

export function validateLatestUserMessage(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): string | null {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return "最后一条消息须为用户发送";
  }
  const text = last.content.trim();
  if (!text) return "消息不能为空";
  if (text.length > CHAT_MAX_USER_MESSAGE_CHARS) {
    return `消息过长（最多 ${CHAT_MAX_USER_MESSAGE_CHARS} 字）`;
  }
  return null;
}
