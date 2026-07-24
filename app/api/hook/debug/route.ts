import { NextResponse } from "next/server";
import { resolveHomeHook } from "@/lib/home-hook";

export async function GET(req: Request) {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const { payload, debug } = await resolveHomeHook({ refresh });
  return NextResponse.json({
    payload,
    debug: {
      ...debug,
      source: debug.source ?? debug.mode
    }
  });
}
