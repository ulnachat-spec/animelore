/**
 * B站 WBI 搜索响应解析（专栏/文章优先）；仅产出安全 debug 摘要，不含 Cookie。
 */

import {
  classifyBilibiliUrl,
  normalizeBilibiliArticleUrl,
  resolveBilibiliArticleUrlsLimited,
  resolveBilibiliItemUrlFromSearch,
  type BilibiliUrlFormat,
  type BilibiliUrlResolution
} from "@/lib/data-sources/bilibili-article-url";

export type { BilibiliUrlFormat, BilibiliUrlResolution };
export {
  classifyBilibiliUrl,
  normalizeBilibiliArticleUrl,
  resolveBilibiliArticleUrl,
  resolveBilibiliArticleUrlsLimited
} from "@/lib/data-sources/bilibili-article-url";

export interface BilibiliResultItemPreview {
  keys: string[];
  type?: string;
  result_type?: string;
  typename?: string;
  title?: string;
  url_fields: Record<string, string | number | null>;
  resolved_url: string | null;
  original_url?: string;
  normalized_url?: string;
  url_format?: BilibiliUrlFormat;
}

export interface BilibiliResultDebugSummary {
  search_type: string;
  code?: number;
  message?: string;
  data_keys: string[];
  result_is_array: boolean;
  result_count: number;
  sample_items: BilibiliResultItemPreview[];
  url_resolve_note?: string;
}

type BiliItem = Record<string, unknown>;

const URL_FIELD_NAMES = [
  "opus_id",
  "opusId",
  "dynamic_id",
  "dynamic_id_str",
  "arcurl",
  "url",
  "uri",
  "goto_url",
  "jump_url",
  "param",
  "aid",
  "bvid",
  "id",
  "cvid",
  "article_id"
] as const;

const PREFERRED_ARTICLE_TYPES = new Set([
  "article",
  "column",
  "专栏",
  "articles",
  "read"
]);

export function extractBilibiliSearchResults(payload: unknown): BiliItem[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const r = p.result;

  if (Array.isArray(r)) {
    return r.filter((x): x is BiliItem => x != null && typeof x === "object");
  }

  if (r && typeof r === "object") {
    const ro = r as Record<string, unknown>;
    for (const key of ["article", "column", "items", "data"]) {
      const nested = ro[key];
      if (Array.isArray(nested)) {
        return nested.filter((x): x is BiliItem => x != null && typeof x === "object");
      }
    }
  }

  return [];
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function itemTypeLabel(item: BiliItem): string {
  const parts = [item.type, item.result_type, item.typename]
    .filter((v) => typeof v === "string" && v.trim())
    .map((v) => String(v).toLowerCase());
  return parts[0] || "";
}

function isArticleLike(item: BiliItem): boolean {
  const t = itemTypeLabel(item);
  if (PREFERRED_ARTICLE_TYPES.has(t)) return true;
  const urlHints = [item.arcurl, item.uri, item.url, item.goto_url, item.jump_url]
    .filter((v) => typeof v === "string")
    .join(" ");
  return /\/read\/cv|\/opus\/|article|column|专栏/i.test(urlHints);
}

/** @deprecated 使用 resolveBilibiliItemUrlFromSearch */
export function normalizeBilibiliUrl(raw: string): string | null {
  try {
    return normalizeBilibiliArticleUrl(raw);
  } catch {
    return null;
  }
}

function pickUrlFieldPreview(item: BiliItem): BilibiliResultItemPreview["url_fields"] {
  const out: BilibiliResultItemPreview["url_fields"] = {};
  for (const k of URL_FIELD_NAMES) {
    const v = item[k];
    if (v === undefined || v === null) {
      out[k] = null;
    } else if (typeof v === "string" || typeof v === "number") {
      const s = String(v);
      out[k] = s.length > 120 ? `${s.slice(0, 120)}…` : s;
    } else {
      out[k] = null;
    }
  }
  return out;
}

/** 从单条搜索结果解析 bilibili.com URL（opus 优先） */
export function resolveBilibiliItemUrl(item: BiliItem): string | null {
  return resolveBilibiliItemUrlFromSearch(item)?.normalized_url ?? null;
}

export function summarizeBilibiliSearchPayload(input: {
  searchType: string;
  code?: number;
  message?: string;
  payload: unknown;
  maxSamples?: number;
}): BilibiliResultDebugSummary {
  const payload = input.payload;
  const dataKeys =
    payload && typeof payload === "object"
      ? Object.keys(payload as Record<string, unknown>)
      : [];
  const items = extractBilibiliSearchResults(payload);
  const max = input.maxSamples ?? 3;

  const sample_items: BilibiliResultItemPreview[] = items.slice(0, max).map((item) => {
    const titleRaw = item.title ?? item.name;
    const resolved = resolveBilibiliItemUrlFromSearch(item);
    return {
      keys: Object.keys(item).slice(0, 40),
      type: typeof item.type === "string" ? item.type : undefined,
      result_type: typeof item.result_type === "string" ? item.result_type : undefined,
      typename: typeof item.typename === "string" ? item.typename : undefined,
      title:
        typeof titleRaw === "string"
          ? stripTags(titleRaw).slice(0, 80)
          : undefined,
      url_fields: pickUrlFieldPreview(item),
      resolved_url: resolved?.normalized_url ?? null,
      original_url: resolved?.original_url,
      normalized_url: resolved?.normalized_url,
      url_format: resolved?.url_format
    };
  });

  let url_resolve_note: string | undefined;
  if (items.length > 0 && !sample_items.some((s) => s.resolved_url)) {
    url_resolve_note = `共 ${items.length} 条结果，前 ${sample_items.length} 条均未能解析出 bilibili.com URL`;
  }

  const r =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).result
      : undefined;

  return {
    search_type: input.searchType,
    code: input.code,
    message: input.message,
    data_keys: dataKeys,
    result_is_array: Array.isArray(r),
    result_count: items.length,
    sample_items,
    url_resolve_note
  };
}

