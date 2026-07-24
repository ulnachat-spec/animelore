import { RelatedWorksList } from "@/components/work/related-works-list";
import {
  getWorkMetaQuickCached,
  loadRelatedRecsForPage
} from "@/lib/work-page-loaders";

export async function RelatedWorksSection({ query }: { query: string }) {
  try {
    const meta = await getWorkMetaQuickCached(query);
    const recs = await loadRelatedRecsForPage(query, meta);
    return <RelatedWorksList recs={recs} />;
  } catch {
    return null;
  }
}
