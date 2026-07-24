import type { WorkLoreResult } from "@/lib/work-service";

interface CacheEntry {
  data: WorkLoreResult;
  expiresAt: number;
}

/** 进程内缓存（开发/单实例）；生产多实例需外置存储 */
const store = new Map<string, CacheEntry>();

export function workLoreCacheEnabled(): boolean {
  const v = process.env.WORK_LORE_CACHE_ENABLED?.trim();
  if (v == null || v === "") return true;
  return v === "true" || v === "1";
}

export function workLoreCacheTtlMs(): number {
  const v = process.env.WORK_LORE_CACHE_TTL_MS;
  if (!v) return 24 * 60 * 60 * 1000;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 24 * 60 * 60 * 1000;
  return Math.max(60_000, Math.min(n, 7 * 24 * 60 * 60 * 1000));
}

/** 缓存键：去空白、NFKC、小写、合并空格 */
export function normalizeWorkQueryKey(query: string): string {
  return query
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function buildWorkLoreCacheKey(
  query: string,
  mode: "adaptive" | "legacy"
): string {
  return `${mode}:${normalizeWorkQueryKey(query)}`;
}

function cloneWorkLoreResult(data: WorkLoreResult): WorkLoreResult {
  return JSON.parse(JSON.stringify(data)) as WorkLoreResult;
}

function pruneExpired(key: string, entry: CacheEntry): boolean {
  if (Date.now() <= entry.expiresAt) return false;
  store.delete(key);
  return true;
}

export function getCachedWorkLore(cacheKey: string): WorkLoreResult | null {
  const entry = store.get(cacheKey);
  if (!entry) return null;
  if (pruneExpired(cacheKey, entry)) return null;
  return cloneWorkLoreResult(entry.data);
}

export function setCachedWorkLore(cacheKey: string, data: WorkLoreResult): void {
  store.set(cacheKey, {
    data: cloneWorkLoreResult(data),
    expiresAt: Date.now() + workLoreCacheTtlMs()
  });
}

/** 命中缓存时在返回副本的 rag.trace 中标记 cache_hit（不修改 Map 内存储） */
export function annotateWorkLoreCacheHit(
  data: WorkLoreResult,
  cacheKey: string
): WorkLoreResult {
  const cloned = cloneWorkLoreResult(data);
  const step = {
    step: "work_cache.hit",
    at: new Date().toISOString(),
    payload: { cache_hit: true, cache_key: cacheKey }
  };

  if (cloned.rag) {
    cloned.rag = {
      ...cloned.rag,
      trace: {
        steps: [...cloned.rag.trace.steps, step]
      }
    };
    return cloned;
  }

  cloned.rag = {
    task_type: "work_lore",
    rounds_used: 0,
    queries_tried: [],
    evidence_pack: { items: [], summary_for_prompt: "" },
    status: "ok",
    insufficient_reason: null,
    trace: { steps: [step] }
  };
  return cloned;
}

/** 测试或运维：清空内存缓存 */
export function clearWorkLoreCache(): void {
  store.clear();
}
