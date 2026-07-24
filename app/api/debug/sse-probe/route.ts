export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TICK_COUNT = 20;
const TICK_INTERVAL_MS = 200;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no"
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function encodeSse(event: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const flush = ": flush\n\n";
  return encoder.encode(payload + flush);
}

/** 最小 SSE 探针：每 200ms 一条 tick，共 20 条，用于区分缓冲 vs 业务逻辑问题 */
export async function GET() {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now();
      console.log("[sse-probe] stream_start");

      try {
        for (let i = 1; i <= TICK_COUNT; i++) {
          controller.enqueue(
            encodeSse("tick", { i, text: `第 ${i} 段`, at: new Date().toISOString() })
          );
          console.log(`[sse-probe] tick ${i} +${Date.now() - startedAt}ms`);
          if (i < TICK_COUNT) {
            await sleep(TICK_INTERVAL_MS);
          }
        }
        controller.enqueue(encodeSse("done", { ok: true }));
        console.log(`[sse-probe] done +${Date.now() - startedAt}ms`);
      } catch (e) {
        controller.enqueue(
          encodeSse("error", { message: (e as Error).message || "probe_failed" })
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
