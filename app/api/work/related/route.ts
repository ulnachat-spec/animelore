import { NextRequest, NextResponse } from "next/server";
import { loadWorkRelatedRecs } from "@/lib/load-work-related";
import { enforceRateLimit } from "@/lib/rate-limit-response";
import type { WorkMeta } from "@/lib/types";
import { MAX_WORK_QUERY_LENGTH } from "@/lib/work-service";

export async function GET(req: NextRequest) {
  const { blocked } = enforceRateLimit(req, "work-related", 30, 5 * 60_000);
  if (blocked) return blocked;
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ ok: false, error: "missing q" }, { status: 400 });
  }
  if (q.length > MAX_WORK_QUERY_LENGTH) {
    return NextResponse.json({ ok: false, error: "query_too_long" }, { status: 400 });
  }

  const title = req.nextUrl.searchParams.get("title")?.trim() || q;
  const nativeTitle = req.nextUrl.searchParams.get("nativeTitle")?.trim() || undefined;
  if (title.length > MAX_WORK_QUERY_LENGTH || (nativeTitle && nativeTitle.length > 160)) {
    return NextResponse.json({ ok: false, error: "title_too_long" }, { status: 400 });
  }
  const anilistIdRaw = req.nextUrl.searchParams.get("anilistId");
  const anilistId =
    anilistIdRaw != null && anilistIdRaw !== "" ? parseInt(anilistIdRaw, 10) : undefined;

  const meta: WorkMeta = {
    title,
    nativeTitle,
    anilistId: Number.isFinite(anilistId) ? anilistId : undefined
  };

  try {
    const recs = await loadWorkRelatedRecs({ query: q, meta });
    return NextResponse.json({ ok: true, recs });
  } catch (error) {
    console.warn("[api/work/related]", error);
    return NextResponse.json({
      ok: true,
      recs: []
    });
  }
}
