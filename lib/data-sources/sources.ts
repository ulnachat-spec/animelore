import { buildStableCommunityHint } from "@/lib/community-hint";
import {
  animeTitleAliases,
  chineseAnimeTitle,
  findAnimeTitleEntry,
  normalizeAnimeTitle
} from "@/lib/anime-title-registry";
import type { WorkMeta, WorkRelatedRec } from "@/lib/types";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const WIKI_SUMMARY_ENDPOINT = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKI_ZH_SUMMARY_ENDPOINT = "https://zh.wikipedia.org/api/rest_v1/page/summary";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_ZH_API = "https://zh.wikipedia.org/w/api.php";
const MOEGIRL_API = "https://zh.moegirl.org.cn/api.php";

type AniListMetaMedia = {
  id?: number;
  title?: { romaji?: string; english?: string; native?: string };
  seasonYear?: number;
  season?: string;
  coverImage?: { extraLarge?: string };
  studios?: { nodes?: Array<{ name?: string; isAnimationStudio?: boolean }> };
};

interface AniListResponse {
  errors?: Array<{ message?: string }>;
  data?: {
    Page?: {
      media?: AniListMetaMedia[];
    };
  };
}

export async function fetchAniListMeta(query: string): Promise<WorkMeta | null> {
  try {
    const registered = findAnimeTitleEntry(query);
    if (registered) {
      const exact = await fetchAniListMetaById(registered.anilistId, registered.zh);
      if (exact) return exact;
    }
    const candidates = await buildTitleCandidates(query);
    for (const candidate of candidates) {
      const meta = await fetchAniListMetaOnce(candidate, query, candidate !== query);
      if (meta?.coverImage || meta?.seasonYear || (meta?.studios && meta.studios.length > 0)) {
        return meta;
      }
      if (meta && meta.title !== query) return meta;
    }
    return null;
  } catch (error) {
    console.info("[AniList] metadata lookup failed", {
      query,
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function fetchAniListMetaById(id: number, displayTitle: string): Promise<WorkMeta | null> {
  const graphql = `query ($id: Int!) { Media(id: $id, type: ANIME) { id title { romaji english native } seasonYear season coverImage { extraLarge } studios { nodes { name isAnimationStudio } } } }`;
  const resp = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "AnimeLore/0.1" },
    body: JSON.stringify({ query: graphql, variables: { id } }),
    cache: "no-store"
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as { errors?: unknown[]; data?: { Media?: AniListMetaMedia } };
  const media = data.data?.Media;
  if (data.errors?.length || !media?.id) return null;
  return mediaToWorkMeta(media, displayTitle);
}

async function fetchAniListMetaOnce(search: string, originalQuery: string, bridged: boolean): Promise<WorkMeta | null> {
  const graphql = `
    query ($search: String) {
      Page(page: 1, perPage: 5) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id
          title {
            romaji
            english
            native
          }
          seasonYear
          season
          coverImage {
            extraLarge
          }
          studios {
            nodes {
              name
              isAnimationStudio
            }
          }
        }
      }
    }
  `;

  const resp = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "AnimeLore/0.1"
    },
    body: JSON.stringify({ query: graphql, variables: { search } }),
    cache: "no-store"
  });

  if (!resp.ok) {
    console.info("[AniList] metadata response unavailable", {
      search,
      status: resp.status
    });
    return null;
  }
  const data = (await resp.json()) as AniListResponse;
  if (data.errors?.length) return null;
  const mediaList = data.data?.Page?.media || [];
  if (mediaList.length === 0) return null;
  const picked = pickBestMediaWithScore(mediaList, originalQuery, search);
  if (!picked || picked.score < (bridged ? 6 : 7)) return null;
  return mediaToWorkMeta(picked.item, /[\u3400-\u9fff]/.test(originalQuery) ? originalQuery : undefined);
}

