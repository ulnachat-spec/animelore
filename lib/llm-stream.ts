import OpenAI from "openai";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { LORE_CARD_META } from "@/lib/lore-card-meta";
import { createCardStreamStats, type CardStreamStats } from "@/lib/card-stream-stats";
import { LoreCardStreamParser, type CardStreamEmit } from "@/lib/lore-card-text-parser";
import { emitWithTypewriter } from "@/lib/stream-typewriter";
import {
  buildBottomHookStreamPrompt,
  buildSingleCardStreamPrompt
} from "@/lib/prompt-card-stream";
import type { Evidence } from "@/lib/rag/types";
import type { LoreCard, LoreCardId, LorePayload, WorkMeta } from "@/lib/types";
import { workLoreStreamCardTimeoutMs } from "@/lib/work-stream-timeouts";

const singleCardSchema = z.object({
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
});

const bottomHookSchema = z.object({
  work: z.string(),
  hook: z.string()
});

function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY || readApiKeyFromEnvFiles();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is missing");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    timeout: 180_000,
    maxRetries: 0
  });
}

function readApiKeyFromEnvFiles(): string | undefined {
  const cwd = process.cwd();
  for (const file of [".env.local", ".env"]) {
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

function linkAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      return controller.signal;
    }
    s.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

function cardLog(cardId: LoreCardId, step: string, extra?: Record<string, unknown>) {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[work-stream] card=${cardId} ${step}${suffix}`);
}

export type GenerateLoreCardStreamInput = {
  meta: WorkMeta;
  evidence: Evidence[];
  communityHint: string;
  cardId: LoreCardId;
  onStream: (ev: CardStreamEmit) => void | Promise<void>;
  /** 整条 stream 的取消信号（含整体超时） */
  signal?: AbortSignal;
  stats?: CardStreamStats;
};

export type GenerateLoreCardStreamResult = {
  card: LoreCard;
  rawText: string;
  repaired: boolean;
  timedOut?: boolean;
  stats: CardStreamStats;
};

/** 单卡流式生成：plain text 协议 → 服务端解析；失败则 JSON 修复 */
export async function generateLoreCardStream(
  input: GenerateLoreCardStreamInput
): Promise<GenerateLoreCardStreamResult> {
  const { cardId } = input;
  cardLog(cardId, "card_start");

  const client = getClient();
  const prompt = buildSingleCardStreamPrompt(
    input.meta,
    input.evidence,
    input.communityHint,
    cardId
  );
  const parser = new LoreCardStreamParser(cardId);
  const stats = input.stats ?? createCardStreamStats();

  const cardAbort = new AbortController();
  const cardTimeoutMs = workLoreStreamCardTimeoutMs();
  const cardTimer = setTimeout(() => cardAbort.abort(), cardTimeoutMs);

  const signals: AbortSignal[] = [cardAbort.signal];
  if (input.signal) signals.push(input.signal);
  const composedSignal = linkAbortSignals(...signals);

  let gotFirstToken = false;
  let timedOut = false;
  const cardT0 = Date.now();

  const forwardEmit = async (ev: CardStreamEmit) => {
    await emitWithTypewriter(ev, async (piece) => {
      stats.parser_emit_count += 1;
      const len = piece.delta.length;
      stats.delta_length_total += len;
      const elapsed = Date.now() - cardT0;
      if (piece.type === "card_point_delta") {
        stats.point_delta_event_count += 1;
      } else {
        stats.delta_event_count += 1;
      }
      if (stats.first_delta_at == null) stats.first_delta_at = elapsed;
      stats.last_delta_at = elapsed;
      await input.onStream(piece);
    });
  };

  try {
    const stream = await client.chat.completions.create(
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You write one anime lore card at a time. Follow the exact HEADLINE/INTRO/POINT labels. No JSON, no markdown fences."
          },
          { role: "user", content: prompt }
        ],
        stream: true,
        temperature: 0.7
      },
      { signal: composedSignal }
    );

    for await (const chunk of stream) {
      if (cardAbort.signal.aborted && !input.signal?.aborted) {
        timedOut = true;
        break;
      }
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (!delta) continue;
      stats.chunk_count += 1;
      if (!gotFirstToken) {
        cardLog(cardId, "first_token_received", { chunk_len: delta.length });
        gotFirstToken = true;
      }
      await parser.appendToken(delta, forwardEmit);
    }

    if (cardAbort.signal.aborted && !input.signal?.aborted) {
      timedOut = true;
    }

    cardLog(cardId, "stream_finished", {
      chunk_count: stats.chunk_count,
      delta_length_total: stats.delta_length_total,
      parser_emit_count: parser.emitCount,
      timed_out: timedOut
    });
  } catch (e) {
    if (cardAbort.signal.aborted && !input.signal?.aborted) {
      timedOut = true;
      cardLog(cardId, "card_timeout", {
        chunk_count: stats.chunk_count,
        delta_length_total: stats.delta_length_total
      });
    } else if (input.signal?.aborted) {
      throw e;
    } else {
      throw e;
    }
  } finally {
    clearTimeout(cardTimer);
  }

  const rawText = parser.getBuffer();
  let card = parser.parseFinal();
  let repaired = false;

  if (card) {
    cardLog(cardId, "parse_final_ok", { timed_out: timedOut });
  } else if (rawText.trim().length > 0) {
    cardLog(cardId, "repair_start", { raw_len: rawText.length, timed_out: timedOut });
    try {
      card = await repairLoreCardJson(
        input.meta,
        input.evidence,
        input.communityHint,
        cardId,
        rawText,
        composedSignal
      );
      repaired = true;
      cardLog(cardId, "repair_done");
    } catch {
      card = fallbackLoreCard(
        cardId,
        timedOut ? "该卡片流式生成超时，已使用占位内容。" : "该卡片解析失败，已使用占位内容。"
      );
    }
  } else if (timedOut) {
    card = fallbackLoreCard(cardId, "该卡片流式生成超时，未收到有效内容。");
  } else {
    card = fallbackLoreCard(cardId, "该卡片未生成有效内容。");
  }

  stats.card_done_at = Date.now() - cardT0;
  cardLog(cardId, "card_done", {
    timed_out: timedOut,
    repaired,
    delta_event_count: stats.delta_event_count,
    point_delta_event_count: stats.point_delta_event_count,
    first_delta_at: stats.first_delta_at,
    last_delta_at: stats.last_delta_at,
    card_done_at: stats.card_done_at,
    chunk_count: stats.chunk_count
  });

  return { card, rawText, repaired, timedOut, stats };
}

async function repairLoreCardJson(
  meta: WorkMeta,
  evidence: Evidence[],
  communityHint: string,
  cardId: LoreCardId,
  rawText: string,
  signal?: AbortSignal
): Promise<LoreCard> {
  const client = getClient();
  const cardMeta = LORE_CARD_META[cardId];
  const completion = await client.chat.completions.create(
    {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "Output strict JSON only for a single lore card."
        },
        {
          role: "user",
          content: `将下列草稿整理为一张 ${cardMeta.en_label} 卡片的 JSON（id=${cardId}）。
作品：《${meta.title}》
证据条数：${evidence.length}
社区提示：${communityHint}

草稿：
${rawText.slice(0, 6000)}

JSON 格式：
{"id":"${cardId}","en_label":"${cardMeta.en_label}","zh_name":"${cardMeta.zh_name}","headline":"","intro":"","points":["","",""],"source":"","source_urls":[]}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    },
    signal ? { signal } : undefined
  );

  const content = completion.choices[0]?.message?.content || "{}";
  const parsed = singleCardSchema.parse(JSON.parse(content));
  return parsed;
}

export function fallbackLoreCard(cardId: LoreCardId, reason: string): LoreCard {
  const meta = LORE_CARD_META[cardId];
  return {
    id: cardId,
    en_label: meta.en_label,
    zh_name: meta.zh_name,
    headline: "生成暂不可用",
    intro: reason,
    points: ["请稍后刷新页面，或关闭 WORK_LORE_STREAMING 使用普通生成。"],
    source: "AnimeLore",
    source_urls: []
  };
}

export async function generateBottomHookJson(
  meta: WorkMeta,
  workTitle: string,
  signal?: AbortSignal
): Promise<LorePayload["bottom_hook"]> {
  const client = getClient();
  const completion = await client.chat.completions.create(
    {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "Output strict JSON only."
        },
        { role: "user", content: buildBottomHookStreamPrompt(meta, workTitle) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    },
    signal ? { signal } : undefined
  );
  const content = completion.choices[0]?.message?.content || "{}";
  return bottomHookSchema.parse(JSON.parse(content));
}
