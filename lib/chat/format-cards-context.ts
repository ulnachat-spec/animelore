import type { LoreCard } from "@/lib/types";

function dataText(value: string): string {
  return value
    .replaceAll("<", "＜")
    .replaceAll(">", "＞")
    .replace(/\b(system|assistant|developer)\s*:/gi, "$1：")
    .trim();
}

function safeUrls(urls: string[]): string[] {
  return urls.filter((url) => /^https?:\/\//i.test(url)).slice(0, 8);
}

/** 将四张卡序列化为明确的不可信资料区，供聊天模型引用。 */
export function formatCardsForChatContext(cards: LoreCard[]): string {
  return cards
    .map((card, index) => {
      const points = card.points.length
        ? card.points.map((point, pointIndex) => `  ${pointIndex + 1}. ${dataText(point)}`).join("\n")
        : "  （无要点）";
      const urls = safeUrls(card.source_urls ?? []);
      return [
        `[卡${index + 1}]`,
        `类型：${dataText(card.zh_name)} / ${dataText(card.en_label)}`,
        `标题：${dataText(card.headline)}`,
        `导语：${dataText(card.intro)}`,
        `要点：\n${points}`,
        `来源说明：${dataText(card.source || "未标注")}`,
        `可核查链接：${urls.length ? urls.join(" | ") : "无外部链接"}`
      ].join("\n");
    })
    .join("\n\n");
}
