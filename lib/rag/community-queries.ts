import type { WorkMeta } from "@/lib/types";

export const COMMUNITY_QUERIES_PER_SOURCE = 3;

const CN_SUFFIXES = [
  "考据",
  "解析",
  "解读",
  "访谈",
  "制作",
  "演出",
  "分镜",
  "原作",
  "B站专栏",
  "专栏"
] as const;

const EN_SUFFIXES = ["analysis", "interview"] as const;

export interface BuildCommunityQueriesInput {
  /** 用户最初输入（作品页 / API 的 q） */
  userQuery: string;
  primaryQuery: string;
  meta: WorkMeta;
  bangumiNameCn?: string | null;
}

function normalizeQueryKey(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

/** 按优先级生成社区检索候选（已去重，保留顺序） */
export function buildCommunityQueryCandidates(input: BuildCommunityQueriesInput): string[] {
  const user =
    input.userQuery?.trim() ||
    input.primaryQuery?.trim() ||
    "";
  const title = input.meta.title?.trim() || "";
  const native = input.meta.nativeTitle?.trim() || "";
  const nameCn = input.bangumiNameCn?.trim() || "";

  const raw: (string | undefined)[] = [
    user || undefined,
    nameCn || undefined,
    native || undefined,
    title || undefined,
    title ? `${title} 考据` : undefined,
    title ? `${title} 解析` : undefined,
    title ? `${title} 专栏` : undefined,
    title ? `${title} NGA` : undefined
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (!item) continue;
    const key = normalizeQueryKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** 每个社区源最多尝试前 N 条候选 */
export function pickCommunityQueriesForSource(
  candidates: string[],
  max = COMMUNITY_QUERIES_PER_SOURCE
): string[] {
  return candidates.slice(0, max);
}

function isMostlyLatin(s: string): boolean {
  const latin = (s.match(/[a-zA-Z]/g) || []).length;
  return latin >= 4 && latin / Math.max(s.length, 1) > 0.35;
}

function isMostlyCjk(s: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(s);
}

/**
 * 社区延伸阅读专用 query（考据/解析向）；RAG retriever 仍用 buildCommunityQueryCandidates。
 */
export function buildCommunityRecQueryCandidates(input: BuildCommunityQueriesInput): string[] {
  const user =
    input.userQuery?.trim() ||
    input.primaryQuery?.trim() ||
    "";
  const title = input.meta.title?.trim() || "";
  const native = input.meta.nativeTitle?.trim() || "";
  const nameCn = input.bangumiNameCn?.trim() || "";

  const bases: string[] = [];
  const seenBase = new Set<string>();
  for (const b of [user, nameCn, native, title]) {
    if (!b) continue;
    const key = normalizeQueryKey(b);
    if (!key || seenBase.has(key)) continue;
    seenBase.add(key);
    bases.push(b);
  }

  const seen = new Set<string>();
  const out: string[] = [];

  const push = (q: string | undefined) => {
    if (!q) return;
    const key = normalizeQueryKey(q);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(q);
  };

  for (const base of bases) {
    push(base);
    if (isMostlyCjk(base) || !isMostlyLatin(base)) {
      for (const suf of CN_SUFFIXES) {
        push(`${base} ${suf}`);
      }
    }
    if (isMostlyLatin(base)) {
      for (const suf of EN_SUFFIXES) {
        push(`${base} ${suf}`);
      }
    } else if (native && base === native) {
      push(`${base} 考据`);
      push(`${base} 解析`);
    }
  }

  if (title && nameCn && normalizeQueryKey(title) !== normalizeQueryKey(nameCn)) {
    push(`${nameCn} 考据`);
    push(`${nameCn} 解析`);
  }

  return out;
}

/** Bangumi 检索 query（硬事实源，不用「考据/专栏」等社区后缀） */
export function buildBangumiSearchQueries(input: {
  userQuery: string;
  primaryQuery: string;
  meta: WorkMeta;
}): string[] {
  const raw = [
    input.userQuery?.trim(),
    input.meta.nativeTitle?.trim(),
    input.meta.title?.trim(),
    input.primaryQuery?.trim()
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (!item) continue;
    const key = normalizeQueryKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, COMMUNITY_QUERIES_PER_SOURCE);
}
