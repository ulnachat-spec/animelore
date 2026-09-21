import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chineseAnimeTitle,
  findAnimeTitleEntry,
  findSimilarAnimeTitleEntries,
  normalizeAnimeTitle
} from "../lib/anime-title-registry";
import { fetchAniListMeta, pickBestMediaWithScore } from "../lib/data-sources/sources";

afterEach(() => vi.unstubAllGlobals());

describe("anime title registry", () => {
  it("中文别名精确锁定 AniList 条目", () => {
    expect(findAnimeTitleEntry("银之匙")?.anilistId).toBe(16918);
    expect(findAnimeTitleEntry("银之匙 Silver Spoon")?.anilistId).toBe(16918);
    expect(findAnimeTitleEntry("绯弹的亚里亚")?.anilistId).toBe(8630);
    expect(findAnimeTitleEntry("红辣椒")?.anilistId).toBe(1943);
    expect(findAnimeTitleEntry("春宵苦短少女前进吧")?.anilistId).toBe(97917);
    expect(chineseAnimeTitle(457, "MUSHI-SHI")).toBe("虫师");
  });

  it("输入少量错别字时，只给出高度接近的本地候选", () => {
    expect(findSimilarAnimeTitleEntries("春宵苦短少女前进")[0]?.anilistId).toBe(97917);
    expect(findSimilarAnimeTitleEntries("完全不相关的作品")).toEqual([]);
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

  it("未收录的中文名会经 Bangumi 原名桥接后命中 AniList，并保留中文展示名", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("api.bgm.tv/v0/search/subjects")) {
          return new Response(JSON.stringify({ data: [{ id: 7, type: 2, name: "Bridge Title", name_cn: "未收录中文名" }] }), { status: 200 });
        }
        if (url.includes("api.bgm.tv/v0/subjects/7")) {
          return new Response(JSON.stringify({ id: 7, type: 2, name: "Bridge Title", name_cn: "未收录中文名" }), { status: 200 });
        }
        if (url.includes("graphql.anilist.co")) {
          const variables = JSON.parse(String(init?.body)).variables as { search?: string };
          const media = variables.search === "Bridge Title"
            ? [{ id: 123, title: { english: "Bridge Title", native: "ブリッジ" }, seasonYear: 2020, coverImage: { extraLarge: "cover" }, studios: { nodes: [] } }]
            : [];
          return new Response(JSON.stringify({ data: { Page: { media } } }), { status: 200 });
        }
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      })
    );

    await expect(fetchAniListMeta("未收录中文名")).resolves.toMatchObject({
      anilistId: 123,
      title: "未收录中文名",
      nativeTitle: "ブリッジ"
    });
  });
});