export interface ParsedBilibiliArticle {
  title: string;
  url: string;
  snippet: string;
  author?: string;
  structured: Record<string, unknown>;
  original_url?: string;
  normalized_url?: string;
  url_format?: BilibiliUrlFormat;
  resolve_failed_reason?: string;
}

export async function pickBilibiliArticleCandidates(
  items: BiliItem[],
  fallbackTitle: string,
  maxItems = 3,
  options?: { maxUrlResolve?: number }
): Promise<ParsedBilibiliArticle[]> {
  const scored = items
    .map((item) => {
      const resolved = resolveBilibiliItemUrlFromSearch(item);
      if (!resolved) return null;

      const titleRaw = item.title ?? item.name ?? fallbackTitle;
      const title = stripTags(String(titleRaw));
      const desc = stripTags(
        String(item.desc ?? item.description ?? item.summary ?? item.intro ?? "")
      );
      const author = stripTags(
        String(item.author ?? item.uname ?? item.author_name ?? "")
      ).trim();
      let score = 0;
      if (isArticleLike(item)) score += 30;
      if (desc.length >= 40) score += 20;
      if (title.length >= 4) score += 10;
      if (resolved.url_format === "opus") score += 20;
      if (resolved.url_format === "read_cv") score += 12;
      for (const k of ["考据", "解析", "解读", "访谈", "制作", "分镜", "幕后"]) {
        if (title.includes(k)) score += 12;
        if (desc.includes(k)) score += 4;
      }
      for (const k of ["资源", "网盘", "下载", "全集", "合集", "MAD", "AMV", "4K", "1080"]) {
        if (title.includes(k) || desc.includes(k)) score -= 40;
      }
      return { item, resolved, title, desc, author, score };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.score - a.score);

  const draft: ParsedBilibiliArticle[] = [];
  const seenUrl = new Set<string>();

  for (const best of scored) {
    if (draft.length >= maxItems) break;
    const norm = best.resolved.normalized_url;
    if (seenUrl.has(norm)) continue;
    seenUrl.add(norm);

    const snippet =
      (best.desc.length >= 20
        ? best.desc
        : `${best.desc}（B站社区内容，观点/延伸阅读，非官方事实来源）`.trim()
      ).slice(0, 2000) || best.title;

    if (snippet.length < 10 && best.title.length < 2) continue;

    draft.push({
      title: best.title || fallbackTitle,
      url: norm,
      original_url: best.resolved.original_url,
      normalized_url: norm,
      url_format: best.resolved.url_format,
      snippet,
      author: best.author || undefined,
      structured: {
        community: "bilibili_column",
        item_type: itemTypeLabel(best.item) || undefined,
        like: best.item.like,
        view: best.item.view,
        mid: best.item.mid,
        original_url: best.resolved.original_url,
        url_format: best.resolved.url_format
      }
    });
  }

  const maxResolve = options?.maxUrlResolve ?? 2;
  const needResolve = draft.filter((d) => d.url_format === "read_cv");
  if (needResolve.length === 0) return draft;

  const resolvedMap = new Map<string, ParsedBilibiliArticle & Partial<BilibiliUrlResolution>>();
  const resolvedList = await resolveBilibiliArticleUrlsLimited(needResolve, maxResolve);
  for (const r of resolvedList) {
    resolvedMap.set(r.url, r);
  }

  return draft.map((d) => {
    const r = resolvedMap.get(d.url);
    if (!r) return d;
    return {
      ...d,
      url: r.normalized_url ?? d.url,
      normalized_url: r.normalized_url ?? d.url,
      url_format: r.url_format ?? d.url_format,
      resolve_failed_reason: r.resolve_failed_reason,
      structured: {
        ...d.structured,
        original_url: r.original_url ?? d.original_url,
        normalized_url: r.normalized_url ?? d.url,
        url_format: r.url_format ?? d.url_format,
        resolve_failed_reason: r.resolve_failed_reason
      }
    };
  });
}

/** @deprecated 使用 normalizeBilibiliArticleUrl */
export function normalizeBilibiliReadCvUrl(url: string): string {
  return normalizeBilibiliArticleUrl(url);
}

export async function pickBestBilibiliArticle(
  items: BiliItem[],
  fallbackTitle: string,
  options?: { maxUrlResolve?: number }
): Promise<ParsedBilibiliArticle | null> {
  const list = await pickBilibiliArticleCandidates(items, fallbackTitle, 1, options);
  return list[0] ?? null;
}
