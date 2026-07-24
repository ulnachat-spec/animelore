import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit-response";
import { loadWorkCore } from "@/lib/load-work-core";

/** 首屏：meta + lore + RAG 证据（四卡）；延伸阅读见 /api/work/community-recs 与 /api/work/related */
export async function GET(req: NextRequest) {
  const { blocked } = enforceRateLimit(req, "work", 30, 5 * 60_000);
  if (blocked) return blocked;

  try {
    const query = req.nextUrl.searchParams.get("q");
    if (!query) {
      return NextResponse.json({ ok: false, error: "missing q" }, { status: 400 });
    }

    const data = await loadWorkCore(query);
    if (!data.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: data.code,
          message: data.message,
          hint:
            data.code === "missing_api_key"
              ? "Configure DEEPSEEK_API_KEY in .env or .env.local and restart dev."
              : "See server logs for stack trace."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "pipeline_error",
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}
