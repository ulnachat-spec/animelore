import {
  fetchAniListMeta,
  fetchBangumiSubjectOutcome,
  bangumiSubjectToSnippet,
  fetchAweidaoCommunityContext,
  fetchBilibiliColumnContext,
  fetchMoegirlContext,
  fetchNgaCommunityContext,
  fetchWikipediaSummaryBestEffort,
  fetchWikipediaTitleCandidates,
  wikipediaPageUrl
} from "@/lib/data-sources";
import type { BangumiFetchOutcome } from "@/lib/data-sources/bangumi-fetch-types";
import {
  communityOutcomeToDebug,
  type CommunityFetchOutcome,
  type CommunityFetchSuccess,
  type CommunitySourceId
} from "@/lib/data-sources/community-fetch-types";
import { withTimeout } from "@/lib/community-fetch-timeout";
import {
  buildBangumiSearchQueries,
  buildCommunityQueryCandidates,
  pickCommunityQueriesForSource
} from "@/lib/rag/community-queries";
import { ragDeferCommunityEvidence } from "@/lib/rag/fast-path";
import { ragLog } from "@/lib/rag/logger";
import type {
  BangumiFetchDebugEntry,
  CommunityFetchDebugEntry,
  Evidence,
  EvidenceSource,
  SourceFetchTimingEntry
} from "@/lib/rag/types";
import type { WorkMeta } from "@/lib/types";

let evSeq = 0;

function ragSourceTimeoutMs(): number {
  const v = process.env.RAG_SOURCE_TIMEOUT_MS;
  if (!v) return 8000;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 8000;
  return Math.max(1500, Math.min(n, 30000));
}

function nextId(source: string): string {
  evSeq += 1;
  return `${source}_${evSeq}_${Date.now()}`;
}

