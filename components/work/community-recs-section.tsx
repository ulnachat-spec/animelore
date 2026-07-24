import { CommunityArticleRecs } from "@/components/CommunityArticleRecs";
import {
  getWorkMetaQuickCached,
  loadCommunityRecsForPage
} from "@/lib/work-page-loaders";

export async function CommunityRecsSection({ query }: { query: string }) {
  try {
    const meta = await getWorkMetaQuickCached(query);
    const recs = await loadCommunityRecsForPage(query, meta);
    if (recs.length === 0) return null;

    return (
      <section className="mt-10 rounded-2xl border border-line bg-surface/85 p-5">
        <CommunityArticleRecs recs={recs} showDivider={false} />
      </section>
    );
  } catch {
    return null;
  }
}
