import { NextResponse } from "next/server";
import { getHomeHookLibraryStats } from "@/lib/cold-hook-service";
import { getRoamCards, normalizeRoamCount } from "@/lib/roam/roam-service";
import { enforceRateLimit } from "@/lib/rate-limit-response";
import { recordOperationsEvent } from "@/lib/operations-metrics";

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function GET(req: Request) {
  recordOperationsEvent("roam_requested");
  const { blocked } = enforceRateLimit(req, "roam", 30, 5 * 60_000);
  if (blocked) return blocked;
  const url = new URL(req.url);
  const count = normalizeRoamCount(Number(url.searchParams.get("count") ?? undefined));
  const debugMode = process.env.NODE_ENV === "development" && url.searchParams.get("debug") === "1";

  try {
    const result = await getRoamCards({
      count,
      seed: url.searchParams.get("seed") ?? undefined,
      likedTags: parseList(url.searchParams.get("likedTags")),
      skippedTags: parseList(url.searchParams.get("skippedTags")),
      recentTopicKeys: parseList(url.searchParams.get("recentTopicKeys"))
    });

    recordOperationsEvent("roam_succeeded");
    return NextResponse.json({
      cards: result.cards,
      ...(debugMode ? { debug: { ...result.debug, library: getHomeHookLibraryStats() } } : {})
    });
  } catch (e) {
    console.warn("[roam] fallback response:", (e as Error).message);
    const result = await getRoamCards({ count });
    recordOperationsEvent("roam_succeeded");
    return NextResponse.json({
      cards: result.cards,
      ...(debugMode
        ? { debug: { ...result.debug, error: (e as Error).message, source: "fallback_after_error" } }
        : {})
    });
  }
}
