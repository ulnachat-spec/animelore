import type { CommunityArticleEvidence } from "@/lib/data-sources/community-sources";

export type CommunitySourceId = "bilibili" | "nga" | "aweidao";

export type CommunityFetchPhase =
  | "http"
  | "http_412"
  | "api_code"
  | "anti_bot"
  | "anti_bot_html"
  | "parse"
  | "empty"
  | "network";

import type { BilibiliResultDebugSummary } from "@/lib/data-sources/bilibili-search-parse";

/** B站等源在 debug 中附带的抓取上下文 */
export interface CommunityFetchMeta {
  used_env_cookie?: boolean;
  fetched_bootstrap_cookie?: boolean;
  bilibili_api_code?: number;
  bilibili_api_message?: string;
  /** 实际采用的 B站搜索方式：wbi_session / wbi_anonymous / plain_session */
  bilibili_attempt?: string;
  /** B站搜索 result 结构摘要（不含 Cookie / 完整响应体） */
  bilibili_result_debug?: BilibiliResultDebugSummary;
}

export interface CommunityFetchFailure {
  source: CommunitySourceId;
  query: string;
  ok: false;
  /** HTTP 状态码；网络错误等为 null */
  status: number | null;
  phase: CommunityFetchPhase;
  message: string;
  meta?: CommunityFetchMeta;
}

export interface CommunityFetchSuccess {
  source: CommunitySourceId;
  query: string;
  ok: true;
  data: CommunityArticleEvidence;
  meta?: CommunityFetchMeta;
}

export type CommunityFetchOutcome = CommunityFetchSuccess | CommunityFetchFailure;

export function communityFetchFailure(
  source: CommunitySourceId,
  query: string,
  args: {
    status: number | null;
    phase: CommunityFetchPhase;
    message: string;
    meta?: CommunityFetchMeta;
  }
): CommunityFetchFailure {
  return {
    source,
    query,
    ok: false,
    status: args.status,
    phase: args.phase,
    message: args.message,
    meta: args.meta
  };
}

export function communityFetchSuccess(
  source: CommunitySourceId,
  query: string,
  data: CommunityArticleEvidence,
  meta?: CommunityFetchMeta
): CommunityFetchSuccess {
  return { source, query, ok: true, data, meta };
}

function pickSafeDebugMeta(meta?: CommunityFetchMeta): Partial<CommunityFetchMeta> {
  if (!meta) return {};
  const out: Partial<CommunityFetchMeta> = {};
  if (meta.used_env_cookie !== undefined) out.used_env_cookie = meta.used_env_cookie;
  if (meta.fetched_bootstrap_cookie !== undefined) {
    out.fetched_bootstrap_cookie = meta.fetched_bootstrap_cookie;
  }
  if (meta.bilibili_api_code !== undefined) out.bilibili_api_code = meta.bilibili_api_code;
  if (meta.bilibili_api_message !== undefined) {
    out.bilibili_api_message = meta.bilibili_api_message;
  }
  if (meta.bilibili_result_debug !== undefined) {
    out.bilibili_result_debug = meta.bilibili_result_debug;
  }
  return out;
}

/** 将 outcome 转为 debug / community_fetch 条目（仅白名单字段，不含 Cookie） */
export function communityOutcomeToDebug(o: CommunityFetchOutcome): {
  source: CommunitySourceId;
  query: string;
  ok: boolean;
  status: number | null;
  phase?: string;
  message?: string;
  used_env_cookie?: boolean;
  fetched_bootstrap_cookie?: boolean;
  bilibili_api_code?: number;
  bilibili_api_message?: string;
  bilibili_result_debug?: BilibiliResultDebugSummary;
} {
  const safeMeta = pickSafeDebugMeta(o.meta);
  if (o.ok) {
    return {
      source: o.source,
      query: o.query,
      ok: true,
      status: 200,
      message: "ok",
      ...safeMeta
    };
  }
  return {
    source: o.source,
    query: o.query,
    ok: false,
    status: o.status,
    phase: o.phase,
    message: o.message,
    ...safeMeta
  };
}
