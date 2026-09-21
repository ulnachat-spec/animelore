import { describe, expect, it } from "vitest";
import { filterCommunityArticleCandidate } from "@/lib/community-candidate-quality";
import { bangumiCommunityFallbackCandidate } from "@/lib/community-recommendations";

describe("community recommendation fallbacks", () => {
  it("实时社区源不可用时生成可展示的 Bangumi 中文社区入口", () => {
    const candidate = bangumiCommunityFallbackCandidate({
      id: 106110,
      name: "君の名は。",
      name_cn: "你的名字。",
      summary: "围绕一段跨越时间的相遇展开。",
      tags: [{ name: "新海诚" }],
      date: "2016-08-26",
      url: "https://bgm.tv/subject/172498",
      structured: {}
    });

    expect(candidate.source).toBe("bangumi");
    expect(candidate.url).toBe("https://bgm.tv/subject/172498");
    expect(filterCommunityArticleCandidate(candidate).ok).toBe(true);
  });

  it("过滤 B 站壁纸等非考据类搜索结果", () => {
    const result = filterCommunityArticleCandidate({
      id: "bili-wallpaper",
      source: "bilibili",
      title: "你的名字超清壁纸",
      url: "https://www.bilibili.com/opus/123456",
      snippet: "图片分享"
    });

    expect(result).toEqual({ ok: false, reason: "resource_keyword" });
  });
});
