import { NextRequest, NextResponse } from "next/server";
import { withTimeout } from "@/lib/community-fetch-timeout";
import { buildCommunityRecsForWork } from "@/lib/community-recs-service";
import {
  communityRecsEnabled,
  communityRecsFetchDeadlineMs
} from "@/lib/community-recs-config";
import { enforceRateLimitShared } from "@/lib/rate-limit-response";
import type { WorkMeta } from "@/lib/types";
import { MAX_WORK_QUERY_LENGTH } from "@/lib/work-service";

export async function GET(req: NextRequest) {
  const { blocked } = await enforceRateLimitShared(req, "work-community-recs", 12, 5 * 60_000);
  if (blocked) return blocked;
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ ok: false, error: "missing q" }, { status: 400 });
  }
  if (q.length > MAX_WORK_QUERY_LENGTH) {
    return NextResponse.json({ ok: false, error: "query_too_long" }, { status: 400 });
  }

  if (!communityRecsEnabled()) {
    return NextResponse.json({ ok: true, recs: [] });
  }

  const title = req.nextUrl.searchParams.get("title")?.trim() || q;
  const nativeTitle = req.nextUrl.searchParams.get("nativeTitle")?.trim() || undefined;
  const bangumiNameCn = req.nextUrl.searchParams.get("bangumiNameCn")?.trim() || undefined;
  if (
    title.length > MAX_WORK_QUERY_LENGTH ||
    (nativeTitle && nativeTitle.length > 160) ||
    (bangumiNameCn && bangumiNameCn.length > 160)
  ) {
    return NextResponse.json({ ok: false, error: "title_too_long" }, { status: 400 });
  }

  const meta: WorkMeta = {
    title,
    nativeTitle
  };

  try {
    const built = await withTimeout(
      buildCommunityRecsForWork({
        query: q,
        meta,
        bangumiNameCn,
        collectDebug: false,
        generateRecommendations: true,
        deadlineMs: Date.now() + communityRecsFetchDeadlineMs()
      }),
      communityRecsFetchDeadlineMs() + 2000
    );

    if (!built) {
      return NextResponse.json({ ok: true, recs: [], timed_out: true });
    }

    return NextResponse.json({
      ok: true,
      recs: built.recs
    });
  } catch (error) {
    console.warn("[api/work/community-recs]", error);
    return NextResponse.json({
      ok: true,
      recs: []
    });
  }
}
