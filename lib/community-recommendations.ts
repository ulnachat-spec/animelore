import {
  fetchAweidaoCommunityContext,
  fetchBilibiliColumnContext,
  fetchNgaCommunityContext
} from "@/lib/data-sources/community-sources";
import {
  communityFetchFailure,
  communityOutcomeToDebug,
  type CommunityFetchOutcome,
  type CommunitySourceId
} from "@/lib/data-sources/community-fetch-types";
import {
  normalizeCommunityArticleUrl,
  rankAndFilterCommunityCandidates
} from "@/lib/community-candidate-quality";
import { deadlineRemaining, withTimeout } from "@/lib/community-fetch-timeout";
import { getCuratedCommunityArticles } from "@/lib/community-curated";
import {
  communityRecsFetchDeadlineMs,
  communityRecsFetchTimeoutMs,
  communityRecsQueryLimit,
  parseCommunityRecsSources
} from "@/lib/community-recs-config";
import {
  buildCommunityRecQueryCandidates,
  pickCommunityQueriesForSource
} from "@/lib/rag/community-queries";
import type {
  CommunityArticleCandidate,
  CommunityArticleSource,
  CommunityRecsFilteredOut,
  WorkMeta
} from "@/lib/types";

function hashUrl(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i += 1) {
    h = (h * 31 + url.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeBlockedContent(title: string, url: string, snippet?: string): boolean {
  const blob = `${title} ${url} ${snippet || ""}`.toLowerCase();
  return (
    /出错啦|验证码|请登录|access denied|403 forbidden|412 precondition/i.test(blob) ||
    /aba\.bilibili\.com/i.test(url)
  );
}

function isReliableCandidate(c: CommunityArticleCandidate): boolean {
  if (!c.title?.trim() || c.title.trim().length < 2) return false;
  if (!isValidHttpUrl(c.url)) return false;
  if (looksLikeBlockedContent(c.title, c.url, c.snippet)) return false;
  return true;
}

function liveOutcomeToCandidate(
  outcome: Extract<CommunityFetchOutcome, { ok: true }>
): CommunityArticleCandidate {
  const { data, source } = outcome;
  const author =
    typeof data.structured?.author === "string" ? data.structured.author : undefined;
  const sourceKey = source as CommunityArticleSource;
  const url = normalizeCommunityArticleUrl(data.url, sourceKey);
  const structured = data.structured || {};
  return {
    id: `live_${source}_${hashUrl(url)}`,
    source: sourceKey,
    title: data.title,
    url,
    author,
    snippet: data.snippet?.slice(0, 500),
    reason: undefined,
    original_url:
      typeof structured.original_url === "string" ? structured.original_url : data.url,
    normalized_url:
      typeof structured.normalized_url === "string" ? structured.normalized_url : url,
    url_format:
      structured.url_format === "opus" ||
      structured.url_format === "read_cv" ||
      structured.url_format === "video" ||
      structured.url_format === "unknown"
        ? structured.url_format
        : undefined,
    resolve_failed_reason:
      typeof structured.resolve_failed_reason === "string"
        ? structured.resolve_failed_reason
        : undefined
  };
}

function timeoutFetchOutcome(source: CommunitySourceId, query: string): CommunityFetchOutcome {
  return communityFetchFailure(source, query, {
    status: null,
    phase: "network",
    message: "fetch_timeout"
  });
}

async function fetchLiveSourceMulti(
  source: "bilibili" | "nga" | "aweidao",
  queries: string[],
  fetchFn: (q: string) => Promise<CommunityFetchOutcome>,
  deadlineMs: number
): Promise<{ candidates: CommunityArticleCandidate[]; fetches: CommunityFetchOutcome[] }> {
  const fetches: CommunityFetchOutcome[] = [];
  const candidates: CommunityArticleCandidate[] = [];
  const seenUrl = new Set<string>();
  const fetchMs = communityRecsFetchTimeoutMs();

  for (const query of queries) {
    if (deadlineRemaining(deadlineMs) < 400) break;

    const outcome =
      (await withTimeout(fetchFn(query), fetchMs, source)) ??
      timeoutFetchOutcome(source, query);

    fetches.push(outcome);

    if (outcome.ok) {
      const c = liveOutcomeToCandidate(outcome);
      if (isReliableCandidate(c)) {
        const key = c.url.toLowerCase();
        if (!seenUrl.has(key)) {
          seenUrl.add(key);
          candidates.push(c);
        }
      }
    }

    if (candidates.length >= 1) {
      return { candidates, fetches };
    }
  }

  return { candidates, fetches };
}

export interface FetchCommunityCandidatesResult {
  candidates: CommunityArticleCandidate[];
  fetches: CommunityFetchOutcome[];
  generated_queries: string[];
  filtered_out: CommunityRecsFilteredOut[];
  raw_count: number;
}

export async function fetchCommunityArticleCandidates(input: {
  query: string;
  meta: WorkMeta;
  aliases?: string[];
  bangumiNameCn?: string | null;
  deadlineMs?: number;
}): Promise<FetchCommunityCandidatesResult> {
  const sources = parseCommunityRecsSources();
  const deadlineMs = input.deadlineMs ?? Date.now() + communityRecsFetchDeadlineMs();
  const rawCandidates: CommunityArticleCandidate[] = [];
  const allFetches: CommunityFetchOutcome[] = [];

  const generated_queries = pickCommunityQueriesForSource(
    buildCommunityRecQueryCandidates({
      userQuery: input.query,
      primaryQuery: input.query,
      meta: input.meta,
      bangumiNameCn: input.bangumiNameCn
    }),
    communityRecsQueryLimit()
  );

  if (sources.has("curated")) {
    rawCandidates.push(
      ...getCuratedCommunityArticles({
        workTitle: input.meta.title,
        nativeTitle: input.meta.nativeTitle,
        aliases: [input.query, ...(input.aliases || [])]
      })
    );
  }

  const liveSources = ["bilibili", "nga", "aweidao"] as const;
  const tasks: Promise<{ candidates: CommunityArticleCandidate[]; fetches: CommunityFetchOutcome[] }>[] =
    [];

  if (sources.has("bilibili")) {
    tasks.push(
      fetchLiveSourceMulti("bilibili", generated_queries, fetchBilibiliColumnContext, deadlineMs)
    );
  }
  if (sources.has("nga")) {
    tasks.push(fetchLiveSourceMulti("nga", generated_queries, fetchNgaCommunityContext, deadlineMs));
  }
  if (sources.has("aweidao")) {
    tasks.push(
      fetchLiveSourceMulti("aweidao", generated_queries, fetchAweidaoCommunityContext, deadlineMs)
    );
  }

  if (tasks.length > 0 && deadlineRemaining(deadlineMs) > 300) {
    const remain = deadlineRemaining(deadlineMs);
    const results = await Promise.race([
      Promise.all(tasks),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), remain))
    ]);

    if (results) {
      for (const r of results) {
        rawCandidates.push(...r.candidates);
        allFetches.push(...r.fetches);
      }
    }
  }

  const raw_count = rawCandidates.length;
  const { candidates, filtered_out } = rankAndFilterCommunityCandidates(rawCandidates);

  return {
    candidates,
    fetches: allFetches,
    generated_queries,
    filtered_out,
    raw_count
  };
}

export function communityFetchesToDebug(
  fetches: CommunityFetchOutcome[]
): ReturnType<typeof communityOutcomeToDebug>[] {
  return fetches.map(communityOutcomeToDebug);
}
