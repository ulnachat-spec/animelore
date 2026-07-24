import type { ColdQuiz, ColdRecommendationRaw, ColdSubtype, ColdTopicType } from "@/lib/types";

export type ColdEvidenceSource = "anilist" | "bangumi" | "wikipedia" | "moegirl" | "web";

export type ColdEvidenceRole = "hard_fact" | "context" | "community";

export interface ColdEvidence {
  id: string;
  source: ColdEvidenceSource;
  title: string;
  url: string;
  snippet: string;
  role: ColdEvidenceRole;
}

export type ConceptWritingAngle =
  | "etymology"
  | "archetype"
  | "misuse"
  | "lineage"
  | "counterintuitive";

export type ColdContrastAngle =
  | "expectation"
  | "identity"
  | "reputation"
  | "production"
  | "community";

export interface ColdTopicPlan {
  topic_type: ColdTopicType;
  seed_keyword: string;
  search_queries: string[];
  angle_hint: string;
  topic_key: string;
  /** concept：语源探寻角度；work/phenomenon：反差类型 */
  writing_angle?: ConceptWritingAngle | ColdContrastAngle;
}

export type ColdVerificationStatus = "verified" | "skipped" | "failed" | "fallback";

export interface HomeHookRawV2 {
  topic_type: ColdTopicType;
  topic_key: string;
  cold_subtype?: ColdSubtype;
  hook: string;
  blurb?: string;
  /** 本篇切入角度（语源/反差等），一句话 */
  angle?: string;
  /** 正文如何接到推荐作品（内部校验用，界面可不展示） */
  example_bridge?: string;
  /** 内部 debug：本次使用的叙事结构 */
  style_pattern?:
    | "misunderstanding"
    | "scene_first"
    | "etymology"
    | "audience_psychology"
    | "work_contrast";
  insight: string;
  quiz?: ColdQuiz | null;
  source_urls: string[];
  confidence: number;
  recommendations: ColdRecommendationRaw[];
}

export interface ColdVerificationResult {
  ok: boolean;
  status: ColdVerificationStatus;
  reasons: string[];
  rules_passed: boolean;
  llm_checked: boolean;
  llm_note?: string;
}

export interface ColdHookRecord {
  id: string;
  /** 生成该记录时使用的冷知识 prompt / 验真规则版本 */
  prompt_version?: string;
  topic_type: ColdTopicType;
  cold_subtype?: ColdSubtype;
  topic_key: string;
  hook: string;
  blurb?: string;
  angle?: string;
  example_bridge?: string;
  insight: string;
  quiz?: ColdQuiz | null;
  source_urls: string[];
  recommendations: ColdRecommendationRaw[];
  verification_status: ColdVerificationStatus;
  confidence?: number;
  created_at: string;
  last_shown_at?: string;
  shown_count: number;
}

export type HomeHookSource = "library" | "cache" | "generated" | "fallback";

export interface HomeHookDebugInfo {
  mode: HomeHookSource;
  source?: HomeHookSource;
  selected_topic_type?: ColdTopicType;
  selected_topic_key?: string;
  seed_keyword?: string;
  library_size: number;
  library_verified_count?: number;
  selected_from_library: boolean;
  recent_topics: string[];
  cache_hit: boolean;
  refresh_requested: boolean;
  rotation_mode?: string;
  evidence_count?: number;
  verification_status?: ColdVerificationStatus;
  generation_skipped_reason?: string;
  library_pick_note?: string;
  plan?: ColdTopicPlan;
  evidence?: ColdEvidence[];
  verification?: ColdVerificationResult;
  final_prompt?: string;
  llm_raw?: unknown;
  candidates?: unknown[];
  duplicate_avoidance?: {
    recent_topic_keys: string[];
    recent_hooks: string[];
    picked_library_id?: string;
  };
  retried_generation?: boolean;
  force_regenerate?: boolean;
  prompt_version?: string;
  recommendation_target_count?: number;
  recommendation_actual_count?: number;
  recommendation_shortfall_reason?: string;
}

export type PickColdHookResult = {
  record: ColdHookRecord | null;
  candidates_count: number;
  note?: string;
};
