import { NextRequest, NextResponse } from "next/server";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const coverCache = new Map<string, { coverUrl: string; expiresAt: number }>();
const COVER_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.trim();
  if (!title) {
    return NextResponse.json({ error: "missing title" }, { status: 400 });
  }
  const cacheKey = title.normalize("NFKC").toLowerCase();
  const cached = coverCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ coverUrl: cached.coverUrl, cache: "hit" });
  }

  const graphql = `
    query ($search: String) {
      Page(page: 1, perPage: 5) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          coverImage {
            large
          }
        }
      }
    }
  `;

  try {
    const resp = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "AnimeLore/0.1"
      },
      body: JSON.stringify({ query: graphql, variables: { search: title } }),
      cache: "no-store"
    });

    if (!resp.ok) {
      return NextResponse.json(
        { coverUrl: "", retryable: resp.status === 429 },
        { status: resp.status === 429 ? 503 : 200 }
      );
    }

    type AnilistCoverJson = {
      errors?: unknown[];
      data?: {
        Page?: {
          media?: Array<{ coverImage?: { large?: string | null } }>;
        };
      };
    };
    const json = (await resp.json()) as AnilistCoverJson;

    if (json.errors?.length) {
      return NextResponse.json({ coverUrl: "" });
    }

    const list = json.data?.Page?.media || [];
    const large = list.find((m) => m.coverImage?.large)?.coverImage?.large;
    const coverUrl = typeof large === "string" ? large : "";
    coverCache.set(cacheKey, { coverUrl, expiresAt: Date.now() + COVER_TTL_MS });
    return NextResponse.json({ coverUrl });
  } catch {
    return NextResponse.json({ coverUrl: "" });
  }
}
