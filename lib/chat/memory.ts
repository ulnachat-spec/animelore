import type { ChatCitation, ChatGrounding } from "@/lib/chat/grounding";

export const CHAT_MEMORY_STORAGE_KEY = "animelore.chat-memory.v1";
export const CHAT_MEMORY_ENABLED_KEY = "animelore.chat-memory-enabled.v1";
export const CHAT_MEMORY_MAX_WORKS = 12;
export const CHAT_MEMORY_MAX_MESSAGES = 20;
export const CHAT_MEMORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface RememberedChatMessage {
  role: "user" | "assistant";
  content: string;
  grounding?: ChatGrounding;
  citations?: ChatCitation[];
}

export interface WorkConversation {
  workTitle: string;
  messages: RememberedChatMessage[];
  updatedAt: string;
}

export interface ChatMemoryStore {
  version: 1;
  conversations: Record<string, WorkConversation>;
}

export function chatWorkKey(workTitle: string): string {
  return workTitle.trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, " ");
}

export function emptyChatMemory(): ChatMemoryStore {
  return { version: 1, conversations: {} };
}

function parseMessage(value: unknown): RememberedChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Partial<RememberedChatMessage>;
  if (
    (message.role !== "user" && message.role !== "assistant") ||
    typeof message.content !== "string" ||
    !message.content.trim()
  ) {
    return null;
  }
  const grounding =
    message.grounding === "source_backed" ||
    message.grounding === "archive_context" ||
    message.grounding === "opinion" ||
    message.grounding === "insufficient"
      ? message.grounding
      : undefined;
  const citations = Array.isArray(message.citations)
    ? message.citations
        .filter(
          (item): item is ChatCitation =>
            Boolean(item) &&
            typeof item.card === "number" &&
            typeof item.label === "string" &&
            Array.isArray(item.urls)
        )
        .slice(0, 4)
    : undefined;
  return {
    role: message.role,
    content: message.content.trim().slice(0, 5000),
    grounding,
    citations
  };
}

export function parseChatMemory(raw: string | null, now = Date.now()): ChatMemoryStore {
  if (!raw) return emptyChatMemory();
  try {
    const parsed = JSON.parse(raw) as Partial<ChatMemoryStore>;
    const conversations: Record<string, WorkConversation> = {};
    for (const [key, value] of Object.entries(parsed.conversations ?? {})) {
      if (!value || typeof value !== "object") continue;
      const conversation = value as Partial<WorkConversation>;
      const updatedAt = Date.parse(conversation.updatedAt ?? "");
      if (!Number.isFinite(updatedAt) || now - updatedAt > CHAT_MEMORY_TTL_MS) continue;
      if (typeof conversation.workTitle !== "string" || !Array.isArray(conversation.messages)) {
        continue;
      }
      conversations[key] = {
        workTitle: conversation.workTitle.slice(0, 200),
        updatedAt: new Date(updatedAt).toISOString(),
        messages: conversation.messages
          .map(parseMessage)
          .filter((item): item is RememberedChatMessage => Boolean(item))
          .slice(-CHAT_MEMORY_MAX_MESSAGES)
      };
    }
    return { version: 1, conversations };
  } catch {
    return emptyChatMemory();
  }
}

export function rememberWorkConversation(
  store: ChatMemoryStore,
  workTitle: string,
  messages: RememberedChatMessage[],
  now = Date.now()
): ChatMemoryStore {
  const key = chatWorkKey(workTitle);
  const next = {
    ...store.conversations,
    [key]: {
      workTitle: workTitle.trim(),
      messages: messages.slice(-CHAT_MEMORY_MAX_MESSAGES),
      updatedAt: new Date(now).toISOString()
    }
  };
  const kept = Object.entries(next)
    .sort(([, a], [, b]) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, CHAT_MEMORY_MAX_WORKS);
  return { version: 1, conversations: Object.fromEntries(kept) };
}

export function forgetWorkConversation(
  store: ChatMemoryStore,
  workTitle: string
): ChatMemoryStore {
  const conversations = { ...store.conversations };
  delete conversations[chatWorkKey(workTitle)];
  return { ...store, conversations };
}

export function readRememberedConversation(workTitle: string): RememberedChatMessage[] {
  if (typeof window === "undefined") return [];
  const store = parseChatMemory(localStorage.getItem(CHAT_MEMORY_STORAGE_KEY));
  return store.conversations[chatWorkKey(workTitle)]?.messages ?? [];
}

export function writeRememberedConversation(
  workTitle: string,
  messages: RememberedChatMessage[]
): void {
  if (typeof window === "undefined") return;
  const store = parseChatMemory(localStorage.getItem(CHAT_MEMORY_STORAGE_KEY));
  localStorage.setItem(
    CHAT_MEMORY_STORAGE_KEY,
    JSON.stringify(rememberWorkConversation(store, workTitle, messages))
  );
}

export function clearRememberedConversation(workTitle: string): void {
  if (typeof window === "undefined") return;
  const store = parseChatMemory(localStorage.getItem(CHAT_MEMORY_STORAGE_KEY));
  localStorage.setItem(
    CHAT_MEMORY_STORAGE_KEY,
    JSON.stringify(forgetWorkConversation(store, workTitle))
  );
}

export function readChatMemoryEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(CHAT_MEMORY_ENABLED_KEY) !== "false";
}

export function writeChatMemoryEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, String(enabled));
}
