import {
  bangumiSubjectToSnippet,
  fetchAniListMeta,
  fetchBangumiSubjectBestEffort,
  fetchMoegirlContext,
  fetchWikipediaSummaryBestEffort,
  wikipediaPageUrl
} from "@/lib/data-sources";
import type { BangumiFetchSuccess } from "@/lib/data-sources/bangumi-fetch-types";
import { COLD_RAG_SOURCE_TIMEOUT_MS } from "@/lib/cold-hook-config";
import type { ColdEvidence, ColdTopicPlan } from "@/lib/cold-types";

let evSeq = 0;

function nextId(source: string): string {
  evSeq += 1;
  return `cold_${source}_${evSeq}`;
}

function withColdTimeout<T>(label: string, ms: number, fn: () => Promise<T>): Promise<T | null> {
  return Promise.race([
    fn().catch(() => null),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    })
  ]).then((r) => r ?? null);
}

function pushUnique(
  out: ColdEvidence[],
  seen: Set<string>,
  item: ColdEvidence | null
): void {
  if (!item?.snippet?.trim() || !item.url) return;
  const key = item.url;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(item);
}

async function evidenceFromWikipedia(query: string, preferZh: boolean): Promise<ColdEvidence | null> {
  const hit = await withColdTimeout("wiki", COLD_RAG_SOURCE_TIMEOUT_MS, () =>
    fetchWikipediaSummaryBestEffort(query, preferZh)
  );
  if (!hit?.extract?.trim()) return null;
  return {
    id: nextId("wikipedia"),
    source: "wikipedia",
    title: hit.title,
    url: wikipediaPageUrl(hit.title, hit.lang),
    snippet: hit.extract.slice(0, 1200),
    role: "context"
  };
}

async function evidenceFromMoegirl(query: string): Promise<ColdEvidence | null> {
  const hit = await withColdTimeout("moegirl", COLD_RAG_SOURCE_TIMEOUT_MS, () =>
    fetchMoegirlContext(query)
  );
  if (!hit?.extract?.trim()) return null;
  return {
    id: nextId("moegirl"),
    source: "moegirl",
    title: hit.title,
    url: hit.url,
    snippet: hit.extract.slice(0, 1200),
    role: "community"
  };
}

async function evidenceFromBangumi(query: string): Promise<ColdEvidence | null> {
  const outcome = await withColdTimeout("bangumi", COLD_RAG_SOURCE_TIMEOUT_MS, () =>
    fetchBangumiSubjectBestEffort([query])
  );
  if (!outcome?.ok) return null;
  const subj = (outcome as BangumiFetchSuccess).data;
  const snippet = bangumiSubjectToSnippet(subj);
  if (!snippet.trim()) return null;
  return {
    id: nextId("bangumi"),
    source: "bangumi",
    title: subj.name_cn || subj.name,
    url: subj.url,
    snippet,
    role: "hard_fact"
  };
}

async function evidenceFromAnilist(query: string): Promise<ColdEvidence | null> {
  const meta = await withColdTimeout("anilist", COLD_RAG_SOURCE_TIMEOUT_MS, () =>
    fetchAniListMeta(query)
  );
  if (!meta?.title) return null;
  const snippet = [
    `title: ${meta.title}`,
    meta.nativeTitle ? `native: ${meta.nativeTitle}` : "",
    meta.seasonYear != null ? `year: ${meta.seasonYear}` : "",
    meta.studios?.length ? `studios: ${meta.studios.join(" / ")}` : ""
  ]
    .filter(Boolean)
    .join("\n");
  return {
    id: nextId("anilist"),
    source: "anilist",
    title: meta.title,
    url: meta.anilistId
      ? `https://anilist.co/anime/${meta.anilistId}`
      : `https://anilist.co/search/anime?search=${encodeURIComponent(query)}`,
    snippet,
    role: "hard_fact"
  };
}

/**
 * 冷知识证据检索：fail-open，单源失败不抛错。
 */
export async function retrieveColdEvidence(plan: ColdTopicPlan): Promise<ColdEvidence[]> {
  const out: ColdEvidence[] = [];
  const seen = new Set<string>();
  const queries = plan.search_queries.length
    ? plan.search_queries
    : [plan.seed_keyword];

  const primary = queries[0];
  const secondary = queries[1] ?? plan.seed_keyword;

  if (plan.topic_type === "work") {
    const tasks = [
      evidenceFromAnilist(primary),
      evidenceFromBangumi(primary),
      evidenceFromWikipedia(primary, true),
      evidenceFromMoegirl(primary),
      evidenceFromBangumi(secondary),
      evidenceFromWikipedia(secondary, true)
    ];
    const results = await Promise.all(tasks);
    for (const r of results) pushUnique(out, seen, r);
  } else {
    const tasks = [
      evidenceFromWikipedia(primary, true),
      evidenceFromMoegirl(primary),
      evidenceFromBangumi(primary),
      evidenceFromWikipedia(secondary, true),
      evidenceFromMoegirl(secondary)
    ];
    const results = await Promise.all(tasks);
    for (const r of results) pushUnique(out, seen, r);
  }

  return out.slice(0, 8);
}

export function evidenceUrls(evidence: ColdEvidence[]): string[] {
  return evidence.map((e) => e.url).filter((u) => u.startsWith("http"));
}
