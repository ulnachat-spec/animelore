/**
 * AniList 轻量条目查询：用于冷知识推荐候选验真（含 countryOfOrigin）。
 */
const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const briefCache = new Map<number, { value: AniListMediaBrief; expiresAt: number }>();
const BRIEF_TTL_MS = 24 * 60 * 60 * 1000;

export type AniListMediaBrief = {
  anilistId: number;
  title: string;
  nativeTitle?: string;
  coverImage?: string;
  countryOfOrigin: string;
  format?: string;
};

type GqlMedia = {
  id?: number;
  type?: string;
  countryOfOrigin?: string;
  format?: string;
  title?: { romaji?: string; english?: string; native?: string };
  coverImage?: { extraLarge?: string };
};

function displayTitle(m: GqlMedia): string {
  return m.title?.english || m.title?.romaji || m.title?.native || "";
}

export async function fetchAniListMediaBrief(
  anilistId: number
): Promise<AniListMediaBrief | null> {
  if (!Number.isFinite(anilistId) || anilistId <= 0) return null;
  const cached = briefCache.get(anilistId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const query = `
    query ($id: Int!) {
      Media(id: $id) {
        id
        type
        countryOfOrigin
        format
        title { romaji english native }
        coverImage { extraLarge }
      }
    }
  `;
  try {
    const request = () => fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "AnimeLore/0.1"
        },
        body: JSON.stringify({ query, variables: { id: anilistId } }),
        cache: "no-store"
      });
    let resp = await request();
    if (resp.status === 429) {
      const retryAfter = Number(resp.headers.get("retry-after") || "0");
      await new Promise((resolve) => setTimeout(resolve, Math.min(1200, Math.max(250, retryAfter * 1000))));
      resp = await request();
    }
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      errors?: unknown[];
      data?: { Media?: GqlMedia | null };
    };
    if (data.errors?.length || !data.data?.Media?.id) return null;
    const m = data.data.Media;
    if (m.type && m.type !== "ANIME") return null;
    const title = displayTitle(m);
    if (!title) return null;
    const value = {
      anilistId: m.id!,
      title,
      nativeTitle: m.title?.native,
      coverImage: m.coverImage?.extraLarge,
      countryOfOrigin: m.countryOfOrigin || "UNKNOWN",
      format: m.format
    };
    briefCache.set(anilistId, { value, expiresAt: Date.now() + BRIEF_TTL_MS });
    return value;
  } catch {
    return null;
  }
}

export async function fetchAniListMediaBriefBatch(
  ids: number[]
): Promise<Map<number, AniListMediaBrief>> {
  const unique = [...new Set(ids.filter((id) => id > 0))];
  const out = new Map<number, AniListMediaBrief>();
  for (const id of unique) {
    const brief = await fetchAniListMediaBrief(id);
    if (brief) out.set(id, brief);
  }
  return out;
}
