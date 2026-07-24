export type HomeHookMode = "library_only" | "library_first" | "generate_only";

export type HomeHookRotationMode = "balanced" | "stable";

export function homeHookMode(): HomeHookMode {
  const v = process.env.HOME_HOOK_MODE?.trim();
  if (v === "library_first") return "library_first";
  if (v === "generate_only") return "generate_only";
  return "library_only";
}

export function homeHookRotationMode(): HomeHookRotationMode {
  const v = process.env.HOME_HOOK_ROTATION_MODE?.trim();
  if (v === "stable") return "stable";
  return "balanced";
}

export function homeHookCacheTtlMs(): number {
  const v = process.env.HOME_HOOK_CACHE_TTL_MS;
  const n = v ? parseInt(v, 10) : 86_400_000;
  return Number.isFinite(n) ? Math.max(60_000, n) : 86_400_000;
}

export function homeHookGenerateOnMiss(): boolean {
  if (process.env.HOME_HOOK_GENERATE_ON_MISS === "false") return false;
  return true;
}

export function homeHookRecentTopicWindow(): number {
  const v = process.env.HOME_HOOK_RECENT_TOPIC_WINDOW;
  const n = v ? parseInt(v, 10) : 10;
  return Number.isFinite(n) ? Math.max(3, Math.min(n, 30)) : 10;
}

/** 开发环境且为 true 时，首页每次请求跳过 TTL 缓存（仍走库轮换） */
export function homeHookForceRefreshInDev(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  return process.env.HOME_HOOK_FORCE_REFRESH_IN_DEV !== "false";
}

/** 库内 verified/skipped 条数少于此值时不假装「主题丰富」。library_only 下仍会读可用库或 fallback。 */
export const COLD_MIN_LIBRARY_ENTRIES_FOR_ROTATION = 2;

export const COLD_MIN_EVIDENCE_COUNT = 2;

export const COLD_RAG_SOURCE_TIMEOUT_MS = 6_000;
