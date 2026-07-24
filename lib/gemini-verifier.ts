/**
 * DeepSeek 四卡生成后的 Gemini 交叉验证：仅对照 RAG evidence_pack，不引入模型记忆补事实。
 */
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { Evidence } from "@/lib/rag/types";
import type { LoreCard, LorePayload, WorkMeta } from "@/lib/types";

const geminiVerifyResponseSchema = z.object({
  outcome: z.enum(["pass", "partial", "fail"]),
  overall_confidence: z.number().min(0).max(1),
  summary: z.string(),
  cards: z.array(
    z.object({
      card_id: z.enum(["legacy", "meme", "behind", "lineage"]),
      card_status: z.enum(["supported", "partial", "unsupported"]),
      headline_supported: z.boolean(),
      intro_supported: z.boolean(),
      points: z.array(
        z.object({
          index: z.number().int().nonnegative(),
          supported: z.boolean(),
          note: z.string().optional()
        })
      )
    })
  )
});

export type GeminiVerifyReport = z.infer<typeof geminiVerifyResponseSchema>;

export type GeminiVerifyAction = "unchanged" | "sanitized" | "low_risk" | "insufficient";

export type GeminiVerifyTracePayload = {
  enabled: boolean;
  skipped: boolean;
  skip_reason?: string;
  model?: string;
  action: GeminiVerifyAction;
  outcome?: GeminiVerifyReport["outcome"];
  overall_confidence?: number;
  summary?: string;
  threshold: number;
  cards?: GeminiVerifyReport["cards"];
  error?: string;
  points_removed?: number;
  cards_downgraded?: number;
};

export type VerifyLoreWithGeminiResult = {
  lore: LorePayload;
  action: GeminiVerifyAction;
  report: GeminiVerifyReport | null;
  tracePayload: GeminiVerifyTracePayload;
};

function envFloat(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function isGeminiVerifyEnabled(): boolean {
  if (process.env.GEMINI_VERIFY_LORE === "false") return false;
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

function getThreshold(): number {
  const t = envFloat("GEMINI_VERIFY_THRESHOLD", 0.55);
  return Math.min(1, Math.max(0, t));
}

function buildEvidenceBlock(evidence: Evidence[]): string {
  return evidence
    .map(
      (e) =>
        `### ${e.id} [${e.source}]
title: ${e.title}
url: ${e.url ?? "N/A"}
---
${e.snippet.slice(0, 4000)}`
    )
    .join("\n\n---\n\n");
}

function buildVerifyPrompt(lore: LorePayload, evidence: Evidence[], meta: WorkMeta): string {
  return `
你是事实核查员。你只能根据下方【证据包】判断 DeepSeek 生成的四卡内容是否被证据支持。
禁止使用你在训练中学到的作品常识、剧情记忆或推断来补全或否定事实。

作品：${meta.title}${meta.nativeTitle ? `（${meta.nativeTitle}）` : ""}

【证据包】
${buildEvidenceBlock(evidence) || "（无）"}

【待核查四卡 JSON】
${JSON.stringify(lore, null, 2)}

规则：
1. 每条 point、headline、intro 必须在证据包中有明确依据才可标 supported。
2. 证据不足时标 unsupported 或 partial，不要猜测。
3. point 的 index 与 JSON 中 cards[].points 数组下标一致（从 0 开始）。
4. outcome：pass=绝大部分可核对；partial=有明显无法核对的内容但仍有可用信息；fail=幻觉严重或大部分无法核对。
5. overall_confidence：0~1，表示整体可被证据支撑的程度。

只输出 JSON，不要 markdown：
{
  "outcome": "pass" | "partial" | "fail",
  "overall_confidence": 0.0,
  "summary": "一句话说明",
  "cards": [
    {
      "card_id": "legacy",
      "card_status": "supported" | "partial" | "unsupported",
      "headline_supported": true,
      "intro_supported": true,
      "points": [{ "index": 0, "supported": true, "note": "" }]
    }
  ]
}
`.trim();
}

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    outcome: { type: "string", enum: ["pass", "partial", "fail"] },
    overall_confidence: { type: "number" },
    summary: { type: "string" },
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          card_id: { type: "string", enum: ["legacy", "meme", "behind", "lineage"] },
          card_status: { type: "string", enum: ["supported", "partial", "unsupported"] },
          headline_supported: { type: "boolean" },
          intro_supported: { type: "boolean" },
          points: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "integer" },
                supported: { type: "boolean" },
                note: { type: "string" }
              },
              required: ["index", "supported"]
            }
          }
        },
        required: ["card_id", "card_status", "headline_supported", "intro_supported", "points"]
      }
    }
  },
  required: ["outcome", "overall_confidence", "summary", "cards"]
} as const;

