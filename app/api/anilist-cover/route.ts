import { NextRequest, NextResponse } from "next/server";
import { fetchAniListMeta } from "@/lib/data-sources";
import { enforceRateLimit } from "@/lib/rate-limit-response";

const coverCache = new Map<string, { coverUrl: string; expiresAt: number }>();
const COVER_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { blocked } = enforceRateLimit(req, "anilist-cover", 60, 5 * 60_000);
  if (blocked) return blocked;
  const title = req.nextUrl.searchParams.get("title")?.trim();
  if (!title) {
    return NextResponse.json({ error: "missing title" }, { status: 400 });
  }
  if (title.length > 120) {
    return NextResponse.json({ error: "title_too_long" }, { status: 400 });
  }
  const cacheKey = title.normalize("NFKC").toLowerCase();
  const cached = coverCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ coverUrl: cached.coverUrl, cache: "hit" });
  }

  try {
    // 与作品页共享同一标题解析链，避免“正文找到了、补图却空白”的割裂体验。
    const coverUrl = (await fetchAniListMeta(title))?.coverImage || "";
    coverCache.set(cacheKey, { coverUrl, expiresAt: Date.now() + COVER_TTL_MS });
    return NextResponse.json({ coverUrl });
  } catch {
    return NextResponse.json({ coverUrl: "" });
  }
}
