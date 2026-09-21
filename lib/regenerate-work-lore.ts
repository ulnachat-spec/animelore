/**
 * 「换一批」专用：仅根据已有 RAG 证据包调用 LLM；带按板块去重与最多 3 次重试。
 */
import { buildStableCommunityHint } from "@/lib/community-hint";
import { generateLore } from "@/lib/llm";
import { buildLorePromptFromAdaptive } from "@/lib/prompt";
import { dedupeLoreAcrossCards } from "@/lib/lore-cross-card-dedupe";
import {
  normalizeSeenContentByCard,
  sanitizeLoreAgainstSeen,
  type SeenContentByCard
} from "@/lib/regenerate-dedupe";
import type { Evidence } from "@/lib/rag/types";
import type { LorePayload, WorkMeta } from "@/lib/types";

const MAX_REGEN_ATTEMPTS = 3;

export type RegenerateLoreResult = {
  lore: LorePayload;
  exhausted: boolean;
};

export async function regenerateLoreCardsFromEvidence(
  meta: WorkMeta,
  evidenceItems: Evidence[],
  seenContentByCard: SeenContentByCard = normalizeSeenContentByCard()
): Promise<RegenerateLoreResult> {
  const seen = normalizeSeenContentByCard(seenContentByCard);
  const communityHint = buildStableCommunityHint({ meta, evidence: evidenceItems });

  let best: { lore: LorePayload; duplicateCount: number } | null = null;

  for (let attempt = 0; attempt < MAX_REGEN_ATTEMPTS; attempt += 1) {
    const prompt = buildLorePromptFromAdaptive(meta, evidenceItems, communityHint, {
      seenContentByCard: seen,
      regenAttempt: attempt + 1
    });
    const raw = await generateLore(prompt);
    const result = sanitizeLoreAgainstSeen(raw, seen);
    const crossCard = dedupeLoreAcrossCards(result.lore);

    if (!best || result.duplicateCount < best.duplicateCount) {
      best = {
        lore: crossCard.value,
        duplicateCount: result.duplicateCount + crossCard.removedCount
      };
    }

    if (result.allCardsValid && crossCard.removedCount === 0) {
      return { lore: crossCard.value, exhausted: false };
    }
  }

  if (!best) {
    const raw = await generateLore(
      buildLorePromptFromAdaptive(meta, evidenceItems, communityHint)
    );
    return { lore: dedupeLoreAcrossCards(raw).value, exhausted: true };
  }

  return { lore: best.lore, exhausted: true };
}