function mediaToWorkMeta(media: AniListMetaMedia, displayTitle?: string): WorkMeta {
  const canonical = media.title?.english || media.title?.romaji || media.title?.native || displayTitle || "Unknown";
  return {
    title: chineseAnimeTitle(media.id, displayTitle || canonical),
    anilistId: typeof media.id === "number" ? media.id : undefined,
    nativeTitle: media.title?.native,
    seasonYear: media.seasonYear,
    season: media.season,
    studios: media.studios?.nodes
      ?.filter((s) => s.isAnimationStudio)
      .map((s) => s.name || "")
      .filter(Boolean),
    coverImage: media.coverImage?.extraLarge
  };
}

export function pickBestMediaWithScore(
  list: Array<{
    id?: number;
    title?: { romaji?: string; english?: string; native?: string };
    seasonYear?: number;
    season?: string;
    coverImage?: { extraLarge?: string };
    studios?: { nodes?: Array<{ name?: string; isAnimationStudio?: boolean }> };
  }>,
  query: string,
  candidate: string
) {
  const needleA = normalizeAnimeTitle(query);
  const needleB = normalizeAnimeTitle(candidate);
  const scored = list.map((item) => {
    const titles = [item.title?.english, item.title?.romaji, item.title?.native]
      .filter(Boolean)
      .map((t) => normalizeAnimeTitle(t || ""));
    let score = 0;
    for (const t of titles) {
      if (t === needleA || t === needleB) score += 8;
      else if ((needleA.length >= 4 && (t.includes(needleA) || needleA.includes(t))) || (needleB.length >= 4 && (t.includes(needleB) || needleB.includes(t)))) score += 3;
    }
    if (item.coverImage?.extraLarge) score += 1;
    if (item.seasonYear) score += 1;
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

async function buildTitleCandidates(query: string): Promise<string[]> {
  const set = new Set<string>();
  set.add(query);
  for (const alias of animeTitleAliases(query)) set.add(alias);
  const [wikiEn, wikiZh, wikiZhToEn, moegirl] = await Promise.all([
    fetchWikipediaTitleCandidates(query),
    fetchWikipediaZhTitleCandidates(query),
    fetchWikipediaZhToEnTitle(query),
    fetchMoegirlTitleCandidates(query)
  ]);
  for (const t of [...wikiEn, ...wikiZh, ...wikiZhToEn, ...moegirl]) set.add(t);
  return Array.from(set).filter(Boolean).slice(0, 6);
}

/** 供 RAG retriever 第二轮扩展 Wikipedia 标题 */
export async function fetchWikipediaTitleCandidates(query: string): Promise<string[]> {
  try {
    const url = `${WIKIPEDIA_API}?action=opensearch&search=${encodeURIComponent(
      query
    )}&limit=3&namespace=0&format=json&origin=*`;
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) return [];
    const data = (await resp.json()) as [string, string[], string[], string[]];
    return data?.[1] || [];
  } catch {
    return [];
  }
}

async function fetchWikipediaZhTitleCandidates(query: string): Promise<string[]> {
  try {
    const url = `${WIKIPEDIA_ZH_API}?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&srlimit=3&format=json&origin=*`;
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) return [];
    const data = (await resp.json()) as {
      query?: { search?: Array<{ title: string }> };
    };
    return (data.query?.search || []).map((s) => s.title);
  } catch {
    return [];
  }
}

async function fetchWikipediaZhToEnTitle(query: string): Promise<string[]> {
  try {
    const zhTitles = await fetchWikipediaZhTitleCandidates(query);
    const first = zhTitles[0];
    if (!first) return [];
    const url = `${WIKIPEDIA_ZH_API}?action=query&prop=langlinks&titles=${encodeURIComponent(
      first
    )}&lllang=en&format=json&origin=*`;
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) return [];
    const data = (await resp.json()) as {
      query?: { pages?: Record<string, { langlinks?: Array<{ "*": string }> }> };
    };
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    const enTitle = page?.langlinks?.[0]?.["*"];
    return enTitle ? [enTitle] : [];
  } catch {
    return [];
  }
}

