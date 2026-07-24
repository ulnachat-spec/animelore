"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TickRow = {
  i: number;
  text: string;
  receivedAt: string;
  clientMs: number;
};

function parseSseBlock(block: string): { event: string; data: string } | null {
  const trimmed = block.trim();
  if (!trimmed || trimmed.startsWith(":")) return null;

  let event = "message";
  const dataLines: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

export default function SseProbePage() {
  const [rows, setRows] = useState<TickRow[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const startRef = useRef(0);

  const runProbe = useCallback(async () => {
    setRows([]);
    setError(null);
    setEventCount(0);
    setStatus("running");
    startRef.current = Date.now();

    try {
      const res = await fetch("/api/debug/sse-probe");
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const parsed = parseSseBlock(block);
          if (!parsed) continue;

          const clientMs = Date.now() - startRef.current;
          setEventCount((n) => n + 1);

          if (parsed.event === "tick") {
            const payload = JSON.parse(parsed.data) as { i: number; text: string };
            setRows((prev) => [
              ...prev,
              {
                i: payload.i,
                text: payload.text,
                receivedAt: new Date().toISOString(),
                clientMs
              }
            ]);
            console.log("[sse-probe-client] tick", payload.i, "clientMs", clientMs);
          } else if (parsed.event === "done") {
            setStatus("done");
            console.log("[sse-probe-client] done clientMs", clientMs);
          } else if (parsed.event === "error") {
            const payload = JSON.parse(parsed.data) as { message?: string };
            throw new Error(payload.message || "probe_error");
          }
        }
      }

      setStatus((s) => (s === "running" ? "done" : s));
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void runProbe();
  }, [runProbe]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-ink">
      <h1 className="text-2xl font-bold">SSE 流式探针</h1>
      <p className="mt-2 text-sm text-muted">
        GET /api/debug/sse-probe — 每 200ms 一条 tick，共 20 条。若下方列表逐步增加则基础 SSE
        正常；若约 4 秒后一次性出现 20 行，则存在 Response/SSE 缓冲。
      </p>

      <p className="mt-4 text-sm">
        状态：<span className="text-brand">{status}</span>
        {" · "}
        已收事件：<span className="text-brand">{eventCount}</span>
        {" · "}
        行数：<span className="text-brand">{rows.length}</span>
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void runProbe()}
        className="mt-4 rounded-lg border border-line bg-soft px-4 py-2 text-sm hover:border-brand"
      >
        重新探测
      </button>

      <ul className="mt-6 space-y-2 rounded-xl border border-line bg-surface/85 p-4 font-mono text-sm">
        {rows.length === 0 ? (
          <li className="text-muted">等待 tick…</li>
        ) : (
          rows.map((row) => (
            <li key={`tick-${row.i}-${row.clientMs}`}>
              [{row.clientMs}ms] #{row.i} {row.text}
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
