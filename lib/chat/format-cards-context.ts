import type { LoreCard } from "@/lib/types";

/** 将四卡内容序列化进 system prompt */
export function formatCardsForChatContext(cards: LoreCard[]): string {
  return cards
    .map((card, i) => {
      const points =
        card.points.length > 0
          ? card.points.map((p, j) => `    ${j + 1}. ${p}`).join("\n")
          : "    （无要点）";
      return [
        `【卡片 ${i + 1}】${card.zh_name}（${card.en_label} / id=${card.id}）`,
        `标题：${card.headline}`,
        `导语：${card.intro}`,
        `要点：\n${points}`,
        `来源说明：${card.source || "未标注"}`
      ].join("\n");
    })
    .join("\n\n");
}
