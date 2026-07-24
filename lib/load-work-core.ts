import { getWorkLore } from "@/lib/work-service";
import type { Evidence, RagResult } from "@/lib/rag/types";
import type { LorePayload, WorkMeta } from "@/lib/types";
import type { WorkLorePipeline } from "@/lib/work-service";

export type LoadWorkCoreSuccess = {
  meta: WorkMeta;
  lore: LorePayload;
  evidenceForRegenerate: Evidence[] | null;
  pipeline?: WorkLorePipeline;
  rag?: RagResult;
};

export type LoadWorkCoreResult =
  | ({ ok: true } & LoadWorkCoreSuccess)
  | { ok: false; code: string; message: string };

/** 首屏：仅 meta + lore + RAG 证据（不含社区推荐、AniList 相关推荐） */
export async function loadWorkCore(query: string): Promise<LoadWorkCoreResult> {
  const outcome = await getWorkLore(query);
  if (!outcome.ok) {
    return { ok: false, code: outcome.failure.code, message: outcome.failure.message };
  }
  const result = outcome.data;
  const items = result.rag?.evidence_pack?.items;
  const evidenceForRegenerate = items && items.length > 0 ? items : null;

  return {
    ok: true,
    meta: result.meta,
    lore: result.lore,
    evidenceForRegenerate,
    pipeline: result.pipeline,
    rag: result.rag
  };
}
