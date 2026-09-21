import type { LoreCard, LoreCardId, LorePayload } from "@/lib/types";

const fallbackHeadline: Record<LoreCardId, string> = {
  legacy: "口碑与时间留下的另一面",
  meme: "传播之后长出的第二层意思",
  behind: "镜头之外的创作选择",
  lineage: "它在作品谱系里的位置"
};

function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function bigrams(text: string): Set<string> {
  const normalized = normalize(text);
  const result = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    result.add(normalized.slice(index, index + 2));
  }
  return result;
}

export function isNearDuplicateLoreText(left: string, right: string): boolean {
  const a = normalize(left);
  const b = normalize(right);
  if (Math.min(a.length, b.length) < 10) return a === b;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length) >= 0.62;
  }
  const aa = bigrams(a);
  const bb = bigrams(b);
  const intersection = [...aa].filter((token) => bb.has(token)).length;
  const union = new Set([...aa, ...bb]).size;
  return union > 0 && intersection / union >= 0.55;
}

export function dedupeLoreAcrossCards(lore: LorePayload): {
  value: LorePayload;
  removedCount: number;
} {
  const accepted: string[] = [];
  let removedCount = 0;

  const cards: LoreCard[] = lore.cards.map((card) => {
    const duplicate = (text: string) => accepted.some((prior) => isNearDuplicateLoreText(text, prior));
    let headline = card.headline.trim();
    if (duplicate(headline)) {
      headline = fallbackHeadline[card.id];
      removedCount += 1;
    }
    accepted.push(headline);

    let intro = card.intro.trim();
    if (intro && duplicate(intro)) {
      intro = "";
      removedCount += 1;
    } else if (intro) {
      accepted.push(intro);
    }

    const points = card.points.filter((point) => {
      const trimmed = point.trim();
      if (!trimmed || duplicate(trimmed)) {
        removedCount += 1;
        return false;
      }
      accepted.push(trimmed);
      return true;
    });

    return { ...card, headline, intro, points };
  });

  return { value: { ...lore, cards }, removedCount };
}
