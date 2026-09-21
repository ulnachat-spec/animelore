import { NextRequest, NextResponse } from "next/server";
import { findSimilarAnimeTitleEntries } from "@/lib/anime-title-registry";
import { fetchAniListMeta } from "@/lib/data-sources";
import { enforceRateLimitShared } from "@/lib/rate-limit-response";
import { MAX_WORK_QUERY_LENGTH } from "@/lib/work-service";

/**
 * 检索无法直接建档时的保守候选。不会把模糊 AniList 命中直接当作正确答案，
 * 只返回标题桥接成功或本地别名高度接近的条目。
 */
export async function GET(req: NextRequest) {
  const { blocked } = await enforceRateLimitShared(req, "work-suggest", 30, 5 * 60_000);
  if (blocked) return blocked;

  const query = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (!query) return NextResponse.json({ suggestions: [] });
  if (query.length > MAX_WORK_QUERY_LENGTH) {
    return NextResponse.json({ error: "query_too_long" }, { status: 400 });
  }

  const resolved = await fetchAniListMeta(query);
  if (resolved?.anilistId) {
    return NextResponse.json({
      suggestions: [
        {
          title: resolved.title,
          nativeTitle: resolved.nativeTitle,
          coverImage: resolved.coverImage,
          seasonYear: resolved.seasonYear,
          query: resolved.title,
          reason: "已通过别名与原名核对"
        }
      ]
    });
  }

  const closeEntries = findSimilarAnimeTitleEntries(query, 3);
  const candidates = await Promise.all(closeEntries.map((entry) => fetchAniListMeta(entry.zh)));
  const unique = new Map<number, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    if (candidate?.anilistId) unique.set(candidate.anilistId, candidate);
  }

  return NextResponse.json({
    suggestions: [...unique.values()].map((candidate) => ({
      title: candidate!.title,
      nativeTitle: candidate!.nativeTitle,
      coverImage: candidate!.coverImage,
      seasonYear: candidate!.seasonYear,
      query: candidate!.title,
      reason: "标题与现有别名高度接近"
    }))
  });
}
