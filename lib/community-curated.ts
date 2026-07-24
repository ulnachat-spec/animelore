import type { CommunityArticleCandidate, CommunityArticleSource } from "@/lib/types";

const CURATED_MAX = 5;

interface CuratedItemInput {
  source: CommunityArticleSource;
  title: string;
  url: string;
  author?: string;
  published_at?: string;
  snippet?: string;
}

interface CuratedEntry {
  match: string[];
  items: CuratedItemInput[];
}

/**
 * 手动维护的社区延伸阅读；默认空，可在部署时按作品追加。
 * 示例结构（勿提交未验证链接）：
 * { match: ["葬送的芙莉莲", "Frieren"], items: [{ source: "manual", title: "…", url: "https://…" }] }
 */
// TODO: 替换为真实社区链接；以下为临时 E2E 测试数据。
const CURATED_COMMUNITY_ARTICLES: CuratedEntry[] = [
  {
    match: ["葬送的芙莉莲", "Frieren", "葬送のフリーレン"],
    items: [
      {
        source: "manual",
        title: "测试：葬送的芙莉莲社区考据推荐",
        url: "https://example.com/frieren-community-test",
        author: "测试作者",
        snippet: "这是一条用于验证中文社区推荐模块是否显示的测试候选。"
      }
    ]
  }
];

function normalizeMatchKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

function matchesAny(needle: string, haystacks: string[]): boolean {
  const n = normalizeMatchKey(needle);
  if (!n) return false;
  for (const h of haystacks) {
    const key = normalizeMatchKey(h);
    if (!key) continue;
    if (key === n || key.includes(n) || n.includes(key)) return true;
  }
  return false;
}

function itemToCandidate(item: CuratedItemInput, index: number, entryIndex: number): CommunityArticleCandidate {
  const url = item.url.trim();
  return {
    id: `curated_${entryIndex}_${index}_${hashUrl(url)}`,
    source: item.source,
    title: item.title.trim(),
    url,
    author: item.author?.trim() || undefined,
    published_at: item.published_at?.trim() || undefined,
    snippet: item.snippet?.trim() || undefined
  };
}

function hashUrl(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i += 1) {
    h = (h * 31 + url.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function getCuratedCommunityArticles(input: {
  workTitle: string;
  nativeTitle?: string;
  aliases?: string[];
}): CommunityArticleCandidate[] {
  const probes = [
    input.workTitle,
    input.nativeTitle || "",
    ...(input.aliases || [])
  ].filter((s) => s.trim().length > 0);

  if (probes.length === 0) return [];

  const out: CommunityArticleCandidate[] = [];
  const seenUrls = new Set<string>();

  for (let ei = 0; ei < CURATED_COMMUNITY_ARTICLES.length; ei += 1) {
    const entry = CURATED_COMMUNITY_ARTICLES[ei];
    const hit = entry.match.some((m) => probes.some((p) => matchesAny(p, [m])));
    if (!hit) continue;

    for (let ii = 0; ii < entry.items.length; ii += 1) {
      const c = itemToCandidate(entry.items[ii], ii, ei);
      const urlKey = c.url.toLowerCase();
      if (seenUrls.has(urlKey)) continue;
      seenUrls.add(urlKey);
      out.push(c);
      if (out.length >= CURATED_MAX) return out;
    }
  }

  return out;
}
