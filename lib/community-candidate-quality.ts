import { normalizeBilibiliArticleUrl } from "@/lib/data-sources/bilibili-article-url";
import type { CommunityArticleCandidate, CommunityArticleSource } from "@/lib/types";

const POSITIVE_TITLE = [
  "考据",
  "解析",
  "解读",
  "访谈",
  "制作",
  "幕后",
  "演出",
  "分镜",
  "原作",
  "剧情",
  "设定",
  "人物",
  "监督",
  "脚本",
  "音乐",
  "作画",
  "分析",
  "访谈",
  "导演",
  "编剧"
];

const POSITIVE_SNIPPET = [...POSITIVE_TITLE, "延伸", "专栏"];

/** 命中即直接丢弃 */
const HARD_BLOCK = [
  "资源",
  "网盘",
  "百度云",
  "百度网盘",
  "阿里云盘",
  "夸克",
  "下载",
  "BT",
  "磁力",
  "生肉",
  "熟肉",
  "全集",
  "合集",
  "在线看",
  "在线观看",
  "无修",
  "1080p",
  "1080P",
  "4K",
  "4k",
  "字幕组",
  "补番",
  "MAD",
  "AMV"
];

/** 仅在标题命中时丢弃（避免误伤正文里的「剪辑」讨论） */
const HARD_BLOCK_TITLE = [
  "网盘",
  "百度云",
  "下载",
  "磁力",
  "BT种子",
  "全集打包",
  "资源分享",
  // 搜索结果中常见的图片/素材帖并非考据或创作讨论；只检查标题，避免误伤正文提及的场景。
  "壁纸"
];

const SOFT_BLOCK = ["剪辑", "搬运", "转载"];

export type FilterRejectReason =
  | "resource_keyword"
  | "no_url"
  | "invalid_url"
  | "low_quality"
  | "blocked_content";

export interface FilteredOutEntry {
  id: string;
  title: string;
  source: string;
  reason: FilterRejectReason;
  detail?: string;
}

function blob(c: CommunityArticleCandidate): string {
  return `${c.title || ""} ${c.snippet || ""} ${c.url || ""}`;
}

function titleBlob(c: CommunityArticleCandidate): string {
  return c.title || "";
}

export function hasHardResourceSignal(c: CommunityArticleCandidate): boolean {
  const t = titleBlob(c);
  const all = blob(c);
  if (HARD_BLOCK_TITLE.some((k) => t.includes(k))) return true;
  if (HARD_BLOCK.some((k) => all.includes(k))) return true;
  if (/pan\.baidu|aliyundrive|夸克|magnet:\?|ed2k:/i.test(c.url)) return true;
  return false;
}

function hasSoftResourceSignal(c: CommunityArticleCandidate): boolean {
  const t = titleBlob(c);
  return SOFT_BLOCK.some((k) => t.includes(k));
}

function hasPositiveSignal(c: CommunityArticleCandidate): boolean {
  const t = titleBlob(c);
  const s = c.snippet || "";
  if (POSITIVE_TITLE.some((k) => t.includes(k))) return true;
  if (POSITIVE_SNIPPET.some((k) => s.includes(k))) return true;
  return false;
}

function isAllowedUrl(url: string, source: CommunityArticleSource): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (source === "manual") return true;
    if (source === "bilibili") return host.includes("bilibili.com");
    if (source === "nga") return host.includes("nga") || host.includes("178.com");
    if (source === "aweidao") return host.includes("aweidao");
    if (source === "bangumi") return host === "bgm.tv" || host.endsWith(".bgm.tv");
    return host.includes("bilibili.com") || host.includes("nga") || host.includes("aweidao");
  } catch {
    return false;
  }
}

export function normalizeCommunityArticleUrl(
  url: string,
  source: CommunityArticleSource
): string {
  if (source !== "bilibili") return url.trim();
  return normalizeBilibiliArticleUrl(url);
}

export function scoreCommunityCandidate(c: CommunityArticleCandidate): number {
  let score = 0;
  const t = titleBlob(c);
  const s = c.snippet || "";
  const url = c.url || "";

  for (const k of POSITIVE_TITLE) {
    if (t.includes(k)) score += 12;
    else if (s.includes(k)) score += 5;
  }

  if (c.source === "manual") score += 25;
  if (c.source === "bilibili" && /\/opus\/\d+/i.test(url)) score += 18;
  if (c.source === "bilibili" && /\/read\/cv\d+/i.test(url)) score += 12;
  if (c.source === "nga") score += 8;
  if (c.source === "aweidao") score += 6;

  if (hasSoftResourceSignal(c)) score -= 20;
  if (!hasPositiveSignal(c) && c.source !== "manual") score -= 3;

  return score;
}

export function filterCommunityArticleCandidate(
  c: CommunityArticleCandidate
): { ok: true; candidate: CommunityArticleCandidate } | { ok: false; reason: FilterRejectReason; detail?: string } {
  if (!c.title?.trim() || c.title.trim().length < 2) {
    return { ok: false, reason: "low_quality", detail: "title_too_short" };
  }
  if (!c.url?.trim()) {
    return { ok: false, reason: "no_url" };
  }
  const url = normalizeCommunityArticleUrl(c.url, c.source);
  if (!isAllowedUrl(url, c.source)) {
    return { ok: false, reason: "invalid_url", detail: c.source };
  }
  if (hasHardResourceSignal({ ...c, url })) {
    return { ok: false, reason: "resource_keyword" };
  }
  if (/出错啦|验证码|aba\.bilibili\.com/i.test(blob(c))) {
    return { ok: false, reason: "blocked_content" };
  }

  return {
    ok: true,
    candidate: { ...c, url, qualityScore: scoreCommunityCandidate({ ...c, url }) }
  };
}

export interface RankedCandidatesResult {
  candidates: CommunityArticleCandidate[];
  filtered_out: FilteredOutEntry[];
}

/**
 * 过滤并排序候选：优先考据/解析；无高质量结果时放宽（仍剔除明显资源贴）。
 */
export function rankAndFilterCommunityCandidates(
  raw: CommunityArticleCandidate[]
): RankedCandidatesResult {
  const filtered_out: FilteredOutEntry[] = [];
  const passed: CommunityArticleCandidate[] = [];

  for (const c of raw) {
    const r = filterCommunityArticleCandidate(c);
    if (!r.ok) {
      filtered_out.push({
        id: c.id,
        title: c.title || "(无标题)",
        source: c.source,
        reason: r.reason,
        detail: r.detail
      });
      continue;
    }
    passed.push(r.candidate);
  }

  const strict = passed
    .filter((c) => (c.qualityScore ?? 0) > 0 || c.source === "manual" || hasPositiveSignal(c))
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));

  const pool = strict.length > 0 ? strict : passed.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));

  const seen = new Set<string>();
  const candidates: CommunityArticleCandidate[] = [];
  for (const c of pool) {
    const key = c.url.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(c);
  }

  return { candidates, filtered_out };
}
