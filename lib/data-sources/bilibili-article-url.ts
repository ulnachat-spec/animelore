/**
 * B站专栏/动态链接规范化：优先 opus，read/cv 为 fallback；可选轻量跳转解析。
 */

import { getBilibiliRequestHeaders } from "@/lib/data-sources/bilibili-session";

export type BilibiliUrlFormat = "opus" | "read_cv" | "video" | "unknown";

export interface BilibiliUrlResolution {
  original_url: string;
  normalized_url: string;
  url_format: BilibiliUrlFormat;
  resolve_failed_reason?: string;
}

const DEFAULT_RESOLVE_TIMEOUT_MS = 1500;

function resolveTimeoutMs(): number {
  const v = process.env.BILIBILI_URL_RESOLVE_TIMEOUT_MS;
  if (!v) return DEFAULT_RESOLVE_TIMEOUT_MS;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(500, Math.min(n, 5000)) : DEFAULT_RESOLVE_TIMEOUT_MS;
}

export function classifyBilibiliUrl(url: string): BilibiliUrlFormat {
  if (/\/opus\/\d+/i.test(url)) return "opus";
  if (/\/read\/cv\d+/i.test(url)) return "read_cv";
  if (/\/video\/(BV|bv)/i.test(url) || /\/video\/av\d+/i.test(url)) return "video";
  return "unknown";
}

function extractOpusIdFromString(s: string): string | null {
  const trimmed = s.trim();
  if (!trimmed) return null;

  let m = trimmed.match(/\/opus\/(\d+)/i);
  if (m) return m[1];

  m = trimmed.match(/bilibili:\/\/opus\/(\d+)/i);
  if (m) return m[1];

  m = trimmed.match(/opus[=/](\d{8,})/i);
  if (m) return m[1];

  if (/^\d{10,}$/.test(trimmed)) return trimmed;

  return null;
}

function toHttpsBilibiliHost(url: string): string {
  let u = url.trim();
  if (u.startsWith("//")) u = `https:${u}`;
  if (u.startsWith("/")) u = `https://www.bilibili.com${u}`;
  return u;
}

/** 同步规范化：opus 优先，否则 read/cv / video */
export function normalizeBilibiliArticleUrl(rawUrl: string): string {
  const u = toHttpsBilibiliHost(rawUrl);

  const opusFromSchema = extractOpusIdFromString(u);
  if (opusFromSchema && /bilibili:\/\//i.test(u)) {
    return `https://www.bilibili.com/opus/${opusFromSchema}`;
  }

  try {
    const parsed = new URL(u);
    if (!parsed.hostname.toLowerCase().includes("bilibili.com")) {
      return u;
    }

    const opusPath = parsed.pathname.match(/\/opus\/(\d+)/i);
    if (opusPath) return `https://www.bilibili.com/opus/${opusPath[1]}`;

    const cvPath = parsed.pathname.match(/\/read\/cv(\d+)/i);
    if (cvPath) return `https://www.bilibili.com/read/cv${cvPath[1]}`;

    const bvPath = parsed.pathname.match(/\/video\/(BV[\w]+)/i);
    if (bvPath) return `https://www.bilibili.com/video/${bvPath[1]}`;

    return parsed.origin + parsed.pathname;
  } catch {
    const opus = extractOpusIdFromString(u);
    if (opus && /opus/i.test(u)) return `https://www.bilibili.com/opus/${opus}`;
    const cv = u.match(/cv(\d{5,})/i);
    if (cv) return `https://www.bilibili.com/read/cv${cv[1]}`;
    return u;
  }
}

export function buildOpusUrl(opusId: string | number): string {
  return `https://www.bilibili.com/opus/${String(opusId).trim()}`;
}

export function buildReadCvUrl(cvId: string | number): string {
  return `https://www.bilibili.com/read/cv${String(cvId).trim()}`;
}

type BiliItem = Record<string, unknown>;

/** 从搜索 item 字段提取 URL（opus 优先） */
export function resolveBilibiliItemUrlFromSearch(item: BiliItem): BilibiliUrlResolution | null {
  const stringFields = [
    "url",
    "uri",
    "goto_url",
    "jump_url",
    "arcurl",
    "link",
    "share_url"
  ] as const;

  for (const field of stringFields) {
    const v = item[field];
    if (typeof v !== "string" || !v.trim()) continue;
    const normalized = normalizeBilibiliArticleUrl(v);
    const fmt = classifyBilibiliUrl(normalized);
    if (fmt === "opus" || fmt === "read_cv" || fmt === "video") {
      return {
        original_url: v.trim(),
        normalized_url: normalized,
        url_format: fmt
      };
    }
    const opusId = extractOpusIdFromString(v);
    if (opusId) {
      return {
        original_url: v.trim(),
        normalized_url: buildOpusUrl(opusId),
        url_format: "opus"
      };
    }
  }

  const opusId =
    item.opus_id ??
    item.opusId ??
    item.dynamic_id_str ??
    item.dynamic_id ??
    item.opus_fid;
  if (opusId != null && String(opusId).trim()) {
    const id = String(opusId).trim();
    const cv = item.id ?? item.cvid ?? item.article_id;
    const original =
      cv != null && /^\d+$/.test(String(cv).trim())
        ? buildReadCvUrl(String(cv).trim())
        : buildOpusUrl(id);
    return {
      original_url: original,
      normalized_url: buildOpusUrl(id),
      url_format: "opus"
    };
  }

  const param = item.param;
  if (typeof param === "string" && param.trim()) {
    const p = param.trim();
    const opusFromParam = extractOpusIdFromString(p);
    if (opusFromParam) {
      return {
        original_url: p,
        normalized_url: buildOpusUrl(opusFromParam),
        url_format: "opus"
      };
    }
    if (/^cv\d+/i.test(p)) {
      const cv = p.replace(/^cv/i, "");
      return {
        original_url: p,
        normalized_url: buildReadCvUrl(cv),
        url_format: "read_cv"
      };
    }
  }

  const cvId = item.cvid ?? item.article_id ?? item.id;
  if (cvId != null) {
    const cv = String(cvId).trim();
    if (/^\d+$/.test(cv)) {
      return {
        original_url: buildReadCvUrl(cv),
        normalized_url: buildReadCvUrl(cv),
        url_format: "read_cv"
      };
    }
  }

  const bvid = item.bvid;
  if (typeof bvid === "string" && /^bv/i.test(bvid.trim())) {
    const url = `https://www.bilibili.com/video/${bvid.trim()}`;
    return { original_url: url, normalized_url: url, url_format: "video" };
  }

  return null;
}

