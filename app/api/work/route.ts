import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimitShared } from "@/lib/rate-limit-response";
import { loadWorkCore } from "@/lib/load-work-core";
import { MAX_WORK_QUERY_LENGTH } from "@/lib/work-service";
import { recordOperationsEvent } from "@/lib/operations-metrics";

/** 首屏：meta + lore + RAG 证据（四卡）；延伸阅读见 /api/work/community-recs 与 /api/work/related */
export async function GET(req: NextRequest) {
  recordOperationsEvent("work_requested");
  const { blocked } = await enforceRateLimitShared(req, "work", 30, 5 * 60_000);
  if (blocked) return blocked;

  try {
    const query = req.nextUrl.searchParams.get("q")?.trim();
    if (!query) {
      return NextResponse.json({ ok: false, error: "missing q" }, { status: 400 });
    }
    if (query.length > MAX_WORK_QUERY_LENGTH) {
      return NextResponse.json({ ok: false, error: "query_too_long" }, { status: 400 });
    }

    const data = await loadWorkCore(query);
    if (!data.ok) {
      recordOperationsEvent("work_failed");
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

    recordOperationsEvent("work_succeeded");
    return NextResponse.json(data);
  } catch (error) {
    recordOperationsEvent("work_failed");
    console.error("[api/work]", error);
    return NextResponse.json(
      {
        ok: false,
        code: "pipeline_error",
        message: "档案生成暂时遇到问题，请稍后重试。"
      },
      { status: 500 }
    );
  }
}
