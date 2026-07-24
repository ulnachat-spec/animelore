import { withTimeout } from "@/lib/community-fetch-timeout";
import { fetchAniListRelatedRecommendations } from "@/lib/data-sources";
import { workRelatedServerTimeoutMs } from "@/lib/work-page-timeouts";
import { filterWorkRelatedRecsForCurrentPage } from "@/lib/work-rec-utils";
import type { WorkMeta, WorkRelatedRec } from "@/lib/types";

export async function loadWorkRelatedRecs(input: {
  query: string;
  meta: WorkMeta;
}): Promise<WorkRelatedRec[]> {
  const searchForRelated =
    input.meta.title?.trim() || input.meta.nativeTitle?.trim() || input.query.trim();

  const load = async (): Promise<WorkRelatedRec[]> => {
    for (const key of [searchForRelated, input.query.trim()].filter(
      (k, i, a) => k && a.indexOf(k) === i
    )) {
      const raw = await fetchAniListRelatedRecommendations(key, {
        mediaId: input.meta.anilistId
      });
      const filtered = filterWorkRelatedRecsForCurrentPage(raw, input.meta, input.query.trim());
      if (filtered.length > 0) return filtered;
    }
    return [];
  };

  const result = await withTimeout(load(), workRelatedServerTimeoutMs());
  return result ?? [];
}
