import {
  communityFetchesToDebug,
  fetchCommunityArticleCandidates
} from "@/lib/community-recommendations";
import { generateCommunityArticleRecommendations } from "@/lib/community-reasoner";
import {
  communityRecsEnabled,
  communityRecsFetchDeadlineMs,
  communityRecsMax,
  communityRecsReasonerTimeoutMs,
  parseCommunityRecsSources
} from "@/lib/community-recs-config";
import { withTimeout } from "@/lib/community-fetch-timeout";
import type {
  CommunityArticleCandidate,
  CommunityArticleRec,
  CommunityRecsDebug,
  WorkMeta
} from "@/lib/types";
import { ragLog } from "@/lib/rag/logger";

function curatedFallbackRecs(candidates: CommunityArticleCandidate[]): CommunityArticleRec[] {
  return candidates
    .filter((c) => c.source === "manual")
    .slice(0, communityRecsMax())
    .map((c) => ({
      id: c.id,
      source: c.source,
      title: c.title,
      url: c.url,
      author: c.author,
      published_at: c.published_at,
      snippet: c.snippet,
      reason:
        c.snippet && c.snippet.length > 10
          ? `延伸阅读：${c.snippet.slice(0, 72)}${c.snippet.length > 72 ? "…" : ""}`
          : `推荐阅读：${c.title}（社区延伸，非官方事实来源）`
    }));
}

function candidatesToRecsFallback(
  candidates: CommunityArticleCandidate[]
): CommunityArticleRec[] {
  return candidates.slice(0, communityRecsMax()).map((c) => ({
    id: c.id,
    source: c.source,
    title: c.title,
    url: c.url,
    author: c.author,
    published_at: c.published_at,
    snippet: c.snippet,
    reason:
      c.snippet && c.snippet.length > 10
        ? `延伸阅读：${c.snippet.slice(0, 72)}${c.snippet.length > 72 ? "…" : ""}`
        : `推荐阅读：${c.title}（社区观点/考据延伸，非官方事实来源）`
  }));
}

export interface BuildCommunityRecsInput {
  query: string;
  meta: WorkMeta;
  aliases?: string[];
  bangumiNameCn?: string | null;
  /** 为 true 时始终聚合候选与 fetch 明细（供 debug API） */
  collectDebug?: boolean;
  /** 为 false 时只聚合候选，不调用 LLM */
  generateRecommendations?: boolean;
  /** 整体截止时间戳（毫秒） */
  deadlineMs?: number;
}

export interface BuildCommunityRecsResult {
  recs: CommunityArticleRec[];
  debug?: CommunityRecsDebug;
}

async function buildCommunityRecsInner(
  input: BuildCommunityRecsInput
): Promise<BuildCommunityRecsResult> {
  const enabled = communityRecsEnabled();
  const sources = [...parseCommunityRecsSources()];
  const shouldGenerate = input.generateRecommendations ?? enabled;
  const shouldCollect = input.collectDebug ?? false;
  const deadlineMs = input.deadlineMs ?? Date.now() + communityRecsFetchDeadlineMs();

  const debugBase: CommunityRecsDebug = {
    enabled,
    sources_config: sources,
    candidates: [],
    fetches: [],
    recommendations: []
  };

  if (!enabled && !shouldCollect) {
    return { recs: [] };
  }

  if (!enabled && shouldCollect) {
    return {
      recs: [],
      debug: {
        ...debugBase,
        skipped_reason: "COMMUNITY_RECS_ENABLED=false"
      }
    };
  }

  const fetched = await fetchCommunityArticleCandidates({
    query: input.query,
    meta: input.meta,
    aliases: input.aliases,
    bangumiNameCn: input.bangumiNameCn,
    deadlineMs
  });

  debugBase.generated_queries = fetched.generated_queries;
  debugBase.filtered_out = fetched.filtered_out;
  debugBase.candidates = fetched.candidates;
  debugBase.fetches = communityFetchesToDebug(fetched.fetches);

  // 生产环境诊断：仅输出白名单化的状态码、阶段与「是否读取到 Cookie」标记，
  // 绝不记录 Cookie 值、请求头或完整第三方响应。这样才能区分变量未注入、会话失效、风控与无结果。
  ragLog("community_recs.sources", {
    fetches: debugBase.fetches.map((item) => ({
      source: item.source,
      ok: item.ok,
      status: item.status,
      phase: item.phase,
      used_env_cookie: item.used_env_cookie,
      fetched_bootstrap_cookie: item.fetched_bootstrap_cookie,
      bilibili_api_code: item.bilibili_api_code,
      bilibili_api_message: item.bilibili_api_message
    })),
    candidates_by_source: fetched.candidates.reduce<Record<string, number>>((counts, candidate) => {
      counts[candidate.source] = (counts[candidate.source] ?? 0) + 1;
      return counts;
    }, {})
  });

  if (!shouldGenerate) {
    return { recs: [], debug: shouldCollect ? debugBase : undefined };
  }

  if (fetched.candidates.length === 0) {
    return { recs: [], debug: shouldCollect ? debugBase : undefined };
  }

  const reasoned = await withTimeout(
    generateCommunityArticleRecommendations({
      workTitle: input.meta.title,
      candidates: fetched.candidates,
      maxItems: communityRecsMax()
    }),
    communityRecsReasonerTimeoutMs()
  );

  let recs = reasoned?.recs ?? [];

  if (reasoned?.error) {
    debugBase.reasoner_error = reasoned.error;
  } else if (!reasoned) {
    debugBase.reasoner_error = "reasoner_timeout";
  } else if (fetched.candidates.length > 0 && recs.length === 0) {
    debugBase.reasoner_error = "LLM returned no recommendations";
  }

  if (recs.length === 0 && fetched.candidates.some((c) => c.source === "manual")) {
    const fallback = curatedFallbackRecs(fetched.candidates);
    if (fallback.length > 0) {
      recs = fallback;
      debugBase.reasoner_error = [debugBase.reasoner_error, "used curated fallback"]
        .filter(Boolean)
        .join("; ");
    }
  }

  if (recs.length === 0 && fetched.candidates.length > 0) {
    recs = candidatesToRecsFallback(fetched.candidates);
    debugBase.reasoner_error = [debugBase.reasoner_error, "used scored candidate fallback"]
      .filter(Boolean)
      .join("; ");
  }

  debugBase.recommendations = recs;

  ragLog("community_recs.done", {
    enabled,
    queries: fetched.generated_queries.length,
    raw: fetched.raw_count,
    candidates: fetched.candidates.length,
    filtered: fetched.filtered_out.length,
    recs: recs.length
  });

  return {
    recs,
    debug: shouldCollect ? debugBase : undefined
  };
}

/**
 * 作品页社区延伸阅读：curated 优先，实时源 fail-open；失败不影响主链路。
 */
export async function buildCommunityRecsForWork(
  input: BuildCommunityRecsInput
): Promise<BuildCommunityRecsResult> {
  try {
    return await buildCommunityRecsInner({
      ...input,
      deadlineMs: input.deadlineMs ?? Date.now() + communityRecsFetchDeadlineMs()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ragLog("community_recs.error", { query: input.query, message });
    return {
      recs: [],
      debug: input.collectDebug
        ? {
            enabled: communityRecsEnabled(),
            sources_config: [...parseCommunityRecsSources()],
            candidates: [],
            fetches: [],
            recommendations: [],
            error: message
          }
        : undefined
    };
  }
}
