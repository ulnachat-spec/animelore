import { generateChatReply } from "@/lib/llm";
import { trimChatHistory, validateLatestUserMessage } from "@/lib/chat/prepare-messages";
import type { ChatRequestBody } from "@/lib/chat/schemas";

export function prepareChatTurn(messages: ChatRequestBody["messages"]):
  | { error: string; detail: string }
  | { run: (systemPrompt: string) => Promise<string> } {
  const history = trimChatHistory(messages);
  const validationError = validateLatestUserMessage(history);
  if (validationError) {
    return { error: "invalid_messages", detail: validationError };
  }

  return {
    run: (systemPrompt) => generateChatReply(systemPrompt, history)
  };
}
