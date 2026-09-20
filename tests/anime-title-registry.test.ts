import { describe, expect, it } from "vitest";
import {
  chineseAnimeTitle,
  findAnimeTitleEntry,
  normalizeAnimeTitle
} from "../lib/anime-title-registry";
import { pickBestMediaWithScore } from "../lib/data-sources/sources";

describe("anime title registry", () => {
  it("中文别名精确锁定 AniList 条目", () => {
    expect(findAnimeTitleEntry("银之匙")?.anilistId).toBe(16918);
    expect(findAnimeTitleEntry("银之匙 Silver Spoon")?.anilistId).toBe(16918);
    expect(findAnimeTitleEntry("绯弹的亚里亚")?.anilistId).toBe(8630);
    expect(chineseAnimeTitle(457, "MUSHI-SHI")).toBe("虫师");
  });

  it("标题归一化不会受常见标点和全半角影响", () => {
    expect(normalizeAnimeTitle("《你的名字。》")).toBe(normalizeAnimeTitle("你的名字"));
    expect(normalizeAnimeTitle("KONOSUBA - God's blessing")).toBe("konosubagod'sblessing".replace("'", ""));
  });

  it("弱搜索结果不会因为有海报和年份而冒充标题匹配", () => {
  const picked = pickBestMediaWithScore(
    [
      { id: 21010, title: { english: "The Silver Guardian", native: "銀の墓守り" }, coverImage: { extraLarge: "x" }, seasonYear: 2017 },
      { id: 16918, title: { english: "Silver Spoon", romaji: "Gin no Saji", native: "銀の匙" }, coverImage: { extraLarge: "y" }, seasonYear: 2013 }
    ],
    "Silver Spoon",
    "Silver Spoon"
  );
    expect(picked.item.id).toBe(16918);
    expect(picked.score).toBeGreaterThanOrEqual(8);

  const weak = pickBestMediaWithScore(
    [{ id: 21010, title: { english: "The Silver Guardian" }, coverImage: { extraLarge: "x" }, seasonYear: 2017 }],
    "银之匙",
    "银之匙"
  );
    expect(weak.score).toBeLessThan(7);
  });
});
