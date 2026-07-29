import { ragLog } from "@/lib/rag/logger";
import type { AnalyzerInput, AnalyzerResult } from "@/lib/rag/types";

const KNOWN_ALIAS_EXPANSIONS: Record<string, string[]> = {
  eva: ["Neon Genesis Evangelion", "新世纪福音战士"],
  新世纪福音战士: ["Neon Genesis Evangelion"],
  小圆: ["魔法少女小圆", "Puella Magi Madoka Magica"],
  魔法少女小圆: ["Puella Magi Madoka Magica"],
  巨人: ["进击的巨人", "Attack on Titan", "Shingeki no Kyojin"],
  进击的巨人: ["Attack on Titan", "Shingeki no Kyojin"],
  钢炼: ["钢之炼金术师 FULLMETAL ALCHEMIST", "Fullmetal Alchemist: Brotherhood"],
  芙莉莲: ["葬送的芙莉莲", "Frieren: Beyond Journey's End"],
  孤独摇滚: ["孤独摇滚！", "Bocchi the Rock!"],
  石头门: ["命运石之门", "Steins;Gate"],
  攻壳sac: ["攻壳机动队 STAND ALONE COMPLEX", "Ghost in the Shell: Stand Alone Complex"]
};

export function normalizeWorkQuery(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/^[《「『【"']+|[》」』】"']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasKey(value: string): string {
  return value.toLocaleLowerCase("zh-CN").replace(/[\s·・!！:：_-]+/g, "");
}

/**
 * 作品检索意图分析：先清理书名号与全角字符，再追加常见中英别名。
 * 不把规则推断伪装成高置信度语义理解。
 */
export function analyzeWorkQuery(input: AnalyzerInput): AnalyzerResult {
  const raw = input.raw_query.trim();
  const normalized = normalizeWorkQuery(raw);
  const normalized_queries: string[] = [];
  if (normalized) normalized_queries.push(normalized);

  const aliases = KNOWN_ALIAS_EXPANSIONS[aliasKey(normalized)] ?? [];
  for (const alias of aliases) {
    if (!normalized_queries.includes(alias)) normalized_queries.push(alias);
  }
  if (raw && raw !== normalized && !normalized_queries.includes(raw)) {
    normalized_queries.push(raw);
  }

  const result: AnalyzerResult = {
    task_type: "work_lore",
    confidence: aliases.length ? 0.9 : 0.78,
    normalized_queries: normalized_queries.length ? normalized_queries : [raw],
    notes: aliases.length ? "rule_based_analyzer_v2_alias" : "rule_based_analyzer_v2_normalized",
    requires_multi_hop: aliases.length > 0
  };

  ragLog("analyzer", {
    raw_query: raw,
    confidence: result.confidence,
    normalized_queries: result.normalized_queries
  });
  return result;
}
