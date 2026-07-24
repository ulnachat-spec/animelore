import { NextResponse } from "next/server";
import { getHomeHookLibraryStats } from "@/lib/cold-hook-service";
import { getRoamCards, normalizeRoamCount } from "@/lib/roam/roam-service";

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const count = normalizeRoamCount(Number(url.searchParams.get("count") ?? undefined));
  const debugMode = url.searchParams.get("debug") === "1";

  try {
    const result = await getRoamCards({
      count,
      seed: url.searchParams.get("seed") ?? undefined,
      likedTags: parseList(url.searchParams.get("likedTags")),
      skippedTags: parseList(url.searchParams.get("skippedTags")),
      recentTopicKeys: parseList(url.searchParams.get("recentTopicKeys"))
    });

    return NextResponse.json({
      cards: result.cards,
      ...(debugMode ? { debug: { ...result.debug, library: getHomeHookLibraryStats() } } : {})
    });
  } catch (e) {
    console.warn("[roam] fallback response:", (e as Error).message);
    const result = await getRoamCards({ count });
    return NextResponse.json({
      cards: result.cards,
      ...(debugMode
        ? { debug: { ...result.debug, error: (e as Error).message, source: "fallback_after_error" } }
        : {})
    });
  }
}
