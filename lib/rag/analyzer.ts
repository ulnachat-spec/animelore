import type { AnalyzerInput, AnalyzerResult } from "@/lib/rag/types";
import { ragLog } from "@/lib/rag/logger";

const KNOWN_ALIAS_EXPANSIONS: Record<string, string[]> = {
  魔法少女小圆: ["Puella Magi Madoka Magica", "Mahou Shoujo Madoka★Magica"],
  小圆: ["Puella Magi Madoka Magica"],
  进击的巨人: ["Attack on Titan", "Shingeki no Kyojin"],
  钢之炼金术师: ["Fullmetal Alchemist: Brotherhood"],
  EVA: ["Neon Genesis Evangelion"],
  eva: ["Neon Genesis Evangelion"]
};

/**
 * MVP：规则为主。/api/work 入口固定视为作品图鉴检索意图。
 */
export function analyzeWorkQuery(input: AnalyzerInput): AnalyzerResult {
  const raw = input.raw_query.trim();
  const normalized_queries: string[] = [];

  if (raw.length > 0) normalized_queries.push(raw);

  const aliases = KNOWN_ALIAS_EXPANSIONS[raw] || [];
  for (const a of aliases) {
    if (!normalized_queries.includes(a)) normalized_queries.push(a);
  }

  if (normalized_queries.length === 0) normalized_queries.push(raw);

  const result: AnalyzerResult = {
    task_type: "work_lore",
    confidence: 0.95,
    normalized_queries,
    notes: "rule_based_analyzer_v1",
    requires_multi_hop: aliases.length > 0
  };

  ragLog("analyzer", {
    raw_query: raw,
    task_type: result.task_type,
    normalized_queries: result.normalized_queries
  });

  return result;
}
