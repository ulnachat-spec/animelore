import { fetchAniListMediaBrief, fetchAniListMeta } from "@/lib/data-sources";
import type {
  ColdQuiz,
  ColdHookPayload,
  ColdRecommendationEnriched,
  ColdRecommendationRaw,
  ColdSubtype,
  ColdTopicType
} from "@/lib/types";

function isJapaneseAnime(countryOfOrigin: string | undefined, allowNonJapanese?: boolean): boolean {
  if (allowNonJapanese) return true;
  return countryOfOrigin === "JP";
}

export async function coldPayloadFromRaw(raw: {
  topic_type: ColdTopicType;
  cold_subtype?: ColdSubtype;
  topic_key?: string;
  hook: string;
  blurb?: string;
  angle?: string;
  example_bridge?: string;
  style_pattern?: string;
  insight: string;
  quiz?: ColdQuiz | null;
  source_urls?: string[];
  confidence?: number;
  verification_status?: ColdHookPayload["verification_status"];
  recommendations: ColdRecommendationRaw[];
}): Promise<ColdHookPayload> {
  return {
    topic_type: raw.topic_type,
    cold_subtype: raw.cold_subtype,
    topic_key: raw.topic_key,
    hook: raw.hook,
    blurb: raw.blurb,
    angle: raw.angle,
    example_bridge: raw.example_bridge,
    style_pattern: raw.style_pattern,
    insight: raw.insight,
    quiz: raw.quiz ?? null,
    source_urls: raw.source_urls,
    confidence: raw.confidence,
    verification_status: raw.verification_status,
    recommendations: await enrichColdRecommendations(raw.recommendations)
  };
}

/**
 * 仅通过 anilistId 丰富推荐；默认只保留日本 TV 动画（countryOfOrigin === JP）。
 */
export async function enrichColdRecommendations(
  items: ColdRecommendationRaw[]
): Promise<ColdRecommendationEnriched[]> {
  const out: ColdRecommendationEnriched[] = [];

  for (const item of items.slice(0, 2)) {
    let anilistId = item.anilistId;
    if ((!anilistId || anilistId <= 0) && item.anime_title) {
      const meta = await fetchAniListMeta(item.anime_title);
      anilistId = meta?.anilistId;
    }
    if (!anilistId || anilistId <= 0) continue;

    const brief = await fetchAniListMediaBrief(anilistId);
    if (!brief) continue;
    if (!isJapaneseAnime(brief.countryOfOrigin, item.allowNonJapanese)) continue;

    const displayTitle = brief.title;
    const searchQuery = brief.title;

    out.push({
      candidate_id: item.candidate_id,
      anilistId: brief.anilistId,
      anime_title: displayTitle,
      reason: item.reason,
      searchQuery,
      displayTitle,
      coverImage: brief.coverImage,
      nativeTitle: brief.nativeTitle
    });
  }

  return out;
}
