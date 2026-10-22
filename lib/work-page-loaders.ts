import { cache } from "react";
import { withTimeout } from "@/lib/community-fetch-timeout";
import { buildCommunityRecsForWork } from "@/lib/community-recs-service";
import {
  communityRecsEnabled,
  communityRecsFetchDeadlineMs
} from "@/lib/community-recs-config";
import { fetchAniListMeta, fetchBangumiWorkMeta } from "@/lib/data-sources";
import { loadWorkCore } from "@/lib/load-work-core";
import { loadWorkRelatedRecs } from "@/lib/load-work-related";
import { workRelatedServerTimeoutMs } from "@/lib/work-page-timeouts";
import type { CommunityArticleRec, WorkMeta, WorkRelatedRec } from "@/lib/types";

/** 同请求内 dedupe getWorkLore / loadWorkCore */
export const getWorkCoreCached = cache(loadWorkCore);

/** 较快 AniList meta（AniList 不可用时退到 Bangumi），供 Hero / 延伸阅读独立 Suspense 使用 */
export const getWorkMetaQuickCached = cache(async (query: string): Promise<WorkMeta> => {
  const trimmed = query.trim();
  return (
    (await fetchAniListMeta(trimmed)) ??
    (await fetchBangumiWorkMeta(trimmed).catch(() => null)) ?? { title: trimmed }
  );
});

export async function loadCommunityRecsForPage(
  query: string,
  meta: WorkMeta,
  bangumiNameCn?: string
): Promise<CommunityArticleRec[]> {
  if (!communityRecsEnabled()) return [];

  const built = await withTimeout(
    buildCommunityRecsForWork({
      query,
      meta,
      bangumiNameCn,
      collectDebug: false,
      generateRecommendations: true,
      deadlineMs: Date.now() + communityRecsFetchDeadlineMs()
    }),
    communityRecsFetchDeadlineMs() + 2000
  );

  return built?.recs?.length ? built.recs : [];
}

export async function loadRelatedRecsForPage(
  query: string,
  meta: WorkMeta
): Promise<WorkRelatedRec[]> {
  const load = () => loadWorkRelatedRecs({ query, meta });
  const recs = await withTimeout(load(), workRelatedServerTimeoutMs());
  return recs ?? [];
}
