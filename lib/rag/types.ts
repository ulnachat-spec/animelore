import type { LorePayload, WorkMeta } from "@/lib/types";

/** 与方案文档对齐；MVP 下 /api/work 主要为 work_lore */
export type TaskType =
  | "work_lore"
  | "cold_snippet"
  | "community_meme"
  | "fact_check"
  | "recommendation"
  | "unknown";

export type EvidenceSource =
  | "anilist"
  | "wikipedia"
  | "moegirl"
  | "bangumi"
  | "bilibili"
  | "nga"
  | "aweidao"
  | "web";

export interface Evidence {
  id: string;
  source: EvidenceSource;
  title: string;
  url: string | null;
  snippet: string;
  structured?: Record<string, unknown>;
  retrieval_query: string;
  round: number;
  retrieved_at: string;
}

export interface AnalyzerInput {
  raw_query: string;
  route_hint?: "work_lore" | "unknown";
  locale?: string;
}

export interface AnalyzerResult {
  task_type: TaskType;
  confidence: number;
  normalized_queries: string[];
  notes: string;
  requires_multi_hop: boolean;
}

export interface PlannedSource {
  id: EvidenceSource;
  priority: number;
  max_items: number;
  enabled: boolean;
}

export interface RetrievalPlan {
  sources: PlannedSource[];
  max_rounds: number;
  expand_strategy: string[];
}

export interface EvidenceScores {
  relevance: number;
  authority: number;
  specificity: number;
  freshness: number;
  final: number;
}

export interface ScoredEvidence {
  evidence_id: string;
  scores: EvidenceScores;
  keep: boolean;
  reason: string;
}

export interface EvaluationResult {
  scored_evidence: ScoredEvidence[];
  top_k_ids: string[];
  conflicts: Array<{ field: string; values: unknown[]; evidence_ids: string[] }>;
  coverage_ok: boolean;
}

export interface EvidencePack {
  items: Evidence[];
  summary_for_prompt: string;
}

export type RagStatus = "ok" | "insufficient_evidence" | "error";

export interface RagTrace {
  steps: Array<{ step: string; at: string; payload: Record<string, unknown> }>;
}

export interface RagResult {
  task_type: TaskType;
  rounds_used: number;
  queries_tried: string[];
  evidence_pack: EvidencePack;
  status: RagStatus;
  insufficient_reason: string | null;
  trace: RagTrace;
}

export interface AdaptiveWorkSuccess {
  kind: "success";
  meta: WorkMeta;
  lore: LorePayload;
  rag: RagResult;
}

export interface AdaptiveWorkInsufficient {
  kind: "insufficient_evidence";
  meta: WorkMeta;
  lore: LorePayload;
  rag: RagResult;
}

export type AdaptiveWorkOutcome = AdaptiveWorkSuccess | AdaptiveWorkInsufficient;

/** 仅 debug 模式填充，便于新手对照流水线 */
/** Bangumi 抓取结果（成功或失败）；仅 debug / 日志 */
export interface BangumiFetchDebugEntry {
  query: string;
  ok: boolean;
  status: number | null;
  phase?: string;
  message?: string;
  subject_id?: number;
  /** 单次 query 尝试耗时（毫秒） */
  duration_ms?: number;
}

/** 社区源抓取结果（成功或失败）；仅 debug / 日志，不影响主链路 */
export interface CommunityFetchDebugEntry {
  source: "bilibili" | "nga" | "aweidao";
  query: string;
  ok: boolean;
  status: number | null;
  phase?: string;
  message?: string;
  used_env_cookie?: boolean;
  fetched_bootstrap_cookie?: boolean;
  bilibili_api_code?: number;
  bilibili_api_message?: string;
  bilibili_result_debug?: import("@/lib/data-sources/bilibili-search-parse").BilibiliResultDebugSummary;
  /** 该源整次抓取耗时（毫秒，含多 query 尝试） */
  duration_ms?: number;
}

/** 各外部源并行抓取汇总（debug） */
export interface SourceFetchTimingEntry {
  source: string;
  duration_ms: number;
  ok: boolean;
  error?: string;
  phase?: string;
  message?: string;
}

export interface RagDebugRound {
  round: number;
  planner: RetrievalPlan;
  /** planner 里 enabled 的源 id */
  sources_selected: EvidenceSource[];
  primary_query: string;
  /** 本轮 retrieve 返回的原始条数 */
  evidence_this_round: Evidence[];
  /** 合并后的总条数 */
  merged_evidence_total: number;
  /** Bangumi 检索尝试（含失败原因） */
  bangumi_fetch?: BangumiFetchDebugEntry[];
  /** 社区检索候选 query（优先级序，已去重） */
  community_query_candidates?: string[];
  /** 社区源 bilibili / nga / aweidao 抓取明细（含每次 query 的成功/失败） */
  community_fetch?: CommunityFetchDebugEntry[];
  /** 各源并行抓取耗时与失败原因 */
  source_timings?: SourceFetchTimingEntry[];
  evaluation: EvaluationResult;
  coverage_ok: boolean;
  /** 第二轮未执行时说明原因 */
  skipped?: boolean;
  skip_reason?: string;
}

export interface RagDebugReport {
  input_query: string;
  analyzer: AnalyzerResult;
  /** 环境 RAG_MAX_ROUNDS */
  max_rounds_config: number;
  /** 是否实际执行了第二轮检索（收到新 evidence） */
  second_round_triggered: boolean;
  rounds: RagDebugRound[];
  /** 生成阶段写入 LLM 的 evidence（success）；insufficient 时为用于 EvidencePack 的条目 */
  prompt_evidence: Evidence[];
  prompt_evidence_ids: string[];
  prompt_character_count?: number;
  /** 需设置 RAG_DEBUG_INCLUDE_PROMPT=true */
  prompt_full_text?: string;
  /** 四卡 JSON；insufficient 时为占位 lore */
  lore_json: LorePayload | null;
  outcome: "success" | "insufficient_evidence";
  /** Gemini 交叉验证摘要（与 rag.trace 中 gemini.* 步骤一致） */
  gemini_verification?: Record<string, unknown> | null;
}
