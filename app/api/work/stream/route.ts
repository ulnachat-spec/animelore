import { createSseResponse } from "@/lib/sse";
import { runDebugTypingStream } from "@/lib/work-lore-stream-debug-typing";
import { runWorkLoreStream } from "@/lib/work-lore-stream-pipeline";
import { enforceRateLimitShared } from "@/lib/rate-limit-response";
import { MAX_WORK_QUERY_LENGTH } from "@/lib/work-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { blocked } = await enforceRateLimitShared(req, "work-stream", 18, 5 * 60_000);
  if (blocked) return blocked;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const debugTyping = url.searchParams.get("debugTyping") === "1";
  if (!q) {
    return new Response(JSON.stringify({ error: "missing q" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (q.length > MAX_WORK_QUERY_LENGTH) {
    return new Response(JSON.stringify({ error: "query_too_long" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (debugTyping && process.env.NODE_ENV !== "development") {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (debugTyping) {
    console.log("[work-stream] debugTyping=1 stream_start");
  }
  return createSseResponse(async (send, close) => {
    if (debugTyping) {
      await runDebugTypingStream(q, send);
    } else {
      await runWorkLoreStream(q, send);
    }
    close();
  });
}
