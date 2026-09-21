import { NextResponse } from "next/server";
import { getHomeHookLibraryStats } from "@/lib/cold-hook-service";
import { getHomeHookPayload, resolveHomeHook } from "@/lib/home-hook";
import { enforceRateLimit } from "@/lib/rate-limit-response";
import { recordOperationsEvent } from "@/lib/operations-metrics";

export async function GET(req: Request) {
  recordOperationsEvent("hook_requested");
  const { blocked } = enforceRateLimit(req, "hook", 30, 5 * 60_000);
  if (blocked) return blocked;
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const debugMode = url.searchParams.get("debug") === "1";

  if (debugMode && process.env.NODE_ENV === "development") {
    const { payload, debug } = await resolveHomeHook({ refresh });
    recordOperationsEvent("hook_succeeded");
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
  recordOperationsEvent("hook_succeeded");
  return NextResponse.json(payload);
}
