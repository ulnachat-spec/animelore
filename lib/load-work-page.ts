import { loadWorkCore, type LoadWorkCoreResult, type LoadWorkCoreSuccess } from "@/lib/load-work-core";
import { loadWorkRelatedRecs } from "@/lib/load-work-related";
import { buildCommunityRecsForWork } from "@/lib/community-recs-service";
import { communityRecsEnabled, communityRecsFetchDeadlineMs } from "@/lib/community-recs-config";
import type { CommunityArticleRec, WorkRelatedRec } from "@/lib/types";

export type { LoadWorkCoreSuccess as LoadWorkSuccess };
export type LoadWorkResult = LoadWorkCoreResult;

/** @deprecated 调试/脚本用全量加载；作品页首屏请用 loadWorkCore + 独立 API */
export async function loadWork(query: string): Promise<
  | ({ ok: true } & LoadWorkCoreSuccess & {
      relatedRecs: WorkRelatedRec[];
      communityRecs: CommunityArticleRec[];
    })
  | { ok: false; code: string; message: string }
> {
  const core = await loadWorkCore(query);
  if (!core.ok) return core;

  const bg = core.rag?.evidence_pack?.items?.find((e) => e.source === "bangumi");
  const bangumiNameCn =
    bg && typeof bg.structured?.name_cn === "string" ? bg.structured.name_cn : undefined;

  const [relatedRecs, communityBuilt] = await Promise.all([
    loadWorkRelatedRecs({ query, meta: core.meta }),
    communityRecsEnabled()
      ? buildCommunityRecsForWork({
          query,
          meta: core.meta,
          bangumiNameCn,
          deadlineMs: Date.now() + communityRecsFetchDeadlineMs()
        })
      : Promise.resolve({ recs: [] as CommunityArticleRec[] })
  ]);

  const { ok: _ok, ...coreData } = core;
  return {
    ok: true as const,
    ...coreData,
    relatedRecs,
    communityRecs: communityBuilt.recs
  };
}
