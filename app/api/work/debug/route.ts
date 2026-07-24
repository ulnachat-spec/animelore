import { NextRequest, NextResponse } from "next/server";
import { buildCommunityRecsForWork } from "@/lib/community-recs-service";
import { adaptiveWorkEnabled } from "@/lib/work-service";
import { runAdaptiveWorkLore } from "@/lib/rag/adaptive";
import type { RagDebugRound } from "@/lib/rag/types";

/**
 * 自适应 RAG 调试 JSON：
 * GET /api/work/debug?q=作品名
 *
 * 当 ADAPTIVE_RAG_WORK=false 时返回 400（与 `getWorkLore` 主链路一致，不默默跑 adaptive）。
 *
 * - RAG_DEBUG_INCLUDE_PROMPT=true 可看完整 prompt
 * - RAG_DEBUG_TRUNCATE_SNIPPET=600 控制每条 evidence 摘要长度
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json(
      { error: "missing q", hint: "示例：/api/work/debug?q=进击的巨人" },
      { status: 400 }
    );
  }

  if (!adaptiveWorkEnabled()) {
    return NextResponse.json(
      {
        error: "adaptive_disabled",
        message:
          "当前 ADAPTIVE_RAG_WORK=false，作品主链路走 legacy，本 debug 接口仅对 adaptive RAG 有意义。请设为 true 后重启 dev，或改用 GET /api/work?q=… 对照。",
        hint: "与 lib/work-service.ts · getWorkLore() 行为对齐"
      },
      { status: 400 }
    );
  }

  try {
    const result = await runAdaptiveWorkLore(query, { debug: true });
    const dr = result.debugReport;

    if (!dr) {
      return NextResponse.json(
        { error: "debug_report_missing" },
        { status: 500 }
      );
    }

    const bg0 = dr.rounds[0]?.evidence_this_round?.find((e) => e.source === "bangumi");
    const bangumiNameCn =
      bg0 && typeof bg0.structured?.name_cn === "string" ? bg0.structured.name_cn : undefined;

    const communityRecsBuilt = await buildCommunityRecsForWork({
      query,
      meta: result.meta,
      bangumiNameCn,
      collectDebug: true,
      generateRecommendations: true
    });

    return NextResponse.json({
      readme:
        "字段顺序：①输入 ②analyzer ③每轮 RAG ④四卡 ⑤community_recs_debug",

      // ① 输入了什么作品名
      input_query: dr.input_query,

      // ② analyzer：任务类型与完整输出
      analyzer_task_type: dr.analyzer.task_type,
      analyzer_full: dr.analyzer,

      // ③ planner + 每来源 evidence + evaluator（含每条分数）
      rounds: dr.rounds.map((r: RagDebugRound) => ({
        round_index: r.round,
        skipped: r.skipped ?? false,
        skip_reason: r.skip_reason ?? null,
        primary_query_used: r.primary_query || null,
        planner: r.planner,
        sources_selected: r.sources_selected,
        evidence_this_round: r.evidence_this_round,
        bangumi_fetch: r.bangumi_fetch ?? [],
        community_query_candidates: r.community_query_candidates ?? [],
        community_fetch: r.community_fetch ?? [],
        merged_evidence_total: r.merged_evidence_total,
        evaluator_each_evidence: r.evaluation.scored_evidence,
        evaluator_top_k_ids: r.evaluation.top_k_ids,
        evaluator_conflicts: r.evaluation.conflicts,
        coverage_ok: r.coverage_ok
      })),

      // ④ 有没有触发二次检索（是否真的跑了第二轮 retrieve）
      second_round_triggered: dr.second_round_triggered,
      max_rounds_config: dr.max_rounds_config,

      // ⑤ 最后哪些 evidence 进了生成 Prompt（id + 截断后的条目）
      prompt_evidence_ids: dr.prompt_evidence_ids,
      prompt_evidence: dr.prompt_evidence,
      prompt_character_count: dr.prompt_character_count ?? null,
      prompt_full_text:
        dr.prompt_full_text ??
        "(完整 prompt：设置环境变量 RAG_DEBUG_INCLUDE_PROMPT=true 后重启 npm run dev)",

      // ⑥ 最终四卡 JSON
      lore_cards_json: dr.lore_json,

      gemini_verification: dr.gemini_verification ?? null,

      community_recs: communityRecsBuilt.recs,
      community_recs_debug: communityRecsBuilt.debug ?? null,

      meta: result.meta,
      outcome: dr.outcome,
      pipeline: "adaptive_debug",

      raw_debug_report: dr,
      rag_trace_steps: result.rag.trace.steps
    });
  } catch (e) {
    console.error("[api/work/debug]", e);
    return NextResponse.json(
      {
        error: "debug_run_failed",
        detail: (e as Error).message,
        hint: "可查终端里 [RAG] 与报错栈"
      },
      { status: 500 }
    );
  }
}
