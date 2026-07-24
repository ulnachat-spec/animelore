import type { WorkMeta, WorkRelatedRec } from "@/lib/types";

/** 用于比较「是否为同一部作品」，避免底部链到当前页或 AniList 误推 */
export function normalizeWorkTitleKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[《》''""＂]/g, "");
}

export function isWorkTitleSameAsPage(
  workTitle: string,
  meta: Pick<WorkMeta, "title" | "nativeTitle">,
  urlQuery: string
): boolean {
  const w = normalizeWorkTitleKey(workTitle);
  if (!w) return false;
  for (const t of [meta.title, meta.nativeTitle, urlQuery]) {
    if (t?.trim() && normalizeWorkTitleKey(t) === w) return true;
  }
  return false;
}

export function filterWorkRelatedRecsForCurrentPage(
  recs: WorkRelatedRec[],
  meta: WorkMeta,
  urlQuery: string
): WorkRelatedRec[] {
  return recs.filter((r) => {
    if (meta.anilistId != null && r.anilistId === meta.anilistId) return false;
    if (isWorkTitleSameAsPage(r.displayTitle, meta, urlQuery)) return false;
    if (isWorkTitleSameAsPage(r.searchQuery, meta, urlQuery)) return false;
    return true;
  });
}
