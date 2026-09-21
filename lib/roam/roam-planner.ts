import type { RoamCard, RoamRequestPrefs } from "@/lib/roam/roam-types";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function cardScore(card: RoamCard, prefs: RoamRequestPrefs, index: number, batchSalt: string): number {
  let score = 50 + card.confidence * 25;
  if (prefs.likedTags.includes(card.tag)) score += 18;
  if (prefs.skippedTags.includes(card.tag)) score -= 8;
  if (prefs.seed) {
    const seed = prefs.seed.toLowerCase();
    if (
      card.next_seeds.some((s) => s.toLowerCase().includes(seed) || seed.includes(s.toLowerCase())) ||
      card.topic_key.toLowerCase().includes(seed)
    ) {
      score += 20;
    }
  }
  score += hashString(`${card.topic_key}:${index}:${prefs.seed ?? ""}:${batchSalt}`) % 17;
  return score;
}

export function planRoamBatch(
  cards: RoamCard[],
  prefs: RoamRequestPrefs,
  count: number,
  batchSalt = `${Date.now()}:${Math.random()}`
): { cards: RoamCard[]; blocked_recent_count: number } {
  const recent = new Set(prefs.recentTopicKeys.slice(-10).map((k) => k.toLowerCase()));
  const blocked: RoamCard[] = [];
  const available: RoamCard[] = [];

  for (const card of cards) {
    if (recent.has(card.topic_key.toLowerCase())) blocked.push(card);
    else available.push(card);
  }

  const scored = available.map((card, index) => ({
    card,
    score: cardScore(card, prefs, index, batchSalt)
  }));
  scored.sort((a, b) => b.score - a.score);

  const selected = scored.map((s) => s.card).slice(0, count);
  if (selected.length >= count) {
    return { cards: selected, blocked_recent_count: blocked.length };
  }

  const backfill = blocked
    .filter((card) => !selected.some((c) => c.topic_key === card.topic_key))
    .slice(0, count - selected.length);
  return {
    cards: [...selected, ...backfill],
    blocked_recent_count: blocked.length
  };
}