function formatMetaSnippet(meta: WorkMeta): string {
  return [
    `title: ${meta.title}`,
    meta.nativeTitle ? `nativeTitle: ${meta.nativeTitle}` : "",
    meta.seasonYear != null ? `seasonYear: ${meta.seasonYear}` : "",
    meta.season ? `season: ${meta.season}` : "",
    meta.studios?.length ? `studios: ${meta.studios.join(" / ")}` : "",
    meta.coverImage ? `coverImage: ${meta.coverImage}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function sourceEnabled(enabledSources: EvidenceSource[] | undefined, id: EvidenceSource): boolean {
  if (!enabledSources) return true;
  return enabledSources.includes(id);
}

export interface RetrieveWorkRoundParams {
  primaryQuery: string;
  userQuery?: string;
  metaHint?: WorkMeta | null;
  round: number;
  tryAlternateTitles: boolean;
  enabledSources?: EvidenceSource[];
}

interface TimedFetchResult<T> {
  value: T | null;
  duration_ms: number;
  timed_out: boolean;
  error?: string;
}

async function runTimedFetch<T>(
  source: string,
  fn: () => Promise<T>,
  timeoutMs: number = ragSourceTimeoutMs()
): Promise<TimedFetchResult<T>> {
  const started = Date.now();
  try {
    const value = await withTimeout(fn(), timeoutMs, source);
    const duration_ms = Date.now() - started;
    if (value === null) {
      return { value: null, duration_ms, timed_out: true, error: "timeout" };
    }
    return { value, duration_ms, timed_out: false };
  } catch (err) {
    return {
      value: null,
      duration_ms: Date.now() - started,
      timed_out: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

function timingEntry(
  source: string,
  result: TimedFetchResult<unknown>,
  extra?: { ok?: boolean; phase?: string; message?: string }
): SourceFetchTimingEntry {
  const ok = extra?.ok ?? (result.value != null && !result.timed_out && !result.error);
  return {
    source,
    duration_ms: result.duration_ms,
    ok,
    error: result.timed_out ? "timeout" : result.error,
    phase: extra?.phase ?? (result.timed_out ? "timeout" : undefined),
    message: extra?.message
  };
}

function bangumiOutcomeToDebug(
  o: BangumiFetchOutcome,
  duration_ms: number
): BangumiFetchDebugEntry {
  if (o.ok) {
    return {
      query: o.query,
      ok: true,
      status: 200,
      message: "ok",
      subject_id: o.data.id,
      duration_ms
    };
  }
  return {
    query: o.query,
    ok: false,
    status: o.status,
    phase: o.phase,
    message: o.message,
    duration_ms
  };
}

function outcomeToDebugEntry(
  o: CommunityFetchOutcome,
  duration_ms?: number
): CommunityFetchDebugEntry {
  return { ...communityOutcomeToDebug(o), duration_ms };
}

function logCommunityFetch(o: CommunityFetchOutcome): void {
  if (o.ok) {
    ragLog("retriever.community_ok", {
      source: o.source,
      query: o.query,
      status: 200,
      title: o.data.title
    });
    return;
  }
  ragLog("retriever.community_fetch_failed", {
    source: o.source,
    query: o.query,
    status: o.status,
    phase: o.phase,
    message: o.message
  });
}

function appendCommunityEvidence(
  outcome: CommunityFetchSuccess,
  evidence: Evidence[],
  round: number
): void {
  const { data } = outcome;
  evidence.push({
    id: nextId(outcome.source),
    source: outcome.source,
    title: data.title,
    url: data.url,
    snippet: data.snippet.slice(0, 4000),
    structured: { ...data.structured, evidenceRole: "community" },
    retrieval_query: outcome.query,
    round,
    retrieved_at: new Date().toISOString()
  });
}

async function fetchCommunitySourceWithQueries(
  source: CommunitySourceId,
  queries: string[],
  fetchFn: (query: string) => Promise<CommunityFetchOutcome>,
  round: number
): Promise<{ evidence: Evidence[]; fetches: CommunityFetchDebugEntry[]; hit: boolean }> {
  const evidence: Evidence[] = [];
  const fetches: CommunityFetchDebugEntry[] = [];
  const bundleStart = Date.now();

  for (const query of queries) {
    const qStart = Date.now();
    const outcome = await fetchFn(query);
    const qMs = Date.now() - qStart;
    logCommunityFetch(outcome);
    fetches.push(outcomeToDebugEntry(outcome, qMs));
    if (outcome.ok) {
      appendCommunityEvidence(outcome, evidence, round);
      ragLog("retriever.community_hit", { source, query: outcome.query, round });
      const totalMs = Date.now() - bundleStart;
      for (const f of fetches) {
        if (f.duration_ms == null) f.duration_ms = totalMs;
      }
      if (fetches.length > 0) fetches[fetches.length - 1]!.duration_ms = totalMs;
      return { evidence, fetches, hit: true };
    }
  }

  const totalMs = Date.now() - bundleStart;
  if (fetches.length > 0) {
    fetches[fetches.length - 1]!.duration_ms = totalMs;
  }
  return { evidence, fetches, hit: false };
}

interface BangumiBundle {
  evidence: Evidence[];
  bangumiFetches: BangumiFetchDebugEntry[];
  bangumiNameCn: string | null;
  ok: boolean;
}

async function fetchBangumiBundle(input: {
  bangumiSearchQueries: string[];
  round: number;
  now: string;
}): Promise<BangumiBundle> {
  const { bangumiSearchQueries, round, now } = input;
  const bangumiFetches: BangumiFetchDebugEntry[] = [];
  let bangumiNameCn: string | null = null;

  for (const bgmQuery of bangumiSearchQueries) {
    const qStart = Date.now();
    const outcome = await fetchBangumiSubjectOutcome(bgmQuery);
    const qMs = Date.now() - qStart;
    bangumiFetches.push(bangumiOutcomeToDebug(outcome, qMs));

    if (outcome.ok) {
      const bgm = outcome.data;
      bangumiNameCn = bgm.name_cn?.trim() || null;
      ragLog("retriever.bangumi", { round, subject_id: bgm.id, query: bgmQuery });
      return {
        ok: true,
        bangumiNameCn,
        bangumiFetches,
        evidence: [
          {
            id: nextId("bangumi"),
            source: "bangumi",
            title: bgm.name_cn || bgm.name,
            url: bgm.url,
            snippet: bangumiSubjectToSnippet(bgm),
            structured: {
              ...bgm.structured,
              name_cn: bgm.name_cn,
              rating: bgm.rating,
              evidenceRole: "hard_fact"
            },
            retrieval_query: bgmQuery,
            round,
            retrieved_at: now
          }
        ]
      };
    }

    ragLog("retriever.bangumi_fetch_failed", {
      round,
      query: outcome.query,
      status: outcome.status,
      phase: outcome.phase,
      message: outcome.message,
      duration_ms: qMs
    });
  }

  return { ok: false, bangumiNameCn: null, bangumiFetches, evidence: [] };
}

interface WikiBundle {
  evidence: Evidence[];
  ok: boolean;
}

async function fetchWikipediaBundle(input: {
  wikiQuery: string;
  preferZhWiki: boolean;
  round: number;
  now: string;
}): Promise<WikiBundle> {
  const wiki = await fetchWikipediaSummaryBestEffort(input.wikiQuery, input.preferZhWiki);
  if (!wiki) return { ok: false, evidence: [] };
  return {
    ok: true,
    evidence: [
      {
        id: nextId("wikipedia"),
        source: "wikipedia",
        title: wiki.title,
        url: wikipediaPageUrl(wiki.title, wiki.lang),
        snippet: wiki.extract.slice(0, 4000),
        structured: { evidenceRole: "hard_fact", wikiLang: wiki.lang },
        retrieval_query: input.wikiQuery,
        round: input.round,
        retrieved_at: input.now
      }
    ]
  };
}

interface MoegirlBundle {
  evidence: Evidence[];
  ok: boolean;
}

async function fetchMoegirlBundle(input: {
  mgQuery: string;
  round: number;
  now: string;
}): Promise<MoegirlBundle> {
  const mg = await fetchMoegirlContext(input.mgQuery);
  if (!mg) return { ok: false, evidence: [] };
  return {
    ok: true,
    evidence: [
      {
        id: nextId("moegirl"),
        source: "moegirl",
        title: mg.title,
        url: mg.url,
        snippet: (mg.extract || "").slice(0, 4000),
        structured: { moegirlTitle: mg.title, evidenceRole: "context" },
        retrieval_query: input.mgQuery,
        round: input.round,
        retrieved_at: input.now
      }
    ]
  };
}

interface CommunityBundle {
  evidence: Evidence[];
  fetches: CommunityFetchDebugEntry[];
  ok: boolean;
}

async function fetchCommunityBundle(
  source: CommunitySourceId,
  queries: string[],
  round: number
): Promise<CommunityBundle> {
  const fetchFn =
    source === "bilibili"
      ? fetchBilibiliColumnContext
      : source === "nga"
        ? fetchNgaCommunityContext
        : fetchAweidaoCommunityContext;

  const result = await fetchCommunitySourceWithQueries(source, queries, fetchFn, round);
  return {
    evidence: result.evidence,
    fetches: result.fetches,
    ok: result.hit
  };
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/\s+/g, "");
}

export async function retrieveWorkEvidenceRound(
  params: RetrieveWorkRoundParams
): Promise<{
  evidence: Evidence[];
  meta: WorkMeta;
  communityFetches: CommunityFetchDebugEntry[];
  communityQueryCandidates: string[];
  bangumiFetches: BangumiFetchDebugEntry[];
  sourceTimings: SourceFetchTimingEntry[];
}> {
  const { primaryQuery, round, tryAlternateTitles, enabledSources } = params;
  const userQuery = params.userQuery?.trim() || primaryQuery;
  const timeoutMs = ragSourceTimeoutMs();
  const evidence: Evidence[] = [];
  const communityFetches: CommunityFetchDebugEntry[] = [];
  const bangumiFetches: BangumiFetchDebugEntry[] = [];
  const sourceTimings: SourceFetchTimingEntry[] = [];
  const now = new Date().toISOString();

  let meta: WorkMeta;

  if (params.metaHint) {
    meta = params.metaHint;
    sourceTimings.push({
      source: "anilist_meta",
      duration_ms: 0,
      ok: true,
      message: "meta_hint_reused"
    });
  } else {
    const metaTimed = await runTimedFetch(
      "anilist_meta",
      () => fetchAniListMeta(primaryQuery),
      timeoutMs
    );
    meta = metaTimed.value ?? { title: primaryQuery };
    sourceTimings.push(
      timingEntry("anilist_meta", metaTimed, {
        ok: metaTimed.value != null,
        message: metaTimed.value ? "resolved" : metaTimed.error ?? "fallback_title"
      })
    );
  }

  ragLog("retriever.anilist_meta", {
    primaryQuery,
    round,
    resolved_title: meta.title,
    enabled_sources: enabledSources,
    duration_ms: sourceTimings.find((t) => t.source === "anilist_meta")?.duration_ms
  });

  const hasResolvedAniListMeta = Boolean(
    meta.anilistId || meta.coverImage || meta.nativeTitle || meta.seasonYear || meta.studios?.length
  );
  if (sourceEnabled(enabledSources, "anilist") && hasResolvedAniListMeta) {
    evidence.push({
      id: nextId("anilist"),
      source: "anilist",
      title: meta.title,
      url: meta.anilistId ? `https://anilist.co/anime/${meta.anilistId}` : null,
      snippet: formatMetaSnippet(meta),
      structured: { workMeta: meta, evidenceRole: "hard_fact" },
      retrieval_query: primaryQuery,
      round,
      retrieved_at: now
    });
  }

  const mgQuery = meta.nativeTitle || meta.title || primaryQuery;
  const wikiQuery = meta.title || primaryQuery;
  const preferZhWiki = hasCjk(primaryQuery) || hasCjk(meta.title || "");
  const bangumiSearchQueries = buildBangumiSearchQueries({ userQuery, primaryQuery, meta });

  const communityCandidates = buildCommunityQueryCandidates({
    userQuery,
    primaryQuery,
    meta,
    bangumiNameCn: null
  });
  const communityQueriesPerSource = pickCommunityQueriesForSource(communityCandidates);

  ragLog("retriever.community_queries", {
    round,
    candidates: communityCandidates,
    per_source: communityQueriesPerSource
  });

  type ParallelTask = {
    source: string;
    run: () => Promise<void>;
  };

  const parallelTasks: ParallelTask[] = [];

  if (sourceEnabled(enabledSources, "bangumi")) {
    parallelTasks.push({
      source: "bangumi",
      run: async () => {
        const timed = await runTimedFetch(
          "bangumi",
          () => fetchBangumiBundle({ bangumiSearchQueries, round, now }),
          timeoutMs
        );
        if (timed.value) {
          bangumiFetches.push(...timed.value.bangumiFetches);
          evidence.push(...timed.value.evidence);
        } else if (timed.timed_out || timed.error) {
          bangumiFetches.push({
            query: bangumiSearchQueries[0] ?? primaryQuery,
            ok: false,
            status: null,
            phase: timed.timed_out ? "timeout" : "error",
            message: timed.error ?? "timeout",
            duration_ms: timed.duration_ms
          });
        }
        sourceTimings.push(
          timingEntry("bangumi", timed, {
            ok: timed.value?.ok ?? false,
            message: timed.value?.ok ? "hit" : timed.error ?? "no_hit"
          })
        );
      }
    });
  }

  if (sourceEnabled(enabledSources, "wikipedia")) {
    parallelTasks.push({
      source: "wikipedia",
      run: async () => {
        const timed = await runTimedFetch(
          "wikipedia",
          () => fetchWikipediaBundle({ wikiQuery, preferZhWiki, round, now }),
          timeoutMs
        );
        if (timed.value?.evidence.length) {
          evidence.push(...timed.value.evidence);
        }
        sourceTimings.push(
          timingEntry("wikipedia", timed, {
            ok: timed.value?.ok ?? false,
            message: timed.value?.ok ? "hit" : timed.error ?? "empty"
          })
        );
      }
    });
  }

  if (sourceEnabled(enabledSources, "moegirl")) {
    parallelTasks.push({
      source: "moegirl",
      run: async () => {
        const timed = await runTimedFetch(
          "moegirl",
          () => fetchMoegirlBundle({ mgQuery, round, now }),
          timeoutMs
        );
        if (timed.value?.evidence.length) {
          evidence.push(...timed.value.evidence);
        }
        sourceTimings.push(
          timingEntry("moegirl", timed, {
            ok: timed.value?.ok ?? false,
            message: timed.value?.ok ? "hit" : timed.error ?? "empty"
          })
        );
      }
    });
  }

  const deferCommunity = ragDeferCommunityEvidence();
  if (deferCommunity) {
    sourceTimings.push({
      source: "community_sources",
      duration_ms: 0,
      ok: true,
      message: "deferred_RAG_DEFER_COMMUNITY_EVIDENCE"
    });
    ragLog("retriever.community_deferred", { round, reason: "RAG_DEFER_COMMUNITY_EVIDENCE" });
  } else {
    const communitySources: CommunitySourceId[] = [];
    if (sourceEnabled(enabledSources, "bilibili")) communitySources.push("bilibili");
    if (sourceEnabled(enabledSources, "nga")) communitySources.push("nga");
    if (sourceEnabled(enabledSources, "aweidao")) communitySources.push("aweidao");

    for (const src of communitySources) {
      parallelTasks.push({
        source: src,
        run: async () => {
          const timed = await runTimedFetch(
            src,
            () => fetchCommunityBundle(src, communityQueriesPerSource, round),
            timeoutMs
          );
          if (timed.value) {
            communityFetches.push(...timed.value.fetches);
            evidence.push(...timed.value.evidence);
            if (timed.value.ok && src === "aweidao") {
              const hit = timed.value.fetches.find((f) => f.ok);
              ragLog("retriever.aweidao", { round, query: hit?.query });
            }
          } else {
            communityFetches.push({
              source: src,
              query: communityQueriesPerSource[0] ?? primaryQuery,
              ok: false,
              status: null,
              phase: timed.timed_out ? "timeout" : "error",
              message: timed.error ?? "timeout",
              duration_ms: timed.duration_ms
            });
          }
          sourceTimings.push(
            timingEntry(src, timed, {
              ok: timed.value?.ok ?? false,
              message: timed.value?.ok ? "hit" : timed.error ?? "no_hit"
            })
          );
        }
      });
    }
  }

  const settled = await Promise.allSettled(parallelTasks.map((t) => t.run()));
  for (let i = 0; i < settled.length; i += 1) {
    const r = settled[i];
    const src = parallelTasks[i]?.source ?? "unknown";
    if (r.status === "rejected") {
      ragLog("retriever.parallel_task_failed", {
        source: src,
        message: (r.reason as Error)?.message ?? String(r.reason)
      });
      if (!sourceTimings.some((t) => t.source === src)) {
        sourceTimings.push({
          source: src,
          duration_ms: 0,
          ok: false,
          phase: "error",
          message: (r.reason as Error)?.message ?? String(r.reason)
        });
      }
    }
  }

  if (tryAlternateTitles) {
    const altTasks: ParallelTask[] = [];

    if (sourceEnabled(enabledSources, "wikipedia")) {
      altTasks.push({
        source: "wikipedia_alt",
        run: async () => {
          const timed = await runTimedFetch(
            "wikipedia_alt",
            async (): Promise<{ ok: boolean; evidence: Evidence[] }> => {
              const added: Evidence[] = [];
              const candidates = await fetchWikipediaTitleCandidates(meta.title);
              for (const alt of candidates.slice(0, 2)) {
                if (!alt || normalizeTitle(alt) === normalizeTitle(meta.title)) continue;
                const hit = await fetchWikipediaSummaryBestEffort(alt, preferZhWiki);
                if (hit && hit.extract.trim().length > 80) {
                  added.push({
                    id: nextId("wikipedia"),
                    source: "wikipedia",
                    title: hit.title,
                    url: wikipediaPageUrl(hit.title, hit.lang),
                    snippet: hit.extract.slice(0, 4000),
                    structured: { evidenceRole: "hard_fact" },
                    retrieval_query: alt,
                    round,
                    retrieved_at: new Date().toISOString()
                  });
                }
              }
              return { ok: added.length > 0, evidence: added };
            },
            timeoutMs
          );
          if (timed.value?.evidence.length) {
            evidence.push(...timed.value.evidence);
          }
          sourceTimings.push(
            timingEntry("wikipedia_alt", timed, {
              ok: (timed.value?.evidence.length ?? 0) > 0,
              message: timed.value?.ok ? "alt_hit" : timed.error ?? "empty"
            })
          );
        }
      });
    }

    if (
      sourceEnabled(enabledSources, "moegirl") &&
      meta.title &&
      normalizeTitle(mgQuery) !== normalizeTitle(meta.title)
    ) {
      altTasks.push({
        source: "moegirl_alt",
        run: async () => {
          const timed = await runTimedFetch(
            "moegirl_alt",
            async (): Promise<{ ok: boolean; evidence: Evidence[] }> => {
              const mg2 = await fetchMoegirlContext(meta.title);
              const firstMg = evidence.find((e) => e.source === "moegirl");
              if (!mg2 || (firstMg && mg2.title === firstMg.title)) {
                return { ok: false, evidence: [] as Evidence[] };
              }
              const altEvidence: Evidence = {
                id: nextId("moegirl"),
                source: "moegirl",
                title: mg2.title,
                url: mg2.url,
                snippet: (mg2.extract || "").slice(0, 4000),
                structured: { moegirlTitle: mg2.title, evidenceRole: "context" },
                retrieval_query: meta.title,
                round,
                retrieved_at: new Date().toISOString()
              };
              return { ok: true, evidence: [altEvidence] };
            },
            timeoutMs
          );
          if (timed.value?.evidence.length) {
            evidence.push(...timed.value.evidence);
          }
          sourceTimings.push(
            timingEntry("moegirl_alt", timed, {
              ok: (timed.value?.evidence.length ?? 0) > 0,
              message: timed.value?.ok ? "alt_hit" : timed.error ?? "empty"
            })
          );
        }
      });
    }

    await Promise.allSettled(altTasks.map((t) => t.run()));
  }

  ragLog("retriever.round_done", {
    round,
    count: evidence.length,
    sources: evidence.map((e) => e.source),
    source_timings: sourceTimings
  });

  return {
    evidence,
    meta,
    communityFetches,
    communityQueryCandidates: communityCandidates,
    bangumiFetches,
    sourceTimings
  };
}

/** 合并多轮检索结果并按 id 去重 */
export function mergeEvidence(existing: Evidence[], incoming: Evidence[]): Evidence[] {
  const seen = new Set(existing.map((e) => dedupeKey(e)));
  const out = [...existing];
  for (const e of incoming) {
    const k = dedupeKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function dedupeKey(e: Evidence): string {
  return `${e.source}:${e.title}:${e.snippet.slice(0, 80)}`;
}
