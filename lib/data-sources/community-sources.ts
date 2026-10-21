import { communityRecsResolveOpusOnFetch } from "@/lib/community-recs-config";
import {
  getBilibiliAnonymousRequestHeaders,
  getBilibiliRequestHeaders,
  getBilibiliSessionMeta
} from "@/lib/data-sources/bilibili-session";
import { buildWbiSearchUrl, getBilibiliWbiKeys } from "@/lib/data-sources/bilibili-wbi";
import {
  extractBilibiliSearchResults,
  pickBilibiliArticleCandidates,
  pickBestBilibiliArticle,
  summarizeBilibiliSearchPayload
} from "@/lib/data-sources/bilibili-search-parse";
import {
  communityFetchFailure,
  communityFetchSuccess,
  type CommunityFetchMeta,
  type CommunityFetchOutcome,
  type CommunitySourceId
} from "@/lib/data-sources/community-fetch-types";

export type {
  CommunityFetchFailure,
  CommunityFetchOutcome,
  CommunityFetchPhase,
  CommunityFetchSuccess,
  CommunitySourceId
} from "@/lib/data-sources/community-fetch-types";

/** WBI 签名搜索；专栏 search_type=article（bilibili-API-collect） */
const BILI_WBI_SEARCH = "https://api.bilibili.com/x/web-interface/wbi/search/type";
/** 非 WBI 搜索；WBI 被 v_voucher 风控时的兜底 */
const BILI_PLAIN_SEARCH = "https://api.bilibili.com/x/web-interface/search/type";
const BILI_ARTICLE_SEARCH_TYPES = ["article", "column"] as const;

const AWEIDAO_BASE = "https://aweidao1.com";
const AWEIDAO_SEARCH = `${AWEIDAO_BASE}/api/v1/search`;

export interface CommunityArticleEvidence {
  title: string;
  url: string;
  snippet: string;
  structured: Record<string, unknown>;
}

function extractHtmlTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

function responseLooksLikeHtml(body: string, contentType: string): boolean {
  const ct = contentType.toLowerCase();
  if (ct.includes("text/html")) return true;
  const t = body.trim();
  return t.startsWith("<!") || t.startsWith("<html") || t.toLowerCase().startsWith("<!doctype");
}

function buildPlainSearchUrl(params: Record<string, string | number>): string {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  return `${BILI_PLAIN_SEARCH}?${qs}`;
}

/** HTTP 412 / code=-412 / 只返回 v_voucher 风控凭证 → 换一种方式重试 */
function bilibiliSearchBlocked(status: number, raw: string): boolean {
  if (status === 412) return true;
  try {
    const data = JSON.parse(raw) as { code?: number; data?: unknown };
    if (data.code === -412) return true;
    const payload = data.data as Record<string, unknown> | null | undefined;
    return (
      !!payload &&
      typeof payload === "object" &&
      "v_voucher" in payload &&
      !Array.isArray(payload.result)
    );
  } catch {
    return false;
  }
}

async function bilibiliDebugMeta(): Promise<CommunityFetchMeta> {
  const m = await getBilibiliSessionMeta();
  return {
    used_env_cookie: m.usedEnvCookie,
    fetched_bootstrap_cookie: m.fetchedBootstrapCookie
  };
}

function bilibiliFailurePhase(
  httpStatus: number,
  apiCode?: number
): "http_412" | "anti_bot" | "http" | "api_code" {
  if (httpStatus === 412) return "http_412";
  if (apiCode === -412) return "anti_bot";
  if (apiCode != null && apiCode !== 0) return "api_code";
  return "http";
}

/**
 * B站专栏搜索（社区语境，WBI + Cookie）；失败返回带原因的 outcome，不抛错。
 */
