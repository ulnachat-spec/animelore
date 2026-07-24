import { NextRequest, NextResponse } from "next/server";
import { loadWorkRelatedRecs } from "@/lib/load-work-related";
import type { WorkMeta } from "@/lib/types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ ok: false, error: "missing q" }, { status: 400 });
  }

  const title = req.nextUrl.searchParams.get("title")?.trim() || q;
  const nativeTitle = req.nextUrl.searchParams.get("nativeTitle")?.trim() || undefined;
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
    return NextResponse.json({
      ok: true,
      recs: [],
      error: (error as Error).message
    });
  }
}
