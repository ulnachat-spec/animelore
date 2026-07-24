import OpenAI from "openai";
import { z } from "zod";
import { communityRecsMax } from "@/lib/community-recs-config";
import type { CommunityArticleCandidate, CommunityArticleRec } from "@/lib/types";

const reasonerResponseSchema = z.object({
  items: z.array(
    z.object({
      candidate_id: z.string(),
      reason: z.string().min(6).max(220)
    })
  )
});

function buildPrompt(workTitle: string, candidates: CommunityArticleCandidate[], maxItems: number): string {
  const list = candidates
    .map(
      (c, i) =>
        `[${i + 1}] id=${c.id}
source=${c.source}
title=${c.title}
url=${c.url}
${c.author ? `author=${c.author}` : ""}
${c.published_at ? `published_at=${c.published_at}` : ""}
snippet=${(c.snippet || "").slice(0, 280)}`
    )
    .join("\n\n");

  return `
你是 AnimeLore 的延伸阅读编辑。作品：《${workTitle}》。

下方是**唯一允许**推荐的社区文章候选（id / 标题 / 来源 / 摘要均已给定）。
请从中挑选最多 ${maxItems} 条最值得读者继续阅读的中文社区内容，并为每条写一句中文推荐语（reason）。

[硬性规则]
- 只能从候选列表中选择，candidate_id 必须与下列 id 完全一致。
- **禁止**编造或修改 URL、标题、作者、发布时间。
- reason 只能基于该条的 title、snippet、source 概括「为什么值得读」，80 字以内。
- 这是外部阅读推荐，**不是**事实来源；reason 中不要把社区观点写成官方定论。
- 若候选质量普遍很低、与作品无关，返回 {"items":[]}。

[候选列表]
${list}

输出严格 JSON：
{"items":[{"candidate_id":"…","reason":"…"}]}
`.trim();
}

function getClient(): OpenAI | null {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    timeout: 60_000,
    maxRetries: 0
  });
}

export type CommunityReasonerResult = {
  recs: CommunityArticleRec[];
  error?: string;
};

export async function generateCommunityArticleRecommendations(input: {
  workTitle: string;
  candidates: CommunityArticleCandidate[];
  maxItems?: number;
}): Promise<CommunityReasonerResult> {
  const maxItems = input.maxItems ?? communityRecsMax();
  const candidates = input.candidates.filter((c) => c.title?.trim() && c.url?.trim());
  if (candidates.length === 0) return { recs: [] };

  const client = getClient();
  if (!client) {
    return { recs: [], error: "DEEPSEEK_API_KEY missing" };
  }

  try {
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You select external reading recommendations. Output strict JSON only, no markdown."
        },
        {
          role: "user",
          content: buildPrompt(input.workTitle, candidates, maxItems)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = reasonerResponseSchema.parse(JSON.parse(content));
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const recs: CommunityArticleRec[] = [];

    for (const item of parsed.items) {
      if (recs.length >= maxItems) break;
      const c = byId.get(item.candidate_id);
      if (!c) continue;
      recs.push({
        id: c.id,
        source: c.source,
        title: c.title,
        url: c.url,
        author: c.author,
        published_at: c.published_at,
        snippet: c.snippet,
        reason: item.reason.trim()
      });
    }

    if (recs.length === 0 && parsed.items.length > 0) {
      return {
        recs: [],
        error: "LLM returned items but none matched candidate_id"
      };
    }

    return { recs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[community-reasoner]", message);
    return { recs: [], error: message };
  }
}