export async function fetchBilibiliColumnContext(
  query: string
): Promise<CommunityFetchOutcome> {
  const q = query.trim();
  const source: CommunitySourceId = "bilibili";
  if (!q) {
    return communityFetchFailure(source, q, {
      status: null,
      phase: "empty",
      message: "query 为空"
    });
  }

  try {
    const baseMeta = await bilibiliDebugMeta();

    const wbiKeys = await getBilibiliWbiKeys();
    if (!wbiKeys) {
      return communityFetchFailure(source, q, {
        status: null,
        phase: "api_code",
        message: "无法获取 WBI 签名密钥（nav 接口失败）",
        meta: baseMeta
      });
    }

    let lastMeta: CommunityFetchMeta = { ...baseMeta };
    let lastStatus = 200;
    let lastSummary = summarizeBilibiliSearchPayload({
      searchType: BILI_ARTICLE_SEARCH_TYPES[0],
      payload: null
    });

    for (const searchType of BILI_ARTICLE_SEARCH_TYPES) {
      const params = {
        search_type: searchType,
        keyword: q,
        page: 1,
        page_size: 8,
        order: "totalrank"
      };
      // 环境变量 Cookie 过期时 WBI 搜索返回 v_voucher；依次退到匿名会话、非 WBI 接口
      const attempts = [
        {
          id: "wbi_session",
          url: () => buildWbiSearchUrl(BILI_WBI_SEARCH, params, wbiKeys.imgKey, wbiKeys.subKey),
          headers: getBilibiliRequestHeaders
        },
        ...(baseMeta.used_env_cookie
          ? [
              {
                id: "wbi_anonymous",
                url: () => buildWbiSearchUrl(BILI_WBI_SEARCH, params, wbiKeys.imgKey, wbiKeys.subKey),
                headers: getBilibiliAnonymousRequestHeaders
              }
            ]
          : []),
        {
          id: "plain_session",
          url: () => buildPlainSearchUrl(params),
          headers: getBilibiliRequestHeaders
        }
      ];

      let contentType = "";
      let raw = "";
      for (const attempt of attempts) {
        const resp = await fetch(attempt.url(), {
          headers: await attempt.headers(),
          cache: "no-store"
        });
        lastStatus = resp.status;
        contentType = resp.headers.get("content-type") || "";
        raw = await resp.text();
        lastMeta = { ...baseMeta, bilibili_attempt: attempt.id };
        if (!bilibiliSearchBlocked(lastStatus, raw)) break;
      }
      const attemptMeta = lastMeta;

      if (lastStatus === 412) {
        return communityFetchFailure(source, q, {
          status: lastStatus,
          phase: "http_412",
          message: "HTTP 412（需有效 Cookie / WBI 签名，或触发风控）",
          meta: lastMeta
        });
      }

      if (lastStatus < 200 || lastStatus >= 300) {
        return communityFetchFailure(source, q, {
          status: lastStatus,
          phase: "http",
          message: `HTTP ${lastStatus}`,
          meta: lastMeta
        });
      }

      if (responseLooksLikeHtml(raw, contentType)) {
        const title = extractHtmlTitle(raw);
        return communityFetchFailure(source, q, {
          status: lastStatus,
          phase: "anti_bot_html",
          message: title
            ? `接口返回 HTML 反爬页（title: ${title}）`
            : "接口返回 HTML 而非 JSON（疑似 WAF/风控）",
          meta: lastMeta
        });
      }

      let data: { code?: number; message?: string; data?: unknown };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        return communityFetchFailure(source, q, {
          status: lastStatus,
          phase: "parse",
          message: "响应无法解析为 JSON",
          meta: lastMeta
        });
      }

      const apiCode = data.code;
      const apiMessage = data.message;
      const payload = data.data;
      lastSummary = summarizeBilibiliSearchPayload({
        searchType,
        code: apiCode,
        message: apiMessage,
        payload
      });
      lastMeta = {
        ...attemptMeta,
        bilibili_api_code: apiCode,
        bilibili_api_message: apiMessage,
        bilibili_result_debug: lastSummary
      };

      if (apiCode === -412) {
        return communityFetchFailure(source, q, {
          status: lastStatus,
          phase: "anti_bot",
          message: `B站风控 code=-412${apiMessage ? ` message=${apiMessage}` : ""}`,
          meta: lastMeta
        });
      }

      if (apiCode !== 0) {
        return communityFetchFailure(source, q, {
          status: lastStatus,
          phase: bilibiliFailurePhase(lastStatus, apiCode),
          message: `B站 API code=${apiCode ?? "unknown"}${apiMessage ? ` message=${apiMessage}` : ""}`,
          meta: lastMeta
        });
      }

      if (
        payload &&
        typeof payload === "object" &&
        "v_voucher" in (payload as Record<string, unknown>) &&
        !Array.isArray((payload as Record<string, unknown>).result)
      ) {
        return communityFetchFailure(source, q, {
          status: lastStatus,
          phase: "anti_bot",
          message: "搜索返回风控凭证 v_voucher（无专栏列表）",
          meta: lastMeta
        });
      }

      const items = extractBilibiliSearchResults(payload);
      const parsed = await pickBestBilibiliArticle(items, q, {
        maxUrlResolve: communityRecsResolveOpusOnFetch() ? 1 : 0
      });
      if (parsed) {
        return communityFetchSuccess(
          source,
          q,
          {
            title: parsed.title,
            url: parsed.url,
            snippet: parsed.snippet,
            structured: {
              ...parsed.structured,
              author: parsed.author,
              original_url: parsed.original_url,
              normalized_url: parsed.normalized_url ?? parsed.url,
              url_format: parsed.url_format,
              resolve_failed_reason: parsed.resolve_failed_reason
            }
          },
          lastMeta
        );
      }

      if (items.length === 0 && searchType !== BILI_ARTICLE_SEARCH_TYPES.at(-1)) {
        continue;
      }
    }

    const note = lastSummary.url_resolve_note || "未能从 result 条目解析 bilibili.com URL";
    return communityFetchFailure(source, q, {
      status: lastStatus,
      phase: "empty",
      message:
        lastSummary.result_count === 0
          ? `搜索无专栏结果（search_type=${lastSummary.search_type}）`
          : note,
      meta: lastMeta
    });
  } catch (err) {
    return communityFetchFailure(source, q, {
      status: null,
      phase: "network",
      message: err instanceof Error ? err.message : String(err)
    });
  }
}

