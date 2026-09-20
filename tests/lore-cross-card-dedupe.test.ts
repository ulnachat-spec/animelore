import { describe, expect, it } from "vitest";
import { dedupeLoreAcrossCards, isNearDuplicateLoreText } from "@/lib/lore-cross-card-dedupe";
import type { LorePayload } from "@/lib/types";

describe("cross-card lore dedupe", () => {
  it("recognizes near-identical claims and keeps them in one card only", () => {
    expect(
      isNearDuplicateLoreText(
        "死亡回归的绝望感成为作品长期传播的核心话题",
        "作品长期传播的核心话题，是死亡回归带来的绝望感"
      )
    ).toBe(true);

    const lore: LorePayload = {
      work_title: "测试作品",
      bottom_hook: { work: "测试作品", hook: "继续" },
      cards: [
        { id: "legacy", en_label: "LEGACY", zh_name: "口碑", headline: "第一面", intro: "不同内容", points: ["死亡回归的绝望感成为作品长期传播的核心话题"], source: "", source_urls: [] },
        { id: "meme", en_label: "MEME", zh_name: "梗", headline: "第二面", intro: "另一段内容", points: ["作品长期传播的核心话题，是死亡回归带来的绝望感"], source: "", source_urls: [] }
      ]
    };
    const result = dedupeLoreAcrossCards(lore);
    expect(result.removedCount).toBe(1);
    expect(result.value.cards[1].points).toEqual([]);
  });
});
