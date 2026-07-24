import { describe, expect, it } from "vitest";
import { getCuratedCommunityArticles } from "@/lib/community-curated";

describe("curated community articles", () => {
  it("never exposes placeholder fixtures as production recommendations", () => {
    const articles = getCuratedCommunityArticles({
      workTitle: "葬送的芙莉莲",
      nativeTitle: "葬送のフリーレン",
      aliases: ["Frieren"]
    });

    for (const article of articles) {
      expect(article.url).not.toContain("example.com");
      expect(article.title).not.toMatch(/^测试[：:]/);
      expect(article.author).not.toBe("测试作者");
    }
  });
});
