export function communityRecsEnabled(): boolean {
  const v = process.env.COMMUNITY_RECS_ENABLED?.trim();
  // 中文社区延伸阅读是作品页的核心信息层；未配置时保持可用。
  // 仅允许通过明确的 false/0 暂停，避免部署平台没有注入可选变量时整个区域静默消失。
  if (v == null || v === "") return true;
  return v !== "false" && v !== "0";
}

export function communityRecsMax(): number {
  const v = process.env.COMMUNITY_RECS_MAX;
  if (!v) return 3;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(n, 10));
}

/** 每个 live 源（bilibili/nga/aweidao）最多尝试的 query 数 */
export function communityRecsQueryLimit(): number {
  const v = process.env.COMMUNITY_RECS_QUERY_LIMIT;
  if (!v) return 6;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 6;
  return Math.max(1, Math.min(n, 12));
}

/** 单次社区源 fetch 超时（毫秒） */
export function communityRecsFetchTimeoutMs(): number {
  const v = process.env.COMMUNITY_RECS_FETCH_TIMEOUT_MS;
  if (!v) return 3000;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 3000;
  return Math.max(800, Math.min(n, 15000));
}

/** 社区源抓取阶段总预算（毫秒）；与 LLM 推荐语分开计时 */
export function communityRecsFetchDeadlineMs(): number {
  const v = process.env.COMMUNITY_RECS_TIMEOUT_MS;
  if (!v) return 10000;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 10000;
  return Math.max(3000, Math.min(n, 30000));
}

/** LLM 写推荐语超时（毫秒） */
export function communityRecsReasonerTimeoutMs(): number {
  const v = process.env.COMMUNITY_RECS_REASONER_TIMEOUT_MS;
  if (!v) return 8000;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 8000;
  return Math.max(2000, Math.min(n, 30000));
}

/** @deprecated 使用 communityRecsFetchDeadlineMs */
export function communityRecsTimeoutMs(): number {
  return communityRecsFetchDeadlineMs();
}

export function communityRecsResolveOpusOnFetch(): boolean {
  const v = process.env.COMMUNITY_RECS_RESOLVE_OPUS?.trim();
  if (v == null || v === "") return false;
  return v === "true" || v === "1";
}

const DEFAULT_SOURCES = ["curated", "bilibili", "nga", "aweidao"] as const;

export function parseCommunityRecsSources(): Set<string> {
  const raw = process.env.COMMUNITY_RECS_SOURCES;
  const list = raw
    ? raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [...DEFAULT_SOURCES];
  return new Set(list);
}
