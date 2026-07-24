import type { EvidenceSource } from "@/lib/rag/types";

/** 各来源权威度权重（用于 evaluator 打分） */
export const SOURCE_AUTHORITY_WEIGHT: Record<EvidenceSource, number> = {
  anilist: 0.95,
  wikipedia: 0.88,
  bangumi: 0.86,
  moegirl: 0.72,
  bilibili: 0.58,
  aweidao: 0.52,
  nga: 0.48,
  web: 0.5
};

/** 可支撑播出年、制作公司、官方标题、制作关系等硬事实 */
export const HARD_FACT_SOURCES: readonly EvidenceSource[] = [
  "anilist",
  "bangumi",
  "wikipedia"
] as const;

/** 中文二次元语境、梗、设定解释（不可单独支撑制作硬事实） */
export const CONTEXT_SOURCES: readonly EvidenceSource[] = ["moegirl"] as const;

/** 社区讨论 / 观众观点（只能写成「有观众认为」类表述） */
export const COMMUNITY_SOURCES: readonly EvidenceSource[] = [
  "bilibili",
  "aweidao",
  "nga"
] as const;

export function authorityWeight(source: EvidenceSource): number {
  return SOURCE_AUTHORITY_WEIGHT[source] ?? 0.5;
}

export function isHardFactSource(source: EvidenceSource): boolean {
  return (HARD_FACT_SOURCES as readonly string[]).includes(source);
}

export function isContextSource(source: EvidenceSource): boolean {
  return (CONTEXT_SOURCES as readonly string[]).includes(source);
}

export function isCommunitySource(source: EvidenceSource): boolean {
  return (COMMUNITY_SOURCES as readonly string[]).includes(source);
}

export function envFlagTrue(name: string, defaultWhenUnset = false): boolean {
  const v = process.env[name];
  if (v == null || v === "") return defaultWhenUnset;
  return v === "true" || v === "1";
}

export function isBangumiEnabled(): boolean {
  return envFlagTrue("RAG_ENABLE_BANGUMI", true);
}

export function isBilibiliEnabled(): boolean {
  return envFlagTrue("RAG_ENABLE_BILIBILI", false);
}

export function isNgaEnabled(): boolean {
  return envFlagTrue("RAG_ENABLE_NGA", false);
}

export function isAweidaoEnabled(): boolean {
  return envFlagTrue("RAG_ENABLE_AWEIDAO", false);
}
