export type SseSender = (event: string, data: unknown) => void;

export function createSseResponse(
  run: (send: SseSender, close: () => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send: SseSender = (event, data) => {
        if (closed) return;
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
        // SSE comment line helps proxies flush without breaking event format
        controller.enqueue(encoder.encode(": flush\n\n"));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      try {
        await run(send, close);
      } catch (e) {
        send("error", { message: (e as Error).message || "stream_failed" });
      } finally {
        close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
