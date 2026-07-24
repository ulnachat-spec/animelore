function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** 客户端拉取 AniList 相关推荐 API 超时（毫秒） */
export function workRelatedClientTimeoutMs(): number {
  return envInt("WORK_RELATED_TIMEOUT_MS", 8000);
}

/** 客户端拉取社区推荐 API 超时（毫秒） */
export function workCommunityRecsClientTimeoutMs(): number {
  return envInt("WORK_COMMUNITY_RECS_CLIENT_TIMEOUT_MS", 12000);
}

/** 服务端 related API 内部超时（毫秒） */
export function workRelatedServerTimeoutMs(): number {
  return envInt("WORK_RELATED_TIMEOUT_MS", 8000);
}
