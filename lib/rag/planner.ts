import type { RetrievalPlan, TaskType } from "@/lib/rag/types";
import {
  isAweidaoEnabled,
  isBangumiEnabled,
  isBilibiliEnabled,
  isNgaEnabled
} from "@/lib/rag/source-policy";
import { ragLog } from "@/lib/rag/logger";

/**
 * 检索计划（声明式配置 + 日志）。
 *
 * 注意：`expand_strategy` / `sources[].max_items` 当前**不由本模块强制执行**；
 * 实际每轮拉哪些源、是否拉候补标题，由 `lib/rag/retriever.ts` 的 `enabledSources` 与 `tryAlternateTitles` 决定。
 */
function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 根据任务类型决定检索哪些源；MVP 仅 fully 配置 work_lore。
 */
export function planRetrieval(task_type: TaskType, roundIndex: number): RetrievalPlan {
  const max_rounds = envInt("RAG_MAX_ROUNDS", 2);

  if (task_type !== "work_lore") {
    const plan: RetrievalPlan = {
      sources: [
        { id: "anilist", priority: 1, max_items: 1, enabled: true },
        { id: "bangumi", priority: 2, max_items: 1, enabled: isBangumiEnabled() },
        { id: "wikipedia", priority: 3, max_items: 1, enabled: true },
        { id: "moegirl", priority: 4, max_items: 1, enabled: true }
      ],
      max_rounds,
      expand_strategy: ["fallback_default"]
    };
    ragLog("planner", { task_type, roundIndex, plan });
    return plan;
  }

  const plan: RetrievalPlan = {
    sources: [
      { id: "anilist", priority: 1, max_items: 2, enabled: true },
      { id: "bangumi", priority: 2, max_items: 2, enabled: isBangumiEnabled() },
      { id: "wikipedia", priority: 3, max_items: 2, enabled: true },
      { id: "moegirl", priority: 4, max_items: 2, enabled: true },
      { id: "bilibili", priority: 5, max_items: 1, enabled: isBilibiliEnabled() },
      { id: "nga", priority: 6, max_items: 1, enabled: isNgaEnabled() },
      { id: "aweidao", priority: 7, max_items: 1, enabled: isAweidaoEnabled() },
      { id: "web", priority: 8, max_items: 0, enabled: false }
    ],
    max_rounds,
    expand_strategy:
      roundIndex === 0
        ? ["primary_query", "anilist_meta_title", "bangumi_meta_title"]
        : ["alternate_wikipedia_title", "native_title_moegirl", "english_alias"]
  };

  ragLog("planner", { task_type, roundIndex, plan });
  return plan;
}