async function fetchMoegirlTitleCandidates(query: string): Promise<string[]> {
  try {
    const opensearchUrl = `${MOEGIRL_API}?action=opensearch&search=${encodeURIComponent(
      query
    )}&limit=3&namespace=0&format=json&origin=*`;
    const resp = await fetch(opensearchUrl, { cache: "no-store" });
    if (!resp.ok) return [];
    const data = (await resp.json()) as [string, string[], string[], string[]];
    return data?.[1] || [];
  } catch {
    return [];
  }
}

async function fetchWikipediaSummaryFrom(
  base: string,
  title: string
): Promise<{ extract: string; title: string; lang: "en" | "zh" } | null> {
  try {
    const resp = await fetch(`${base}/${encodeURIComponent(title)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { extract?: string; title?: string };
    const extract = data.extract || "";
    if (extract.trim().length < 20) return null;
    return {
      extract,
      title: data.title || title,
      lang: base.includes("zh.wikipedia") ? "zh" : "en"
    };
  } catch {
    return null;
  }
}

export async function fetchWikipediaSummary(title: string): Promise<string> {
  const en = await fetchWikipediaSummaryFrom(WIKI_SUMMARY_ENDPOINT, title);
  if (en) return en.extract;
  const zh = await fetchWikipediaSummaryFrom(WIKI_ZH_SUMMARY_ENDPOINT, title);
  return zh?.extract || "";
}

/** 中文维基摘要（检索失败时返回空字符串） */
export async function fetchWikipediaZhSummary(title: string): Promise<string> {
  const zh = await fetchWikipediaSummaryFrom(WIKI_ZH_SUMMARY_ENDPOINT, title);
  return zh?.extract || "";
}

export function wikipediaPageUrl(title: string, lang: "en" | "zh" = "en"): string {
  const host = lang === "zh" ? "zh.wikipedia.org" : "en.wikipedia.org";
  return `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

/** 英文失败时自动尝试中文维基（适合国内网络环境） */
export async function fetchWikipediaSummaryBestEffort(
  title: string,
  preferZh = false
): Promise<{ extract: string; title: string; lang: "en" | "zh" } | null> {
  const order: Array<"en" | "zh"> = preferZh ? ["zh", "en"] : ["en", "zh"];
  for (const lang of order) {
    const base = lang === "zh" ? WIKI_ZH_SUMMARY_ENDPOINT : WIKI_SUMMARY_ENDPOINT;
    const hit = await fetchWikipediaSummaryFrom(base, title);
    if (hit) return hit;
  }
  return null;
}

/**
 * MVP fallback: let LLM web-search discover Chinese community context.
 * We seed query keywords with Moegirl domain for better hit rate.
 */
/** Legacy 管线：无 evidence 时仅按标题生成关键词 */
export function buildCommunitySearchHint(workTitle: string): string {
  return buildStableCommunityHint({
    meta: { title: workTitle },
    evidence: [],
    userQuery: workTitle
  });
}

export interface MoegirlContext {
  title: string;
  url: string;
  extract: string;
}

export async function fetchMoegirlContext(query: string): Promise<MoegirlContext | null> {
  try {
    const opensearchUrl = `${MOEGIRL_API}?action=opensearch&search=${encodeURIComponent(
      query
    )}&limit=1&namespace=0&format=json&origin=*`;
    const searchResp = await fetch(opensearchUrl, { cache: "no-store" });
    if (!searchResp.ok) return null;
    const searchData = (await searchResp.json()) as [string, string[], string[], string[]];
    const title = searchData?.[1]?.[0];
    const url = searchData?.[3]?.[0];
    if (!title || !url) return null;

    const extractUrl = `${MOEGIRL_API}?action=query&prop=extracts&exintro=1&explaintext=1&exchars=900&titles=${encodeURIComponent(
      title
    )}&format=json&origin=*`;
    const extractResp = await fetch(extractUrl, { cache: "no-store" });
    if (!extractResp.ok) {
      return { title, url, extract: "" };
    }
    const extractData = (await extractResp.json()) as {
      query?: { pages?: Record<string, { extract?: string }> };
    };
    const pages = extractData.query?.pages || {};
    const firstPage = Object.values(pages)[0];
    return {
      title,
      url,
      extract: firstPage?.extract || ""
    };
  } catch {
    return null;
  }
}

const RELATION_REASON_ZH: Record<string, string> = {
  ADAPTATION: "AniList 官方关系：改编（动画/漫画等）",
  ALTERNATIVE: "AniList 官方关系：不同演绎版本",
  CHARACTER: "AniList 官方关系：角色关联作品",
  PARENT: "AniList 官方关系：主系列 / 父条目",
  PREQUEL: "AniList 官方关系：前传",
  SEQUEL: "AniList 官方关系：续作 / 后传",
  SIDE_STORY: "AniList 官方关系：外传 / 番外",
  SOURCE: "AniList 官方关系：原作来源",
  SPIN_OFF: "AniList 官方关系：衍生 / 派生",
  SUMMARY: "AniList 官方关系：总集篇 / 汇编",
  OTHER: "AniList 官方关系：其它关联"
};

type AniMediaNode = {
  id?: number;
  type?: string;
  format?: string | null;
  seasonYear?: number | null;
  genres?: string[] | null;
  tags?: Array<{ name?: string | null } | null> | null;
  title?: { romaji?: string | null; english?: string | null; native?: string | null };
  coverImage?: { extraLarge?: string | null } | null;
  /** AniList：`isMain` 在 edge 上，不在 `Studio` 节点上 */
  studios?: {
    edges?: Array<{
      isMain?: boolean | null;
      node?: { name?: string | null; isAnimationStudio?: boolean | null } | null;
    } | null> | null;
  } | null;
};

function mainAnimationStudioNames(media: AniMediaNode | undefined): Set<string> {
  const out = new Set<string>();
  for (const e of media?.studios?.edges || []) {
    if (!e?.isMain || !e.node?.name?.trim()) continue;
    if (e.node.isAnimationStudio !== true) continue;
    out.add(e.node.name.trim());
  }
  return out;
}

function displayTitleOf(m: AniMediaNode): string {
  const fallback = m.title?.english || m.title?.romaji || m.title?.native || "Unknown";
  return chineseAnimeTitle(m.id, fallback);
}

function searchQueryOf(m: AniMediaNode): string {
  return m.title?.english || m.title?.romaji || m.title?.native || "";
}

function relationReason(rt: string | null | undefined): string {
  if (!rt) return "AniList 官方关系：关联作品";
  return RELATION_REASON_ZH[rt] || `AniList 官方关系：${rt}`;
}

function relationRank(rt: string | null | undefined): number {
  const order = [
    "SEQUEL",
    "PREQUEL",
    "SPIN_OFF",
    "SIDE_STORY",
    "PARENT",
    "ADAPTATION",
    "ALTERNATIVE",
    "SOURCE",
    "SUMMARY",
    "CHARACTER",
    "OTHER"
  ];
  const i = rt ? order.indexOf(rt) : -1;
  return i === -1 ? 0 : order.length - i;
}

const WORK_RELATED_MEDIA_FIELDS = `
          id
          genres
          format
          seasonYear
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
          }
          tags(sort: RANK_DESC) { name }
          studios {
            edges {
              isMain
              node {
                name
                isAnimationStudio
              }
            }
          }
          relations {
            edges {
              relationType
              node {
                ... on Media {
                  id
                  type
                  format
                  seasonYear
                  genres
                  title {
                    romaji
                    english
                    native
                  }
                  coverImage {
                    extraLarge
                  }
                  tags(sort: RANK_DESC) { name }
                  studios {
                    edges {
                      isMain
                      node {
                        name
                        isAnimationStudio
                      }
                    }
                  }
                }
              }
            }
          }
          recommendations(perPage: 24, sort: RATING_DESC) {
            edges {
              node {
                rating
                mediaRecommendation {
                  id
                  type
                  format
                  seasonYear
                  genres
                  title {
                    romaji
                    english
                    native
                  }
                  coverImage {
                    extraLarge
                  }
                  tags(sort: RANK_DESC) { name }
                  studios {
                    edges {
                      isMain
                      node {
                        name
                        isAnimationStudio
                      }
                    }
                  }
                }
              }
            }
          }
`;

type RelatedWorkBase = AniMediaNode & {
  id?: number;
  genres?: string[] | null;
  relations?: { edges?: Array<{ relationType?: string; node?: AniMediaNode }> };
  recommendations?: {
    edges?: Array<{
      node?: { rating?: number | null; mediaRecommendation?: AniMediaNode } | null;
    }>;
  };
};

function buildRelatedWorkRecs(
  base: RelatedWorkBase,
  receivedQuery: string,
  logRelated: (payload: Record<string, unknown>) => void,
  resolvedVia: "media_id" | "search"
): WorkRelatedRec[] {
  const baseId = typeof base.id === "number" ? base.id : null;
  if (baseId == null) {
    logRelated({
      phase: "no_base_id",
      resolvedVia,
      matchedTitle: displayTitleOf(base),
      matchedAnilistId: null
    });
    return [];
  }

  const baseGenres = new Set((base.genres || []).filter(Boolean));
  const baseTagNames = new Set(
    (base.tags || [])
      .map((t) => t?.name)
      .filter((x): x is string => !!x && x.length > 0)
  );
  const baseMainStudios = mainAnimationStudioNames(base);

  type Cand = WorkRelatedRec & { score: number };
  const byId = new Map<number, Cand>();

  const push = (m: AniMediaNode, score: number, reason: string) => {
    const id = m.id;
    if (id == null || id === baseId) return;
    if (m.type && m.type !== "ANIME") return;
    const sq = searchQueryOf(m);
    if (!sq.trim()) return;
    const existing = byId.get(id);
    if (existing && existing.score >= score) return;
    byId.set(id, {
      anilistId: id,
      title: displayTitleOf(m),
      displayTitle: displayTitleOf(m),
      coverImage: m.coverImage?.extraLarge || undefined,
      seasonYear: m.seasonYear ?? undefined,
      format: m.format ?? undefined,
      reason,
      searchQuery: sq,
      score
    });
  };

  const relEdges = base.relations?.edges;
  for (const edge of relEdges || []) {
    const node = edge?.node as AniMediaNode | undefined;
    if (!node?.id) continue;
    const rt = edge?.relationType;
    push(node, 1000 + relationRank(rt), relationReason(rt));
  }

  const recEdges = base.recommendations?.edges;
  for (const edge of recEdges || []) {
    const n = edge?.node;
    const m = n?.mediaRecommendation;
    if (!m?.id) continue;
    const r = n?.rating ?? 0;
    const reason =
      typeof r === "number" && r > 0
        ? `AniList 推荐关联（站内推荐度 ${r}）`
        : "AniList 推荐关联";
    push(m, 500 + Math.min(r, 200), reason);
  }

  for (const edge of recEdges || []) {
    const n = edge?.node;
    const m = n?.mediaRecommendation;
    if (!m?.id || m.id === baseId) continue;
    if (byId.has(m.id)) continue;
    const g = (m.genres || []).filter((x) => baseGenres.has(x));
    const tagNames = (m.tags || [])
      .map((t) => t?.name)
      .filter((x): x is string => !!x);
    const sharedTags = tagNames.filter((t) => baseTagNames.has(t));
    const mainNames = [...mainAnimationStudioNames(m)];
    const sharedStudio = mainNames.find((n) => baseMainStudios.has(n));
    if (g.length > 0) {
      push(m, 300, `AniList：与当前作共有题材（${g.slice(0, 4).join("、")}）`);
    } else if (sharedTags.length > 0) {
      push(m, 290, `AniList：与当前作共有标签（${sharedTags.slice(0, 4).join("、")}）`);
    } else if (sharedStudio) {
      push(m, 280, `AniList：主制作公司同为「${sharedStudio}」`);
    }
  }

  const sorted = [...byId.values()].sort((a, b) => b.score - a.score);
  const out = sorted.slice(0, 6).map(({ score: _s, ...rest }) => rest);
  logRelated({
    phase: "summary",
    resolvedVia,
    matchedAnilistId: baseId,
    matchedTitle: displayTitleOf(base),
    relationsCount: relEdges?.length ?? 0,
    recommendationsCount: recEdges?.length ?? 0,
    afterFilterCount: byId.size,
    returnedCount: out.length
  });
  return out;
}

/**
 * 基于 AniList 的 relations / recommendations，以及题材（genres）/ 标签（tags）或主制作公司重叠，生成作品页「还想看」列表。
 * 无足够数据时返回空数组（由页面隐藏或回退到底部 hook 占位）。
 *
 * @param userQuery 用于检索当前作的标题（优先使用已解析的 `meta.title` / `meta.nativeTitle`）
 * @param options.mediaId 若与 `fetchAniListMeta` 返回的 `anilistId` 一致，则直接 `Media(id: …)`，避免与搜索排序不一致而「推荐到当前页同一部」。
 */
export async function fetchAniListRelatedRecommendations(
  userQuery: string,
  options?: { mediaId?: number | null }
): Promise<WorkRelatedRec[]> {
  const receivedQuery = userQuery.trim();
  const logRelated = (payload: Record<string, unknown>) => {
    console.info("[work-related]", JSON.stringify({ receivedQuery, ...payload }));
  };

  const gqlById = `query WorkRelatedById($id: Int!) { Media(id: $id) { ${WORK_RELATED_MEDIA_FIELDS} } }`;
  const gqlSearch = `query WorkRelatedSearch($search: String!) { Page(page: 1, perPage: 5) { media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ${WORK_RELATED_MEDIA_FIELDS} } } }`;

  const mediaId = options?.mediaId != null && options.mediaId > 0 ? options.mediaId : null;

  try {
    if (mediaId != null) {
      const respId = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "AnimeLore/0.1"
        },
        body: JSON.stringify({ query: gqlById, variables: { id: mediaId } }),
        cache: "no-store"
      });
      if (!respId.ok) {
        logRelated({ phase: "http_error", resolvedVia: "media_id", httpStatus: respId.status });
      } else {
        const dataId = (await respId.json()) as {
          errors?: Array<{ message?: string }>;
          data?: { Media?: RelatedWorkBase | null };
        };
        if (dataId.errors?.length) {
          logRelated({
            phase: "graphql_error",
            resolvedVia: "media_id",
            errors: dataId.errors.map((e) => e.message)
          });
        } else if (dataId.data?.Media?.id != null) {
          return buildRelatedWorkRecs(dataId.data.Media, receivedQuery, logRelated, "media_id");
        } else {
          logRelated({ phase: "media_id_miss", mediaId });
        }
      }
    }

    const resp = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "AnimeLore/0.1"
      },
      body: JSON.stringify({ query: gqlSearch, variables: { search: receivedQuery } }),
      cache: "no-store"
    });
    if (!resp.ok) {
      logRelated({ phase: "http_error", resolvedVia: "search", httpStatus: resp.status });
      return [];
    }
    const data = (await resp.json()) as {
      errors?: Array<{ message?: string }>;
      data?: {
        Page?: {
          media?: AniMediaNode[];
        };
      };
    };
    if (data.errors?.length) {
      logRelated({
        phase: "graphql_error",
        resolvedVia: "search",
        errors: data.errors.map((e) => e.message)
      });
      return [];
    }
    const list = data.data?.Page?.media || [];
    if (list.length === 0) {
      logRelated({ phase: "no_search_hits", resolvedVia: "search", searchHitCount: 0 });
      return [];
    }

    const picked = pickBestMediaWithScore(
      list as Parameters<typeof pickBestMediaWithScore>[0],
      receivedQuery,
      receivedQuery
    );
    if (!picked || picked.score < 7) {
      logRelated({ phase: "rejected_weak_title_match", resolvedVia: "search", score: picked?.score ?? 0 });
      return [];
    }
    const base = picked.item as RelatedWorkBase;

    return buildRelatedWorkRecs(base, receivedQuery, logRelated, "search");
  } catch (err) {
    console.info(
      "[work-related]",
      JSON.stringify({
        receivedQuery,
        phase: "exception",
        message: err instanceof Error ? err.message : String(err)
      })
    );
    return [];
  }
}
