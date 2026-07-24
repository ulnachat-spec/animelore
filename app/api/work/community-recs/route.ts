import { NextRequest, NextResponse } from "next/server";
import { withTimeout } from "@/lib/community-fetch-timeout";
import { buildCommunityRecsForWork } from "@/lib/community-recs-service";
import {
  communityRecsEnabled,
  communityRecsFetchDeadlineMs
} from "@/lib/community-recs-config";
import type { WorkMeta } from "@/lib/types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ ok: false, error: "missing q" }, { status: 400 });
  }

  if (!communityRecsEnabled()) {
    return NextResponse.json({ ok: true, recs: [] });
  }

  const title = req.nextUrl.searchParams.get("title")?.trim() || q;
  const nativeTitle = req.nextUrl.searchParams.get("nativeTitle")?.trim() || undefined;
  const bangumiNameCn = req.nextUrl.searchParams.get("bangumiNameCn")?.trim() || undefined;

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
    return NextResponse.json({
      ok: true,
      recs: [],
      error: (error as Error).message
    });
  }
}
