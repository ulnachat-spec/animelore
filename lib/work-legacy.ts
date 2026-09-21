import {
  buildCommunitySearchHint,
  fetchAniListMeta,
  fetchMoegirlContext,
  fetchWikipediaSummary
} from "@/lib/data-sources";
import { buildLorePrompt } from "@/lib/prompt";
import { generateLore } from "@/lib/llm";
import { fallbackLore } from "@/lib/fallback";
import { dedupeLoreAcrossCards } from "@/lib/lore-cross-card-dedupe";
import type { LorePayload, WorkMeta } from "@/lib/types";

/** /api/work 升级前的固定检索 + Prompt + LLM；作 adaptive 失败时的回退。 */
export async function runLegacyWorkPipeline(query: string): Promise<{
  meta: WorkMeta;
  lore: LorePayload;
}> {
  const wikiTitle = query.trim() || query;
  const [metaResolved, wikiSummary] = await Promise.all([
    fetchAniListMeta(query),
    fetchWikipediaSummary(wikiTitle)
  ]);
  const meta = metaResolved ?? ({ title: query } as WorkMeta);
  const moegirlContext = await fetchMoegirlContext(
    meta.nativeTitle || meta.title || query
  );
  const communityHint = buildCommunitySearchHint(meta.title);
  const prompt = buildLorePrompt(meta, wikiSummary, communityHint, moegirlContext);

  try {
    const lore = await generateLore(prompt);
    return { meta, lore: dedupeLoreAcrossCards(lore).value };
  } catch {
    return { meta, lore: fallbackLore(meta) };
  }
}
