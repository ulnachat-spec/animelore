import type { LoreCardId } from "@/lib/types";

export const LORE_CARD_ORDER: LoreCardId[] = ["legacy", "meme", "behind", "lineage"];

export const LORE_CARD_META: Record<
  LoreCardId,
  { en_label: string; zh_name: string }
> = {
  legacy: { en_label: "LEGACY", zh_name: "封神还是翻车" },
  meme: { en_label: "MEME", zh_name: "梗从哪来" },
  behind: { en_label: "BEHIND", zh_name: "幕后现场" },
  lineage: { en_label: "LINEAGE", zh_name: "家族树" }
};
