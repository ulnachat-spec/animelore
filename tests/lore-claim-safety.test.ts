import { describe, expect, it } from "vitest";
import {
  sanitizeLoreAgainstEvidence,
  sanitizeLoreCardAgainstEvidence
} from "@/lib/lore-claim-safety";
import type { Evidence } from "@/lib/rag/types";
import type { LoreCard, LorePayload } from "@/lib/types";

function makeEvidence(snippet: string): Evidence[] {
  return [
    {
      id: "source-1",
      source: "wikipedia",
      title: "作品资料",
      url: "https://example.com/work",
      snippet,
      retrieval_query: "测试作品",
      round: 0,
      retrieved_at: "2026-07-29T00:00:00.000Z"
    }
  ];
}

function makeCard(overrides: Partial<LoreCard> = {}): LoreCard {
  return {
    id: "behind",
    en_label: "BEHIND",
    zh_name: "幕后现场",
    headline: "制作背景",
    intro: "作品采用了克制的叙事节奏。",
    points: ["主题围绕时间与选择展开。"],
    source: "Wikipedia",
    source_urls: ["https://example.com/work"],
    ...overrides
  };
}

describe("lore claim safety", () => {
  it("removes an interview attribution when the evidence has no interview support", () => {
    const result = sanitizeLoreCardAgainstEvidence(
      makeCard({ points: ["监督在采访中表示，结局从一开始就已确定。"] }),
      makeEvidence("页面仅列出作品简介、播出日期与主要制作人员。")
    );

    expect(result.value.points).toEqual([]);
    expect(result.removedClaims).toBe(1);
  });

  it("keeps an attribution when the evidence explicitly contains it", () => {
    const claim = "监督在采访中表示，结局从一开始就已确定。";
    const result = sanitizeLoreCardAgainstEvidence(
      makeCard({ points: [claim] }),
      makeEvidence(`该采访中，监督表示结局从一开始就已确定。`)
    );

    expect(result.value.points).toEqual([claim]);
    expect(result.removedClaims).toBe(0);
  });

  it("requires exact evidence for precise ratings and keeps ordinary analysis", () => {
    const unsupported = sanitizeLoreCardAgainstEvidence(
      makeCard({ points: ["Bangumi 评分为 8.5。", "主题围绕时间与选择展开。"] }),
      makeEvidence("该条目收录了作品的制作信息。")
    );
    expect(unsupported.value.points).toEqual(["主题围绕时间与选择展开。"]);

    const supported = sanitizeLoreCardAgainstEvidence(
      makeCard({ points: ["Bangumi 评分为 8.5。"] }),
      makeEvidence("该作品当前评分为 8.5，评分可能随时间变化。")
    );
    expect(supported.value.points).toEqual(["Bangumi 评分为 8.5。"]);
  });

  it("sanitizes every card in a lore payload", () => {
    const lore: LorePayload = {
      work_title: "测试作品",
      cards: [
        makeCard({ headline: "制作组表示这是一部自传作品" }),
        makeCard({ id: "legacy", points: ["这是一条普通主题分析。"] })
      ],
      bottom_hook: { work: "测试作品", hook: "继续探索" }
    };
    const result = sanitizeLoreAgainstEvidence(
      lore,
      makeEvidence("页面仅提供作品简介。")
    );

    expect(result.value.cards[0].headline).toBe("这项档案仍待更多来源核实");
    expect(result.value.cards[1].points).toEqual(["这是一条普通主题分析。"]);
  });
});
