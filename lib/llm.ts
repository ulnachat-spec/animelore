/**
 * 本文件改动：
 * - DeepSeek 客户端增加较长 `timeout`，减轻长 prompt 下被过早断开的情况。
 * - `generateLore` / `generateHomeHookRaw` 对「Premature close」等可恢复传输错误做有限次重试（换一批与主链路共用）。
 */
import OpenAI from "openai";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import type { ColdQuiz, ColdRecommendationRaw, ColdSubtype, ColdTopicType, LorePayload } from "@/lib/types";

const coldSubtypeSchema = z.enum([
  "concept_origin",
  "term_origin",
  "meme_origin",
  "work_fact",
  "character_fact",
  "production_note",
  "staff_fact",
  "genre_trope",
  "trope_explanation",
  "community_discussion",
  "community_take"
]);

const coldQuizSchema = z.object({
  statement: z.string(),
  answer: z.boolean(),
  explanation: z.string()
});

const homeHookRawSchema = z.object({
  topic_type: z.enum(["work", "concept", "phenomenon"]),
  topic_key: z.string().optional(),
  cold_subtype: coldSubtypeSchema.optional(),
  hook: z.string(),
  blurb: z.string().optional(),
  angle: z.string().optional(),
  example_bridge: z.string().optional(),
  style_pattern: z
    .enum([
      "misunderstanding",
      "scene_first",
      "etymology",
      "audience_psychology",
      "work_contrast"
    ])
    .optional(),
  insight: z.string(),
  quiz: coldQuizSchema.nullish().default(null),
  source_urls: z.array(z.string()).optional().default([]),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  recommendations: z
    .array(
      z.object({
        candidate_id: z.string(),
        reason: z.string()
      })
    )
    .max(2)
    .optional()
    .default([])
});

export type HomeHookRaw = {
  topic_type: ColdTopicType;
  topic_key: string;
  cold_subtype?: ColdSubtype;
  hook: string;
  blurb?: string;
  angle?: string;
  example_bridge?: string;
  style_pattern?: "misunderstanding" | "scene_first" | "etymology" | "audience_psychology" | "work_contrast";
  insight: string;
  quiz?: ColdQuiz | null;
  source_urls: string[];
  confidence: number;
  recommendations: Array<{ candidate_id: string; reason: string }>;
};

const loreSchema = z.object({
  work_title: z.string(),
  cards: z.array(
    z.object({
      id: z.enum(["legacy", "meme", "behind", "lineage"]),
      en_label: z.string(),
      zh_name: z.string(),
      headline: z.string(),
      intro: z.string(),
      points: z.array(z.string()),
      source: z.string(),
      source_urls: z.preprocess(
        (val) => (Array.isArray(val) ? val : []),
        z.array(z.string())
      )
    })
  ),
  bottom_hook: z.object({
    work: z.string(),
    hook: z.string()
  })
});

function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY || readApiKeyFromEnvFiles();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is missing");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    /** 四卡 + 长证据包时响应较慢；过短易触发 node-fetch「Premature close」 */
    timeout: 180_000,
    /** 传输类错误由下方 `withTransportRetries` 统一重试，避免与 SDK 默认重试叠加 */
    maxRetries: 0
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableTransportError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";
  const blob = `${msg} ${code}`.toLowerCase();
  return (
    blob.includes("premature close") ||
    blob.includes("err_stream_premature_close") ||
    blob.includes("econnreset") ||
    blob.includes("etimedout") ||
    blob.includes("socket hang up") ||
    blob.includes("fetch failed") ||
    blob.includes("network error")
  );
}

async function withTransportRetries<T>(label: string, run: () => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  const backoffMs = [0, 1_000, 2_500];
  let last: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    if (backoffMs[i] > 0) await sleep(backoffMs[i]);
    try {
      return await run();
    } catch (e) {
      last = e;
      const retry = i < maxAttempts - 1 && isRetryableTransportError(e);
      if (retry) {
        console.warn(`[llm] ${label} transport error (attempt ${i + 1}/${maxAttempts}), retrying`, (e as Error).message);
        continue;
      }
      throw e;
    }
  }
  throw last;
}

function readApiKeyFromEnvFiles(): string | undefined {
  const cwd = process.cwd();
  const candidates = [".env.local", ".env"];
  for (const file of candidates) {
    const fp = path.join(cwd, file);
    if (!fs.existsSync(fp)) continue;
    const raw = fs.readFileSync(fp, "utf8");
    const line = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.startsWith("DEEPSEEK_API_KEY="));
    if (!line) continue;
    const value = line.slice("DEEPSEEK_API_KEY=".length).trim();
    if (value) return value;
  }
  return undefined;
}

export async function generateLore(prompt: string): Promise<LorePayload> {
  return withTransportRetries("generateLore", async () => {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are a reliable anime analyst. Output strict JSON only, no markdown."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const content = completion.choices[0]?.message?.content || "{}";
    return loreSchema.parse(JSON.parse(content));
  });
}

export type ChatCompletionMessage = {
  role: "user" | "assistant";
  content: string;
};

/** 作品页芽依聊天：非流式，复用 DeepSeek 客户端与传输重试 */
export async function generateChatReply(
  systemPrompt: string,
  messages: ChatCompletionMessage[]
): Promise<string> {
  return withTransportRetries("generateChatReply", async () => {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      ],
      temperature: 0.75
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (text) return text;
    return "抱歉，我刚刚没组织好语言呢～要不再问一次？";
  });
}

export async function generateHomeHookRaw(prompt: string): Promise<HomeHookRaw> {
  return withTransportRetries("generateHomeHookRaw", async () => {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.85
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = homeHookRawSchema.parse(JSON.parse(content));
    return {
      topic_type: parsed.topic_type,
      topic_key:
        parsed.topic_key?.trim() ||
        `${parsed.topic_type}:${parsed.hook.slice(0, 16)}`,
      cold_subtype: parsed.cold_subtype,
      hook: parsed.hook,
      blurb: parsed.blurb?.trim(),
      angle: parsed.angle?.trim(),
      example_bridge: parsed.example_bridge?.trim(),
      style_pattern: parsed.style_pattern,
      insight: parsed.insight,
      quiz: parsed.quiz,
      source_urls: parsed.source_urls ?? [],
      confidence: parsed.confidence ?? 0.5,
      recommendations: parsed.recommendations
    };
  });
}