/**
 * 阿苇岛帖子搜索；需登录态时可在环境变量配置 Cookie。
 */
export async function fetchAweidaoCommunityContext(
  query: string
): Promise<CommunityFetchOutcome> {
  const q = query.trim();
  const source: CommunitySourceId = "aweidao";
  if (!q) {
    return communityFetchFailure(source, q, {
      status: null,
      phase: "empty",
      message: "query 为空"
    });
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "AnimeLore/0.1",
      Origin: AWEIDAO_BASE,
      Referer: `${AWEIDAO_BASE}/search`
    };
    const cookie = process.env.RAG_AWEIDAO_COOKIE?.trim();
    if (cookie) headers.Cookie = cookie;

    const resp = await fetch(AWEIDAO_SEARCH, {
      method: "POST",
      headers,
      body: JSON.stringify({ keyword: q, page: 1, sort: "similarity" }),
      cache: "no-store"
    });
    const status = resp.status;
    const contentType = resp.headers.get("content-type") || "";
    const raw = await resp.text();

    if (!resp.ok) {
      return communityFetchFailure(source, q, {
        status,
        phase: "http",
        message: `HTTP ${status}`
      });
    }

    if (responseLooksLikeHtml(raw, contentType)) {
      const title = extractHtmlTitle(raw);
      return communityFetchFailure(source, q, {
        status,
        phase: "anti_bot_html",
        message: title ? `响应为 HTML（${title}）` : "响应为 HTML 而非 JSON"
      });
    }

    let data: {
      errcode?: number;
      errmsg?: string;
      result?: {
        threads?: Array<{
          id?: number;
          parent?: number;
          title?: string;
          content?: string;
        }>;
        total?: number;
      };
    };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      return communityFetchFailure(source, q, {
        status,
        phase: "parse",
        message: "响应无法解析为 JSON"
      });
    }

    if (data.errcode !== 0) {
      return communityFetchFailure(source, q, {
        status,
        phase: "api_code",
        message: `阿苇岛 errcode=${data.errcode ?? "unknown"}${data.errmsg ? ` errmsg=${data.errmsg}` : ""}`
      });
    }

    const threads = data.result?.threads || [];
    if (threads.length === 0) {
      return communityFetchFailure(source, q, {
        status,
        phase: "empty",
        message: "搜索无帖子"
      });
    }

    const best =
      threads.find(
        (t) =>
          (t.title && t.title.includes(q)) || (t.content && stripTags(t.content).includes(q))
      ) || threads[0];

    const id = best.id;
    if (id == null) {
      return communityFetchFailure(source, q, {
        status,
        phase: "empty",
        message: "帖子缺少 id"
      });
    }

    const title = stripTags(best.title || q);
    const snippet =
      stripTags(best.content || "").slice(0, 2000) ||
      `阿苇岛讨论帖：${title}（仅作社区观点参考，非官方事实来源）`;

    const url =
      best.parent && best.parent !== 0
        ? `${AWEIDAO_BASE}/t/${best.parent}?r=${id}`
        : `${AWEIDAO_BASE}/t/${id}`;

    return communityFetchSuccess(source, q, {
      title,
      url,
      snippet,
      structured: { community: "aweidao_thread", threadId: id, total: data.result?.total }
    });
  } catch (err) {
    return communityFetchFailure(source, q, {
      status: null,
      phase: "network",
      message: err instanceof Error ? err.message : String(err)
    });
  }
}

