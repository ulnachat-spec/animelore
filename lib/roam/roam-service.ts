import { planRoamBatch } from "@/lib/roam/roam-planner";
import { FALLBACK_ROAM_CARDS } from "@/lib/roam/roam-fallback";
import { readRoamCardsFromColdLibrary } from "@/lib/roam/roam-store";
import type { RoamBatchDebug, RoamCard, RoamRequestPrefs, RoamCardTag } from "@/lib/roam/roam-types";

const DEFAULT_COUNT = 8;
const MAX_COUNT = 12;

function clampCount(count?: number): number {
  if (!Number.isFinite(count)) return DEFAULT_COUNT;
  return Math.max(1, Math.min(MAX_COUNT, Math.floor(count ?? DEFAULT_COUNT)));
}

function hasEnoughTrust(card: RoamCard): boolean {
  if (card.verification_status === "fallback") return true;
  return card.source_urls.length > 0 && card.confidence >= 0.55;
}

export function normalizeRoamCount(count?: number): number {
  return clampCount(count);
}

export async function getRoamCards(input?: {
  count?: number;
  seed?: string;
  likedTags?: string[];
  skippedTags?: string[];
  recentTopicKeys?: string[];
}): Promise<{ cards: RoamCard[]; debug: RoamBatchDebug }> {
  const count = clampCount(input?.count);
  const libraryCards = (await readRoamCardsFromColdLibrary()).filter(hasEnoughTrust);
  const libraryKeys = new Set(libraryCards.map((c) => c.topic_key.toLowerCase()));
  const fallbackCards = FALLBACK_ROAM_CARDS.filter(
    (card) => !libraryKeys.has(card.topic_key.toLowerCase())
  );
  const pool = [...libraryCards, ...fallbackCards].filter(hasEnoughTrust);
  const prefs: RoamRequestPrefs = {
    seed: input?.seed?.trim() || undefined,
    likedTags: (input?.likedTags ?? []).filter(Boolean) as RoamCardTag[],
    skippedTags: (input?.skippedTags ?? []).filter(Boolean) as RoamCardTag[],
    recentTopicKeys: input?.recentTopicKeys ?? []
  };

  const planned = planRoamBatch(pool, prefs, count);
  const cards = planned.cards.slice(0, count);
  return {
    cards,
    debug: {
      requested_count: count,
      returned_count: cards.length,
      library_candidates: libraryCards.length,
      fallback_used: cards.some((card) => card.verification_status === "fallback"),
      blocked_recent_count: planned.blocked_recent_count
    }
  };
}
