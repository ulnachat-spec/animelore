/**
 * B站请求会话：从 process.env.BILIBILI_COOKIE 读取密钥，仅用于服务端 fetch 的 Cookie 头。
 * 不得打印、不得写入 debug、不得返回前端。
 */

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const SESSION_TTL_MS = 25 * 60 * 1000;

export const BILIBILI_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": BROWSER_UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Origin: "https://www.bilibili.com",
  Referer: "https://search.bilibili.com/"
};

/** 可安全暴露给 debug 的会话标记（不含 Cookie 内容） */
export interface BilibiliSessionMeta {
  usedEnvCookie: boolean;
  fetchedBootstrapCookie: boolean;
}

interface SessionCache {
  meta: BilibiliSessionMeta;
  /** 仅模块内用于 outbound fetch，禁止序列化或透出 */
  cookieHeader: string;
  at: number;
}

let sessionCache: SessionCache | null = null;

function readEnvBilibiliCookie(): string {
  return process.env.BILIBILI_COOKIE?.trim() ?? "";
}

function parseCookiePairs(setCookieHeaders: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const raw of setCookieHeaders) {
    const part = raw.split(";")[0]?.trim();
    if (!part || !part.includes("=")) continue;
    const eq = part.indexOf("=");
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) map.set(name, value);
  }
  return map;
}

function mergeCookieMaps(...maps: Map<string, string>[]): string {
  const merged = new Map<string, string>();
  for (const m of maps) {
    for (const [k, v] of m) merged.set(k, v);
  }
  return [...merged.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function collectSetCookies(resp: Response): string[] {
  const headers = resp.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const single = resp.headers.get("set-cookie");
  return single ? [single] : [];
}

async function fetchHomepageCookies(): Promise<Map<string, string>> {
  const resp = await fetch("https://www.bilibili.com", {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9"
    },
    redirect: "follow",
    cache: "no-store"
  });
  return parseCookiePairs(collectSetCookies(resp));
}

async function fetchFingerSpiCookies(existingCookie: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const resp = await fetch("https://api.bilibili.com/x/frontend/finger/spi", {
      headers: {
        ...BILIBILI_BROWSER_HEADERS,
        Referer: "https://www.bilibili.com/",
        ...(existingCookie ? { Cookie: existingCookie } : {})
      },
      cache: "no-store"
    });
    const raw = await resp.text();
    let data: { code?: number; data?: { b_3?: string; b_4?: string } };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      return map;
    }
    if (data.data?.b_3) map.set("buvid3", data.data.b_3);
    if (data.data?.b_4) map.set("buvid4", data.data.b_4);
    for (const [k, v] of parseCookiePairs(collectSetCookies(resp))) {
      map.set(k, v);
    }
  } catch {
    /* fail-open */
  }
  return map;
}

function mergeCookieMapList(...maps: Map<string, string>[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const m of maps) {
    for (const [k, v] of m) merged.set(k, v);
  }
  return merged;
}

async function fetchBootstrapCookies(): Promise<Map<string, string>> {
  const home = await fetchHomepageCookies();
  const spi = await fetchFingerSpiCookies(mergeCookieMaps(home));
  return mergeCookieMapList(home, spi);
}

async function buildSessionCache(): Promise<SessionCache> {
  const envCookie = readEnvBilibiliCookie();
  const usedEnvCookie = envCookie.length > 0;
  let fetchedBootstrapCookie = false;
  let cookieHeader = "";

  if (usedEnvCookie) {
    // 环境变量 Cookie 原样放入请求头，避免解析/拼接导致丢失或泄露到日志
    cookieHeader = envCookie;
  } else {
    let bootstrapMap = new Map<string, string>();
    try {
      bootstrapMap = await fetchBootstrapCookies();
      fetchedBootstrapCookie = bootstrapMap.size > 0;
    } catch {
      fetchedBootstrapCookie = false;
    }
    cookieHeader = mergeCookieMaps(bootstrapMap);
  }

  return {
    meta: { usedEnvCookie, fetchedBootstrapCookie },
    cookieHeader,
    at: Date.now()
  };
}

async function ensureSession(): Promise<SessionCache> {
  const now = Date.now();
  if (sessionCache && now - sessionCache.at < SESSION_TTL_MS) {
    return sessionCache;
  }
  sessionCache = await buildSessionCache();
  return sessionCache;
}

/** 仅返回可进入 debug 的标记，不含 Cookie */
export async function getBilibiliSessionMeta(): Promise<BilibiliSessionMeta> {
  const s = await ensureSession();
  return s.meta;
}

let anonymousCache: { cookieHeader: string; at: number } | null = null;

/**
 * 不带环境变量 Cookie 的匿名请求头（仅首页 / finger/spi 下发的 buvid 等）。
 * 环境变量 Cookie 过期（nav 返回 -101）时，WBI 搜索会返回 v_voucher 风控；匿名会话可正常搜索。
 */
export async function getBilibiliAnonymousRequestHeaders(): Promise<Record<string, string>> {
  const now = Date.now();
  if (!anonymousCache || now - anonymousCache.at >= SESSION_TTL_MS) {
    let cookieHeader = "";
    try {
      cookieHeader = mergeCookieMaps(await fetchBootstrapCookies());
    } catch {
      /* fail-open：无 Cookie 也尝试 */
    }
    anonymousCache = { cookieHeader, at: now };
  }
  const h: Record<string, string> = { ...BILIBILI_BROWSER_HEADERS };
  if (anonymousCache.cookieHeader) h.Cookie = anonymousCache.cookieHeader;
  return h;
}

/** 服务端 B站 API 请求头（含 Cookie）；Cookie 值不离开本模块调用栈 */
export async function getBilibiliRequestHeaders(): Promise<Record<string, string>> {
  const { cookieHeader } = await ensureSession();
  const h: Record<string, string> = { ...BILIBILI_BROWSER_HEADERS };
  if (cookieHeader) h.Cookie = cookieHeader;
  return h;
}