/**
 * NGA 社区检索（尽力而为）；失败返回 outcome，不抛错。
 */
export async function fetchNgaCommunityContext(
  query: string
): Promise<CommunityFetchOutcome> {
  const q = query.trim();
  const source: CommunitySourceId = "nga";
  if (!q) {
    return communityFetchFailure(source, q, {
      status: null,
      phase: "empty",
      message: "query 为空"
    });
  }

  try {
    const searchUrl = `https://ngabbs.com/nuke.php?func=search&range=1&searchsubmit=yes&keywords=${encodeURIComponent(
      q
    )}`;
    const resp = await fetch(searchUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": "AnimeLore/0.1"
      },
      cache: "no-store",
      redirect: "follow"
    });
    const status = resp.status;
    const html = await resp.text();

    if (!resp.ok) {
      return communityFetchFailure(source, q, {
        status,
        phase: "http",
        message: `HTTP ${status}`
      });
    }

    if (status === 412 || status === 403 || status === 429) {
      return communityFetchFailure(source, q, {
        status,
        phase: "http",
        message: `HTTP ${status}（可能被限流或拦截）`
      });
    }

    const threadMatch = html.match(
      /<a[^>]+href="(\/read\.php\?tid=\d+)"[^>]*>([^<]{4,120})<\/a>/i
    );

    if (!threadMatch) {
      const title = extractHtmlTitle(html);
      const blocked =
        /验证码|请登录|访问过于频繁|403 Forbidden|412 Precondition|429 Too Many|系统繁忙/i.test(
          html
        );
      if (blocked || html.length < 4000) {
        return communityFetchFailure(source, q, {
          status,
          phase: "anti_bot_html",
          message: title
            ? `未解析到帖子链接（${title}；html ${html.length} 字节）`
            : `未解析到帖子链接（html ${html.length} 字节，疑似登录/风控页）`
        });
      }
      return communityFetchFailure(source, q, {
        status,
        phase: "parse",
        message: `搜索结果 HTML 中无 read.php 帖子链接（html ${html.length} 字节）`
      });
    }

    const path = threadMatch[1];
    const title = decodeHtml(threadMatch[2].trim());
    const threadUrl = `https://ngabbs.com${path}`;

    const snippet =
      extractNearKeyword(html, q).slice(0, 1500) ||
      `NGA 社区讨论帖：${title}（仅作社区观点参考，非官方事实来源）`;

    return communityFetchSuccess(source, q, {
      title,
      url: threadUrl,
      snippet,
      structured: { community: "nga_thread" }
    });
  } catch (err) {
    return communityFetchFailure(source, q, {
      status: null,
      phase: "network",
      message: err instanceof Error ? err.message : String(err)
    });
  }
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function extractNearKeyword(html: string, keyword: string): string {
  const plain = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ");
  const idx = plain.indexOf(keyword);
  if (idx === -1) return plain.replace(/\s+/g, " ").trim().slice(0, 800);
  const start = Math.max(0, idx - 200);
  return plain.slice(start, start + 900).replace(/\s+/g, " ").trim();
}