function extractOpusFromInitialState(html: string): string | null {
  const stateIdx = html.indexOf("window.__INITIAL_STATE__");
  if (stateIdx === -1) return null;
  const slice = html.slice(stateIdx, stateIdx + 120_000);

  const idStr = slice.match(/"id_str":"(\d{10,})"/);
  if (idStr?.[1]) return idStr[1];

  const rootId = slice.match(/"id":"(\d{15,})","detail"/);
  if (rootId?.[1]) return rootId[1];

  const detailId = slice.match(/"detail":\{"basic":\{[\s\S]{0,800}?"id_str":"(\d{10,})"/);
  if (detailId?.[1]) return detailId[1];

  return null;
}

function extractOpusFromHtml(html: string): string | null {
  const fromState = extractOpusFromInitialState(html);
  if (fromState) return fromState;

  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i,
    /"og:url"\s*:\s*"([^"]+)"/i,
    /location\.href\s*=\s*["']([^"']*\/opus\/\d+[^"']*)["']/i,
    /"opus_id"\s*:\s*"?(\d{10,})"?/i,
    /"dynamic_id_str"\s*:\s*"?(\d{10,})"?/i,
    /"dynamic_id"\s*:\s*"?(\d{10,})"?/i
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    const id = extractOpusIdFromString(m[1]);
    if (id) return id;
  }

  const opusInHtml = html.match(/https?:\/\/www\.bilibili\.com\/opus\/(\d{8,})/i);
  if (opusInHtml) return opusInHtml[1];

  return null;
}

async function fetchWithRedirectProbe(
  readCvUrl: string,
  timeoutMs: number
): Promise<{ url?: string; reason?: string }> {
  const headers = await getBilibiliRequestHeaders();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(readCvUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        ...headers,
        Accept: "text/html,application/xhtml+xml"
      },
      signal: controller.signal,
      cache: "no-store"
    });

    const finalUrl = resp.url || readCvUrl;
    if (classifyBilibiliUrl(finalUrl) === "opus") {
      return { url: normalizeBilibiliArticleUrl(finalUrl) };
    }

    const html = await resp.text();
    const opusId = extractOpusFromHtml(html);
    if (opusId) {
      return { url: buildOpusUrl(opusId) };
    }

    if (!resp.ok) {
      return { reason: `http_${resp.status}` };
    }
    return { reason: "no_opus_in_html" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/abort/i.test(msg)) return { reason: "timeout" };
    return { reason: msg.slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 异步解析：已是 opus 则直接返回；read/cv 尝试轻量跳转/页面探测。
 */
export async function resolveBilibiliArticleUrl(
  rawUrl: string,
  options?: { timeoutMs?: number }
): Promise<BilibiliUrlResolution> {
  const timeoutMs = options?.timeoutMs ?? resolveTimeoutMs();
  const original_url = rawUrl.trim();
  const normalized = normalizeBilibiliArticleUrl(original_url);
  const fmt = classifyBilibiliUrl(normalized);

  if (fmt === "opus" || fmt === "video") {
    return {
      original_url,
      normalized_url: normalized,
      url_format: fmt
    };
  }

  if (fmt !== "read_cv") {
    return {
      original_url,
      normalized_url: normalized,
      url_format: fmt,
      resolve_failed_reason: "not_read_cv"
    };
  }

  const probe = await fetchWithRedirectProbe(normalized, timeoutMs);
  if (probe.url) {
    return {
      original_url,
      normalized_url: probe.url,
      url_format: "opus",
      resolve_failed_reason: undefined
    };
  }

  return {
    original_url,
    normalized_url: normalized,
    url_format: "read_cv",
    resolve_failed_reason: probe.reason ?? "resolve_failed"
  };
}

/** 批量解析 read/cv→opus（限制条数，fail-open 保留 read/cv） */
export async function resolveBilibiliArticleUrlsLimited<T extends { url: string }>(
  items: T[],
  maxResolve = 2
): Promise<(T & Partial<BilibiliUrlResolution>)[]> {
  const out: (T & Partial<BilibiliUrlResolution>)[] = [];
  let resolved = 0;

  for (const item of items) {
    const base = normalizeBilibiliArticleUrl(item.url);
    const fmt = classifyBilibiliUrl(base);

    if (fmt === "opus" || fmt === "video" || resolved >= maxResolve) {
      out.push({
        ...item,
        original_url: item.url,
        normalized_url: base,
        url_format: fmt
      });
      continue;
    }

    const r = await resolveBilibiliArticleUrl(item.url);
    resolved += 1;
    out.push({
      ...item,
      original_url: r.original_url,
      normalized_url: r.normalized_url,
      url_format: r.url_format,
      resolve_failed_reason: r.resolve_failed_reason
    });
  }

  return out;
}
