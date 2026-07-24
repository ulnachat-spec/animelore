import type { LoreCard, LoreCardId, LorePayload, SeenContentByCard } from "@/lib/types";

export type { SeenContentByCard };

const CARD_IDS: LoreCardId[] = ["legacy", "meme", "behind", "lineage"];

export function emptySeenContentByCard(): SeenContentByCard {
  return { legacy: [], meme: [], behind: [], lineage: [] };
}

/** 合并请求体与默认值，保证四卡键齐全 */
export function normalizeSeenContentByCard(
  input?: Partial<SeenContentByCard> | null
): SeenContentByCard {
  const base = emptySeenContentByCard();
  if (!input) return base;
  for (const id of CARD_IDS) {
    const list = input[id];
    if (Array.isArray(list)) {
      base[id] = list.filter((s) => typeof s === "string" && s.trim().length > 0);
    }
  }
  return base;
}

/** 从四卡提取 headline / intro / points 写入各板块历史 */
export function seenStringsFromCards(cards: LoreCard[]): SeenContentByCard {
  const out = emptySeenContentByCard();
  for (const card of cards) {
    const parts = [card.headline, card.intro, ...card.points].filter((s) => s?.trim());
    out[card.id].push(...parts.map((s) => s.trim()));
  }
  return out;
}

/** 将新一批 cards 的文本追加进各板块历史（不跨板块） */
export function mergeSeenWithCards(
  seen: SeenContentByCard,
  cards: LoreCard[]
): SeenContentByCard {
  const out = normalizeSeenContentByCard(seen);
  for (const card of cards) {
    for (const s of [card.headline, card.intro, ...card.points]) {
      const t = s?.trim();
      if (t) out[card.id].push(t);
    }
  }
  return out;
}

export function normalizeDedupeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlapRatio(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter((w) => w.length > 1));
  const tb = b.split(" ").filter((w) => w.length > 1);
  if (ta.size === 0 || tb.length === 0) return 0;
  let hit = 0;
  for (const w of tb) {
    if (ta.has(w)) hit += 1;
  }
  return hit / Math.max(ta.size, tb.length);
}

/** 与对应板块已看过内容 exact / 包含 / 高重叠 则视为重复 */
export function isDuplicateOfSeen(candidate: string, seenForCard: string[]): boolean {
  const n = normalizeDedupeText(candidate);
  if (!n || n.length < 3) return false;

  for (const raw of seenForCard) {
    const s = normalizeDedupeText(raw);
    if (!s) continue;
    if (n === s) return true;

    const shorter = n.length <= s.length ? n : s;
    const longer = n.length > s.length ? n : s;
    if (shorter.length >= 10 && longer.includes(shorter)) return true;

    if (tokenOverlapRatio(n, s) >= 0.72) return true;
  }
  return false;
}

export type SanitizeLoreResult = {
  lore: LorePayload;
  duplicateCount: number;
  allCardsValid: boolean;
};

const MIN_POINTS = 2;

/**
 * 程序级去重：每张卡仅与 seenContentByCard[card.id] 比较；
 * 过滤重复 points；校验 headline/intro 不重复且至少 2 条 point。
 */
export function sanitizeLoreAgainstSeen(
  lore: LorePayload,
  seenContentByCard: SeenContentByCard
): SanitizeLoreResult {
  const seen = normalizeSeenContentByCard(seenContentByCard);
  let duplicateCount = 0;

  const cards = lore.cards.map((card) => {
    const seenList = seen[card.id] ?? [];

    if (isDuplicateOfSeen(card.headline, seenList)) duplicateCount += 1;
    if (isDuplicateOfSeen(card.intro, seenList)) duplicateCount += 1;

    const uniquePoints: string[] = [];
    for (const p of card.points) {
      const t = p?.trim();
      if (!t) continue;
      if (isDuplicateOfSeen(t, seenList)) {
        duplicateCount += 1;
        continue;
      }
      uniquePoints.push(t);
    }

    return { ...card, points: uniquePoints };
  });

  const allCardsValid = cards.every((card) => {
    const seenList = seen[card.id] ?? [];
    const headlineOk = !isDuplicateOfSeen(card.headline, seenList);
    const introOk = !isDuplicateOfSeen(card.intro, seenList);
    const pointsOk = card.points.length >= MIN_POINTS;
    return headlineOk && introOk && pointsOk;
  });

  return {
    lore: { ...lore, cards },
    duplicateCount,
    allCardsValid
  };
}
