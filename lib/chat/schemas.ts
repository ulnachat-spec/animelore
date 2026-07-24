import { z } from "zod";
import { CHAT_MAX_HISTORY_MESSAGES, CHAT_MAX_USER_MESSAGE_CHARS } from "@/lib/chat/constants";

export const loreCardChatSchema = z.object({
  id: z.enum(["legacy", "meme", "behind", "lineage"]),
  en_label: z.string().max(120),
  zh_name: z.string().max(80),
  headline: z.string().max(500),
  intro: z.string().max(4000),
  points: z.array(z.string().max(800)).max(12),
  source: z.string().max(500),
  source_urls: z.array(z.string().max(500)).max(20).optional().default([])
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(CHAT_MAX_USER_MESSAGE_CHARS + 2000)
});

export const chatRequestBodySchema = z.object({
  workTitle: z.string().min(1).max(200),
  cards: z.array(loreCardChatSchema).min(1).max(4),
  messages: z.array(chatMessageSchema).max(CHAT_MAX_HISTORY_MESSAGES + 4)
});

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>;