function evidenceBackedPlaceholder(evidence: Evidence[]): string {
  const e = evidence[0];
  if (!e) {
    return "当前证据包中缺少可引用的具体叙述，本条不作延伸推断。";
  }
  const excerpt = e.snippet.replace(/\s+/g, " ").trim().slice(0, 140);
  return `据证据「${e.title}」可核对片段：${excerpt}${e.snippet.length > 140 ? "…" : ""}`;
}

function hedgedIntro(meta: WorkMeta): string {
  return `关于《${meta.title}》，现有公开证据仅能支撑以下可核对说法，其余细节不作推断。`;
}

function hedgedHeadline(zhName: string): string {
  return `${zhName}：证据范围内可核对要点`;
}

function applyReportToLore(
  lore: LorePayload,
  report: GeminiVerifyReport,
  evidence: Evidence[],
  meta: WorkMeta,
  threshold: number
): { lore: LorePayload; action: GeminiVerifyAction; pointsRemoved: number; cardsDowngraded: number } {
  const verdictByCard = new Map(report.cards.map((c) => [c.card_id, c]));
  let pointsRemoved = 0;
  let cardsDowngraded = 0;

  const cards: LoreCard[] = lore.cards.map((card) => {
    const v = verdictByCard.get(card.id);
    if (!v) return card;

    const unsupportedPointIndexes = new Set(
      v.points.filter((p) => !p.supported).map((p) => p.index)
    );

    let points = card.points.filter((_, idx) => {
      if (unsupportedPointIndexes.has(idx)) {
        pointsRemoved += 1;
        return false;
      }
      return true;
    });

    let headline = card.headline;
    let intro = card.intro;

    if (v.card_status === "unsupported" || points.length === 0) {
      cardsDowngraded += 1;
      headline = hedgedHeadline(card.zh_name);
      intro = hedgedIntro(meta);
      points = [evidenceBackedPlaceholder(evidence)];
    } else {
      if (!v.headline_supported) headline = hedgedHeadline(card.zh_name);
      if (!v.intro_supported) intro = hedgedIntro(meta);
    }

    return { ...card, headline, intro, points };
  });

  const cardsWithContent = cards.filter((c) => c.points.length > 0).length;
  const sanitized: LorePayload = { ...lore, cards };

  if (report.outcome === "fail" || report.overall_confidence < threshold) {
    if (cardsWithContent < 2) {
      return { lore: sanitized, action: "insufficient", pointsRemoved, cardsDowngraded };
    }
    return { lore: sanitized, action: "low_risk", pointsRemoved, cardsDowngraded };
  }

  if (report.outcome === "partial" || pointsRemoved > 0 || cardsDowngraded > 0) {
    return { lore: sanitized, action: "sanitized", pointsRemoved, cardsDowngraded };
  }

  return { lore: sanitized, action: "unchanged", pointsRemoved, cardsDowngraded };
}

function skippedResult(
  lore: LorePayload,
  reason: string,
  extra?: Partial<GeminiVerifyTracePayload>
): VerifyLoreWithGeminiResult {
  const threshold = getThreshold();
  return {
    lore,
    action: "unchanged",
    report: null,
    tracePayload: {
      enabled: true,
      skipped: true,
      skip_reason: reason,
      action: "unchanged",
      threshold,
      ...extra
    }
  };
}

export async function verifyLoreWithGemini(args: {
  lore: LorePayload;
  evidence: Evidence[];
  meta: WorkMeta;
}): Promise<VerifyLoreWithGeminiResult> {
  const threshold = getThreshold();

  if (!isGeminiVerifyEnabled()) {
    return {
      lore: args.lore,
      action: "unchanged",
      report: null,
      tracePayload: {
        enabled: false,
        skipped: true,
        skip_reason: "GEMINI_VERIFY_LORE=false 或未配置 GEMINI_API_KEY",
        action: "unchanged",
        threshold
      }
    };
  }

  if (!args.evidence.length) {
    return skippedResult(args.lore, "empty_evidence_pack");
  }

  const model = getModel();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const prompt = buildVerifyPrompt(args.lore, args.evidence, args.meta);
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
        temperature: 0.1
      }
    });

    const text = response.text?.trim() || "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return skippedResult(args.lore, "invalid_json_from_gemini", {
        model,
        error: "parse_failed",
        summary: text.slice(0, 200)
      });
    }

    const report = geminiVerifyResponseSchema.parse(parsed);
    const applied = applyReportToLore(args.lore, report, args.evidence, args.meta, threshold);

    return {
      lore: applied.lore,
      action: applied.action,
      report,
      tracePayload: {
        enabled: true,
        skipped: false,
        model,
        action: applied.action,
        outcome: report.outcome,
        overall_confidence: report.overall_confidence,
        summary: report.summary,
        threshold,
        cards: report.cards,
        points_removed: applied.pointsRemoved,
        cards_downgraded: applied.cardsDowngraded
      }
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return skippedResult(args.lore, "gemini_api_error", {
      model,
      error: msg
    });
  }
}
