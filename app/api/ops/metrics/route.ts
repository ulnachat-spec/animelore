import { NextResponse } from "next/server";
import { getOperationsMetrics } from "@/lib/operations-metrics";

/** Development-only operational snapshot. Use a real observability sink in production. */
export async function GET() {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ metrics: getOperationsMetrics() });
}
