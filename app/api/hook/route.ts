import { NextResponse } from "next/server";
import { getHomeHookLibraryStats } from "@/lib/cold-hook-service";
import { getHomeHookPayload, resolveHomeHook } from "@/lib/home-hook";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const debugMode = url.searchParams.get("debug") === "1";

  if (debugMode) {
    const { payload, debug } = await resolveHomeHook({ refresh });
    return NextResponse.json({
      payload,
      debug: {
        ...debug,
        source: debug.source ?? debug.mode,
        library: getHomeHookLibraryStats()
      }
    });
  }

  const payload = await getHomeHookPayload({ refresh });
  return NextResponse.json(payload);
}
