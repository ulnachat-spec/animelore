import { NextResponse } from "next/server";
import { getHomeHookLibraryStats } from "@/lib/cold-hook-service";

/** Safe public readiness signal: no keys, prompts, IPs, or internal errors. */
export async function GET() {
  const library = getHomeHookLibraryStats();
  return NextResponse.json({
    ok: true,
    service: "animelore",
    coldLibraryAvailable: library.usableCount > 0,
    streamingEnabled: process.env.WORK_LORE_STREAMING === "true",
    sharedStoreConfigured: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  });
}
