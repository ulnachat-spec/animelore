import { NextResponse } from "next/server";
import { z } from "zod";
import { recordOperationsEvent, type OperationsEvent } from "@/lib/operations-metrics";
import { enforceRateLimit } from "@/lib/rate-limit-response";

const eventSchema = z.object({
  event: z.enum(["lore_evidence_opened", "lore_feedback_helpful", "lore_feedback_flagged", "roam_skipped", "roam_opened"])
});

export async function POST(request: Request) {
  const { blocked } = enforceRateLimit(request, "product-events", 120, 5 * 60_000);
  if (blocked) return blocked;
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  recordOperationsEvent(parsed.data.event as OperationsEvent);
  return new NextResponse(null, { status: 204 });
}
