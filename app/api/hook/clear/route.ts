import { NextResponse } from "next/server";
import { clearHomeHookCache } from "@/lib/cold-hook-cache";
import { resetColdHookServiceState } from "@/lib/cold-hook-service";
import { clearColdHookStore } from "@/lib/cold-hook-store";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "only available in development" }, { status: 403 });
  }
  clearColdHookStore();
  clearHomeHookCache();
  resetColdHookServiceState();
  return NextResponse.json({
    ok: true,
    message: "cold-hooks.json cleared, in-memory store and hook cache reset"
  });
}
