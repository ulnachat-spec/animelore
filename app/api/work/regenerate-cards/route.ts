/**
 * POST /api/work/regenerate-cards —— 仅基于 meta + evidence 重新生成四卡（换一批），不触发检索。
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeSeenContentByCard } from "@/lib/regenerate-dedupe";
import { regenerateLoreCardsFromEvidence } from "@/lib/regenerate-work-lore";
import { enforceRateLimit } from "@/lib/rate-limit-response";

const evidenceSourceSchema = z.enum([
  "anilist",
  "wikipedia",
  "moegirl",
  "bangumi",
  "bilibili",
  "nga",
  "aweidao",
  "web"
]);

const evidenceSchema = z.object({
  id: z.string(),
  source: evidenceSourceSchema,
  title: z.string(),
  url: z.string().nullable(),
  snippet: z.string(),
  structured: z.record(z.string(), z.any()).optional(),
  retrieval_query: z.string(),
  round: z.number().int(),
  retrieved_at: z.string()
});

const metaSchema = z.object({
  title: z.string(),
  nativeTitle: z.string().optional(),
  seasonYear: z.number().optional(),
  season: z.string().optional(),
  studios: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  anilistId: z.number().optional()
});

const seenStringsSchema = z.array(z.string().max(2000)).default([]);

const seenContentByCardSchema = z
  .object({
    legacy: seenStringsSchema,
    meme: seenStringsSchema,
    behind: seenStringsSchema,
    lineage: seenStringsSchema
  })
  .default({
    legacy: [],
    meme: [],
    behind: [],
    lineage: []
  });

const bodySchema = z.object({
  meta: metaSchema,
  evidence: z.array(evidenceSchema).min(1).max(24),
  seenContentByCard: seenContentByCardSchema.optional(),
  /** @deprecated 兼容旧请求 */
  previousHeadlines: z.array(z.string()).max(8).optional()
});

export async function POST(req: Request) {
  const { blocked } = enforceRateLimit(req, "regenerate-cards", 10, 10 * 60_000);
  if (blocked) return blocked;

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_body", detail: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { meta, evidence, seenContentByCard } = parsed.data;
    const seen = normalizeSeenContentByCard(seenContentByCard);

    const { lore, exhausted } = await regenerateLoreCardsFromEvidence(meta, evidence, seen);

    return NextResponse.json({ lore, exhausted });
  } catch (e) {
    console.error("[regenerate-cards]", e);
    return NextResponse.json(
      { error: "regenerate_failed", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
