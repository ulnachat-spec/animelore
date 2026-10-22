import {
  bangumiFetchFailure,
  bangumiFetchSuccess,
  type BangumiFetchOutcome
} from "@/lib/data-sources/bangumi-fetch-types";
import type { WorkMeta } from "@/lib/types";

const BANGUMI_API = "https://api.bgm.tv/v0";
const USER_AGENT = "AnimeLore/0.1 (https://github.com/animelore; contact: dev@local)";
const BANGUMI_SEARCH = `${BANGUMI_API}/search/subjects`;

export interface BangumiSubject {
  id: number;
  name: string;
  name_cn: string;
  summary: string;
  rating?: { score?: number; total?: number; rank?: number };
  tags: Array<{ name: string; count?: number }>;
  date: string | null;
  url: string;
  structured: Record<string, unknown>;
}

export type {
  BangumiFetchFailure,
  BangumiFetchOutcome,
  BangumiFetchPhase,
  BangumiFetchSuccess
} from "@/lib/data-sources/bangumi-fetch-types";

type BangumiSubjectRaw = {
  id?: number;
  name?: string;
  name_cn?: string;
  date?: string | null;
  score?: number;
  summary?: string;
  tags?: Array<{ name?: string; count?: number }>;
  type?: number;
  rating?: { score?: number; total?: number; rank?: number };
  infobox?: Array<{ key?: string; value?: string }>;
  images?: { large?: string; common?: string; medium?: string };
};

