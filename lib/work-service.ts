/**
 * 作品图鉴服务编排。
 *
 * - `getWorkLore`：首屏入口；仅 meta + lore + rag（社区推荐、AniList 相关推荐由独立 API 异步加载）。
 * - 成功结果按 normalized query 内存缓存（见 lib/work-cache.ts）。
 * - `ADAPTIVE_RAG_WORK=false` 时全程 legacy；`/api/work/debug` 在 adaptive 关闭时会 400，与主链路对齐。
 */
import { runAdaptiveWorkLore } from "@/lib/rag/adaptive";
import type { RagResult } from "@/lib/rag/types";
import { ragLog } from "@/lib/rag/logger";
import { runLegacyWorkPipeline } from "@/lib/work-legacy";
import {
  annotateWorkLoreCacheHit,
  buildWorkLoreCacheKey,
  getCachedWorkLore,
  setCachedWorkLore,
  workLoreCacheEnabled,
  workLoreCacheTtlMs
} from "@/lib/work-cache";
import type { LorePayload, WorkMeta } from "@/lib/types";

export function adaptiveWorkEnabled(): boolean {
  return process.env.ADAPTIVE_RAG_WORK !== "false";
}

export type WorkLorePipeline =
  | "legacy"
  | "adaptive"
  | "adaptive_insufficient"
  | "legacy_fallback";

export interface WorkLoreResult {
  meta: WorkMeta;
  lore: LorePayload;
  pipeline: WorkLorePipeline;
  rag?: RagResult;
  fallback_reason?: string;
}

export type WorkLoreErrorCode = "missing_api_key" | "pipeline_error" | "unknown";

export interface WorkLoreFailure {
  code: WorkLoreErrorCode;
  message: string;
}

export type WorkLoreOutcome =
  | { ok: true; data: WorkLoreResult }
  | { ok: false; failure: WorkLoreFailure };

function classifyWorkLoreError(error: unknown): WorkLoreFailure {
  const msg = error instanceof Error ? error.message : String(error);
  if (/DEEPSEEK_API_KEY is missing/i.test(msg)) {
    return { code: "missing_api_key", message: msg };
  }
  if (msg && msg !== "undefined") {
    return { code: "pipeline_error", message: msg };
  }
  return { code: "unknown", message: "Unknown error while building work lore" };
}

async function buildWorkLoreUncached(query: string): Promise<WorkLoreOutcome> {
  if (!adaptiveWorkEnabled()) {
    const { meta, lore } = await runLegacyWorkPipeline(query);
    return { ok: true, data: { meta, lore, pipeline: "legacy" } };
  }

  try {
    const outcome = await runAdaptiveWorkLore(query);

    if (outcome.kind === "success") {
      return {
        ok: true,
        data: {
          meta: outcome.meta,
          lore: outcome.lore,
          rag: outcome.rag,
          pipeline: "adaptive"
        }
      };
    }

    ragLog("work_service.insufficient_fallback", {
      reason: outcome.rag.insufficient_reason
    });

    try {
      const { meta, lore } = await runLegacyWorkPipeline(query);
      return {
        ok: true,
        data: {
          meta,
          lore,
          rag: outcome.rag,
          pipeline: "legacy_fallback",
          fallback_reason:
            outcome.rag.insufficient_reason || "adaptive_insufficient_evidence"
        }
      };
    } catch (legacyErr) {
      ragLog("work_service.legacy_after_insufficient_failed", {
        message: (legacyErr as Error).message
      });
      return {
        ok: true,
        data: {
          meta: outcome.meta,
          lore: outcome.lore,
          rag: outcome.rag,
          pipeline: "adaptive_insufficient"
        }
      };
    }
  } catch (err) {
    ragLog("work_service.adaptive_error", {
      message: (err as Error).message,
      stack: (err as Error).stack?.slice(0, 500)
    });
    console.error("[getWorkLore] adaptive failed, legacy fallback", err);

    const { meta, lore } = await runLegacyWorkPipeline(query);
    return {
      ok: true,
      data: {
        meta,
        lore,
        pipeline: "legacy_fallback",
        fallback_reason: (err as Error).message
      }
    };
  }
}

export async function getWorkLore(query: string): Promise<WorkLoreOutcome> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, failure: { code: "pipeline_error", message: "empty query" } };
  }

  const cacheMode = adaptiveWorkEnabled() ? "adaptive" : "legacy";
  const cacheKey = buildWorkLoreCacheKey(trimmed, cacheMode);

  if (workLoreCacheEnabled()) {
    const cached = getCachedWorkLore(cacheKey);
    if (cached) {
      ragLog("work_cache.hit", {
        cache_hit: true,
        cache_key: cacheKey,
        query: trimmed,
        pipeline: cached.pipeline
      });
      return { ok: true, data: annotateWorkLoreCacheHit(cached, cacheKey) };
    }
    ragLog("work_cache.miss", { cache_hit: false, cache_key: cacheKey, query: trimmed });
  }

  try {
    const outcome = await buildWorkLoreUncached(trimmed);

    if (outcome.ok && workLoreCacheEnabled()) {
      setCachedWorkLore(cacheKey, outcome.data);
      ragLog("work_cache.set", {
        cache_key: cacheKey,
        query: trimmed,
        pipeline: outcome.data.pipeline,
        ttl_ms: workLoreCacheTtlMs()
      });
    }

    return outcome;
  } catch (error) {
    console.error("[getWorkLore]", error);
    return { ok: false, failure: classifyWorkLoreError(error) };
  }
}
