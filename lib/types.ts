export type LoreCardId = "legacy" | "meme" | "behind" | "lineage";

/** 「换一批」时各板块已生成过的 headline / intro / points 文本 */
export type SeenContentByCard = Record<LoreCardId, string[]>;

export interface LoreCard {
  id: LoreCardId;
  en_label: string;
  zh_name: string;
  headline: string;
  intro: string;
  points: string[];
  source: string;
  /** 本张卡片内容实际依据的页面 URL（可多来源） */
  source_urls: string[];
}

export interface LorePayload {
  work_title: string;
  cards: LoreCard[];
  bottom_hook: {
    work: string;
    hook: string;
  };
}

export interface WorkMeta {
  title: string;
  nativeTitle?: string;
  /** 与 `fetchAniListMeta` 解析结果一致，用于相关推荐锁定同一部 AniList 条目 */
  anilistId?: number;
  seasonYear?: number;
  season?: string;
  studios?: string[];
  coverImage?: string;
}

export type ColdTopicType = "work" | "concept" | "phenomenon";

export type ColdSubtype =
  | "concept_origin"
  | "term_origin"
  | "meme_origin"
  | "work_fact"
  | "character_fact"
  | "production_note"
  | "staff_fact"
  | "genre_trope"
  | "trope_explanation"
  | "community_discussion"
  | "community_take";

export interface ColdQuiz {
  statement: string;
  answer: boolean;
  explanation: string;
}

/** 推荐项：LLM 只选候选池 candidate_id，服务端 enrich 后补全展示字段 */
export interface ColdRecommendationRaw {
  candidate_id: string;
  /** 20～90 字，须说明看这部如何理解当前 hook */
  reason: string;
  anilistId?: number;
  anime_title?: string;
  allowNonJapanese?: boolean;
}

export interface ColdRecommendationEnriched extends ColdRecommendationRaw {
  searchQuery: string;
  displayTitle: string;
  coverImage?: string;
  nativeTitle?: string;
}

export type ColdHookVerificationStatus =
  | "verified"
  | "skipped"
  | "failed"
  | "fallback";

export interface ColdHookPayload {
  /** Stable library record id used by shareable /cold/[id] routes. */
  record_id?: string;
  topic_type: ColdTopicType;
  cold_subtype?: ColdSubtype;
  topic_key?: string;
  /** 冷知识标题（首页一句话） */
  hook: string;
  /** Roam 短卡 teaser，35～70 字左右 */
  blurb?: string;
  /** 详情页冷知识正文，约 150～250 字，朋友聊天式 + 作品入口 */
  insight: string;
  /** 可事实判断时才出现；概念解释类保持为空 */
  quiz?: ColdQuiz | null;
  /** 切入角度（可选展示） */
  angle?: string;
  example_bridge?: string;
  style_pattern?: string;
  source_urls?: string[];
  verification_status?: ColdHookVerificationStatus;
  confidence?: number;
  /** 与 lib/cold-prompt-version 同步，供 session 校验 */
  prompt_version?: string;
  recommendations: ColdRecommendationEnriched[];
}

/** 作品页底部「还想看」：仅来自 AniList 可验证关系 / 推荐 / 题材或制作公司重叠 */
export type CommunityArticleSource =
  | "bilibili"
  | "nga"
  | "aweidao"
  | "zhihu"
  | "douban"
  | "bangumi"
  | "manual"
  | "web";

/** 社区延伸阅读候选（聚合后、LLM 挑选前） */
export interface CommunityArticleCandidate {
  id: string;
  source: CommunityArticleSource;
  title: string;
  url: string;
  author?: string;
  published_at?: string;
  snippet?: string;
  reason?: string;
  /** 考据/解析向排序分（仅服务端 debug / 筛选） */
  qualityScore?: number;
  original_url?: string;
  normalized_url?: string;
  url_format?: "opus" | "read_cv" | "video" | "unknown";
  resolve_failed_reason?: string;
}

/** 作品页「中文社区考据与创作推荐」展示项 */
export interface CommunityArticleRec {
  id: string;
  source: CommunityArticleSource;
  title: string;
  url: string;
  author?: string;
  published_at?: string;
  snippet?: string;
  reason: string;
}

export interface CommunityRecsFilteredOut {
  id: string;
  title: string;
  source: string;
  reason: string;
  detail?: string;
}

export interface CommunityRecsDebug {
  enabled: boolean;
  sources_config: string[];
  generated_queries?: string[];
  filtered_out?: CommunityRecsFilteredOut[];
  community_recs_timeout?: boolean;
  candidates: CommunityArticleCandidate[];
  fetches: Array<{
    source: string;
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
  }>;
  recommendations: CommunityArticleRec[];
  skipped_reason?: string;
  /** 候选非空但 LLM 推荐语生成失败时的原因 */
  reasoner_error?: string;
  error?: string;
}

export interface WorkRelatedRec {
  anilistId: number;
  title: string;
  displayTitle: string;
  coverImage?: string;
  seasonYear?: number;
  /** AniList MediaFormat，如 TV、MOVIE、OVA */
  format?: string | null;
  /** 与当前作的关系说明（不编造，仅陈述数据来源与事实） */
  reason: string;
  /** 跳转 `/work/[query]` 时使用的检索词 */
  searchQuery: string;
}