function pickBestMatch(items: BangumiSubjectRaw[], query: string): BangumiSubjectRaw | null {
  if (items.length === 0) return null;
  const needle = normalize(query);
  const scored = items.map((item) => {
    const names = [item.name_cn, item.name, item.name_cn]
      .filter(Boolean)
      .map((n) => normalize(n || ""));
    let score = 0;
    for (const n of names) {
      if (n === needle) score += 5;
      else if (n.includes(needle) || needle.includes(n)) score += 2;
    }
    if (item.type === 2) score += 1;
    if (item.score) score += 0.5;
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].item;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

function formatSubjectSnippet(detail: BangumiSubjectRaw, meta: BangumiSubject): string {
  const lines = [
    `name: ${detail.name || meta.name}`,
    detail.name_cn || meta.name_cn ? `name_cn: ${detail.name_cn || meta.name_cn}` : "",
    detail.date ? `date: ${detail.date}` : "",
    detail.rating?.score != null ? `rating: ${detail.rating.score}` : "",
    detail.tags?.length
      ? `tags: ${detail.tags
          .slice(0, 12)
          .map((t) => t.name)
          .filter(Boolean)
          .join(" / ")}`
      : "",
    detail.summary ? `summary: ${detail.summary}` : ""
  ].filter(Boolean);
  return lines.join("\n").slice(0, 4000);
}

async function bgmFetch<T>(path: string): Promise<{ status: number; data: T | null }> {
  try {
    const resp = await fetch(`${BANGUMI_API}${path}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store"
    });
    if (!resp.ok) return { status: resp.status, data: null };
    return { status: resp.status, data: (await resp.json()) as T };
  } catch {
    return { status: null as unknown as number, data: null };
  }
}

async function searchSubjects(
  keyword: string
): Promise<{ status: number; list: BangumiSubjectRaw[]; errorBody?: string }> {
  try {
    const resp = await fetch(BANGUMI_SEARCH, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ keyword, limit: 8 }),
      cache: "no-store"
    });
    const status = resp.status;
    const raw = await resp.text();
    if (!resp.ok) {
      return { status, list: [], errorBody: raw.slice(0, 200) };
    }
    let parsed: { data?: BangumiSubjectRaw[]; list?: BangumiSubjectRaw[] };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      return { status, list: [], errorBody: "invalid_json" };
    }
    const list = parsed?.data ?? parsed?.list ?? [];
    return { status, list };
  } catch (err) {
    return {
      status: 0,
      list: [],
      errorBody: err instanceof Error ? err.message : String(err)
    };
  }
}

async function fetchSubjectDetail(id: number): Promise<BangumiSubjectRaw | null> {
  const { data } = await bgmFetch<BangumiSubjectRaw>(`/subjects/${id}`);
  return data;
}

function rawToSubject(hit: BangumiSubjectRaw, detail: BangumiSubjectRaw, q: string): BangumiSubject {
  const id = hit.id!;
  const name = detail.name || hit.name || q;
  const name_cn = detail.name_cn || hit.name_cn || "";
  const summary = (detail.summary || hit.summary || "").trim();
  const tags = (detail.tags || hit.tags || [])
    .map((t) => ({ name: t.name || "", count: t.count }))
    .filter((t) => t.name.length > 0);

  return {
    id,
    name,
    name_cn,
    summary,
    rating: detail.rating ?? hit.rating ?? (hit.score != null ? { score: hit.score } : undefined),
    tags,
    date: detail.date ?? hit.date ?? null,
    url: `https://bgm.tv/subject/${id}`,
    structured: {
      subjectId: id,
      type: detail.type ?? hit.type,
      infobox: detail.infobox ?? hit.infobox ?? [],
      date: detail.date ?? hit.date,
      coverImage:
        detail.images?.large || detail.images?.common || hit.images?.large || hit.images?.common
    }
  };
}

/**
 * Bangumi subject 检索：POST search/subjects → 可选 detail；失败返回 outcome，不抛错。
 */
export async function fetchBangumiSubjectOutcome(query: string): Promise<BangumiFetchOutcome> {
  const q = query.trim();
  if (!q) {
    return bangumiFetchFailure(q, {
      status: null,
      phase: "empty",
      message: "query 为空"
    });
  }

  try {
    const { status, list, errorBody } = await searchSubjects(q);
    if (status === 0) {
      return bangumiFetchFailure(q, {
        status: null,
        phase: "network",
        message: errorBody || "network_error"
      });
    }
    if (status === 404) {
      return bangumiFetchFailure(q, {
        status,
        phase: "http",
        message:
          "GET /v0/search/subjects 已废弃；请使用 POST。若仍见此错误说明客户端未更新。"
      });
    }
    if (status < 200 || status >= 300) {
      return bangumiFetchFailure(q, {
        status,
        phase: "http",
        message: `HTTP ${status}${errorBody ? ` ${errorBody}` : ""}`
      });
    }

    const animeFirst = [
      ...list.filter((i) => i.type === 2),
      ...list.filter((i) => i.type !== 2)
    ];
    const hit = pickBestMatch(animeFirst.length > 0 ? animeFirst : list, q);
    if (!hit?.id) {
      return bangumiFetchFailure(q, {
        status,
        phase: "empty",
        message: list.length === 0 ? "搜索无结果" : "无匹配条目"
      });
    }

    const detail = (await fetchSubjectDetail(hit.id)) ?? hit;
    return bangumiFetchSuccess(q, rawToSubject(hit, detail, q));
  } catch (err) {
    return bangumiFetchFailure(q, {
      status: null,
      phase: "network",
      message: err instanceof Error ? err.message : String(err)
    });
  }
}

/** 依次尝试多个 query，首个成功即返回 */
export async function fetchBangumiSubjectBestEffort(
  queries: string[]
): Promise<BangumiFetchOutcome> {
  const seen = new Set<string>();
  let last: BangumiFetchOutcome | null = null;

  for (const raw of queries) {
    const q = raw?.trim();
    if (!q) continue;
    const key = normalize(q);
    if (seen.has(key)) continue;
    seen.add(key);

    const outcome = await fetchBangumiSubjectOutcome(q);
    last = outcome;
    if (outcome.ok) return outcome;
  }

  return (
    last ??
    bangumiFetchFailure("", {
      status: null,
      phase: "empty",
      message: "无可用 query"
    })
  );
}

const BANGUMI_STUDIO_KEYS = ["动画制作", "アニメーション制作", "制作"];

/** infobox value 可能是字符串，也可能是 [{ v }] 数组 */
function infoboxValueToList(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/[、,，/]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (item && typeof item === "object" ? String((item as { v?: unknown }).v ?? "") : ""))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * AniList 不可用时，用 Bangumi 条目补全 Hero / 覆盖面判断所需的硬信息。
 */
export function bangumiSubjectToWorkMeta(subject: BangumiSubject): WorkMeta {
  const infobox = (subject.structured.infobox as Array<{ key?: string; value?: unknown }>) ?? [];
  let studios: string[] = [];
  for (const key of BANGUMI_STUDIO_KEYS) {
    const row = infobox.find((r) => r.key === key);
    if (row) {
      studios = infoboxValueToList(row.value).slice(0, 3);
      if (studios.length) break;
    }
  }
  const year = subject.date ? parseInt(subject.date.slice(0, 4), 10) : NaN;
  const coverImage = subject.structured.coverImage;
  const title = subject.name_cn?.trim() || subject.name;
  return {
    title,
    nativeTitle: subject.name && subject.name !== title ? subject.name : undefined,
    seasonYear: Number.isFinite(year) ? year : undefined,
    studios: studios.length ? studios : undefined,
    coverImage: typeof coverImage === "string" && coverImage ? coverImage : undefined,
    metaSource: "bangumi"
  };
}

export async function fetchBangumiWorkMeta(query: string): Promise<WorkMeta | null> {
  const outcome = await fetchBangumiSubjectOutcome(query);
  return outcome.ok ? bangumiSubjectToWorkMeta(outcome.data) : null;
}

/** @deprecated 使用 fetchBangumiSubjectOutcome；保留 null 返回以兼容旧调用 */
export async function fetchBangumiSubject(query: string): Promise<BangumiSubject | null> {
  const outcome = await fetchBangumiSubjectOutcome(query);
  return outcome.ok ? outcome.data : null;
}

export function bangumiSubjectToSnippet(subject: BangumiSubject): string {
  return formatSubjectSnippet(
    {
      id: subject.id,
      name: subject.name,
      name_cn: subject.name_cn,
      date: subject.date,
      summary: subject.summary,
      rating: subject.rating,
      tags: subject.tags
    },
    subject
  );
}
