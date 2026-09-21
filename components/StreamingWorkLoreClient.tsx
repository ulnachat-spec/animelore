"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  emptyStreamingCards,
  StreamingLoreGrid,
  type StreamingCardState
} from "@/components/streaming-lore-grid";
import { WorkChatDrawer } from "@/components/WorkChatDrawer";
import { WorkBottomHookPanel } from "@/components/work/work-bottom-hook-panel";
import { WorkLoreClient } from "@/components/work-lore-client";
import type { Evidence } from "@/lib/rag/types";
import type { LoreCard, LoreCardId, LorePayload, WorkMeta } from "@/lib/types";

const STREAM_DEBUG = process.env.NODE_ENV === "development";

function buildWorkStreamUrl(query: string, debugTyping: boolean): string {
  const params = new URLSearchParams({ q: query });
  if (debugTyping) params.set("debugTyping", "1");
  return `/api/work/stream?${params.toString()}`;
}

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

export function StreamingWorkLoreClient({
  query,
  debugTyping = false,
  clientIdleMs = 30_000
}: {
  query: string;
  debugTyping?: boolean;
  clientIdleMs?: number;
}) {
  const streamUrl = useMemo(
    () => buildWorkStreamUrl(query, debugTyping),
    [query, debugTyping]
  );

  const [statusMessage, setStatusMessage] = useState("正在连接流式生成…");
  const [streamingCards, setStreamingCards] = useState<StreamingCardState[]>(() =>
    emptyStreamingCards()
  );
  const [streamComplete, setStreamComplete] = useState(false);
  const [finalLore, setFinalLore] = useState<LorePayload | null>(null);
  const [meta, setMeta] = useState<WorkMeta | null>(null);
  const [evidence, setEvidence] = useState<Evidence[] | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  const lastEventAtRef = useRef(Date.now());
  const abortRef = useRef<AbortController | null>(null);
  const fallbackStartedRef = useRef(false);
  const debugRef = useRef({
    receivedEvents: 0,
    receivedCardDelta: 0,
    receivedPointDelta: 0
  });

  const touchLastEvent = useCallback(() => {
    lastEventAtRef.current = Date.now();
  }, []);

  const logDebug = useCallback(() => {
    if (!STREAM_DEBUG) return;
    console.debug("[work-stream-client]", { ...debugRef.current });
  }, []);

  const applyCardUpdate = useCallback(
    (cardId: LoreCardId, updater: (c: StreamingCardState) => StreamingCardState) => {
      setStreamingCards((prev) =>
        prev.map((c) => (c.id === cardId ? updater(c) : c))
      );
    },
    []
  );

  const runFallback = useCallback(
    async (reason: "error" | "idle" | "incomplete") => {
      if (fallbackStartedRef.current || streamComplete) return;
      fallbackStartedRef.current = true;
      abortRef.current?.abort();

      setFallbackLoading(true);
      setStreamError(null);
      setStatusMessage(
        reason === "idle"
          ? "流式生成超时，正在切换普通生成…"
          : "流式生成失败，正在切换普通生成…"
      );

      try {
        const res = await fetch(`/api/work?q=${encodeURIComponent(query)}`);
        const data = (await res.json()) as {
          ok?: boolean;
          lore?: LorePayload;
          meta?: WorkMeta;
          evidenceForRegenerate?: Evidence[] | null;
          message?: string;
        };
        if (!res.ok || data.ok === false || !data.lore?.cards?.length) {
          throw new Error(data.message || `HTTP ${res.status}`);
        }
        setMeta(data.meta ?? null);
        setFinalLore(data.lore);
        setEvidence(data.evidenceForRegenerate ?? null);
        setStreamComplete(true);
        setFallbackMode(true);
        setFallbackNotice("流式生成失败，已切换普通生成");
        setStatusMessage("");
      } catch (e) {
        setStreamError((e as Error).message || "fallback_failed");
        setStatusMessage("普通生成也失败了，请稍后重试");
      } finally {
        setFallbackLoading(false);
      }
    },
    [query, streamComplete]
  );

  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    fallbackStartedRef.current = false;
    lastEventAtRef.current = Date.now();
    debugRef.current = {
      receivedEvents: 0,
      receivedCardDelta: 0,
      receivedPointDelta: 0
    };
    let gotDone = false;

    const idleWatch = setInterval(() => {
      if (gotDone || fallbackStartedRef.current) return;
      if (Date.now() - lastEventAtRef.current >= clientIdleMs) {
        void runFallback("idle");
      }
    }, 5_000);

    const handleSseEvent = (event: string, payload: Record<string, unknown>) => {
      debugRef.current.receivedEvents += 1;

      switch (event) {
        case "status": {
          const msg = String(payload.message ?? "");
          if (msg) setStatusMessage(msg);
          break;
        }
        case "meta": {
          const m = payload.meta as WorkMeta | undefined;
          if (m) setMeta(m);
          break;
        }
        case "card_start": {
          const cardId = payload.card_id as LoreCardId;
          flushSync(() => {
            applyCardUpdate(cardId, (c) => ({
              ...c,
              started: true,
              zh_name: String(payload.zh_name ?? c.zh_name),
              en_label: String(payload.en_label ?? c.en_label)
            }));
          });
          break;
        }
        case "card_delta": {
          debugRef.current.receivedCardDelta += 1;
          const cardId = payload.card_id as LoreCardId;
          const field = payload.field as "headline" | "intro";
          const delta = String(payload.delta ?? "");
          if (debugTyping) {
            console.debug("[work-stream-client] card_delta", {
              cardId,
              field,
              delta,
              len: delta.length
            });
          }
          flushSync(() => {
            applyCardUpdate(cardId, (c) => ({
              ...c,
              [field]: c[field] + delta
            }));
          });
          logDebug();
          break;
        }
        case "card_point_delta": {
          debugRef.current.receivedPointDelta += 1;
          const cardId = payload.card_id as LoreCardId;
          const pointIndex = Number(payload.point_index ?? 0);
          const delta = String(payload.delta ?? "");
          flushSync(() => {
            applyCardUpdate(cardId, (c) => {
              const points = [...c.points];
              while (points.length <= pointIndex) points.push("");
              points[pointIndex] = (points[pointIndex] ?? "") + delta;
              return { ...c, points };
            });
          });
          logDebug();
          break;
        }
        case "card_done": {
          const card = payload.card as LoreCard | undefined;
          if (!card) break;
          flushSync(() => {
            applyCardUpdate(card.id, (c) => ({
              ...c,
              done: true,
              finalCard: card,
              headline: card.headline,
              intro: card.intro,
              points: card.points
            }));
          });
          break;
        }
        case "done": {
          gotDone = true;
          const lore = payload.lore as LorePayload | undefined;
          const m = payload.meta as WorkMeta | undefined;
          const ev = payload.evidence as Evidence[] | undefined;
          if (m) setMeta(m);
          if (lore) setFinalLore(lore);
          if (ev) setEvidence(ev);
          setStreamComplete(true);
          setStatusMessage("生成完成");
          logDebug();
          break;
        }
        case "error": {
          throw new Error(String(payload.message ?? "stream_error"));
        }
        default:
          break;
      }
    };

    async function consumeStream() {
      try {
        if (STREAM_DEBUG) {
          console.debug(`[StreamingWorkLoreClient] fetch ${streamUrl}`);
        }
        const res = await fetch(streamUrl, { signal: ac.signal });
        if (!res.ok || !res.body) {
          throw new Error(`stream_http_${res.status}`);
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

            let payload: Record<string, unknown>;
            try {
              payload = JSON.parse(parsed.data) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (parsed.event === "ping") {
              touchLastEvent();
              continue;
            }

            touchLastEvent();
            handleSseEvent(parsed.event, payload);

            if (
              parsed.event === "card_delta" ||
              parsed.event === "card_point_delta"
            ) {
              await new Promise<void>((resolve) => {
                requestAnimationFrame(() => resolve());
              });
            }
          }
        }

        if (!gotDone) {
          throw new Error("stream_ended_without_done");
        }
      } catch (e) {
        if (ac.signal.aborted && fallbackStartedRef.current) return;
        if (gotDone) return;
        await runFallback("error");
      }
    }

    void consumeStream();

    return () => {
      clearInterval(idleWatch);
      ac.abort();
    };
  }, [
    streamUrl,
    query,
    debugTyping,
    clientIdleMs,
    applyCardUpdate,
    runFallback,
    touchLastEvent,
    logDebug
  ]);

  const pageContext = meta
    ? {
        title: meta.title,
        nativeTitle: meta.nativeTitle,
        urlQuery: query.trim()
      }
    : { title: query, urlQuery: query.trim() };

  if (streamComplete && finalLore && meta) {
    return (
      <>
        {fallbackNotice ? (
          <p
            className="mb-4 rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-2 text-center text-sm text-amber-200/90"
            role="status"
          >
            {fallbackNotice}
          </p>
        ) : null}
        <WorkLoreClient
          meta={meta}
          initialCards={finalLore.cards}
          evidenceForRegenerate={evidence}
        />
        <WorkBottomHookPanel bottomHook={finalLore.bottom_hook} pageContext={pageContext} />
      </>
    );
  }

  return (
    <>
    <section className="mt-8">
      {STREAM_DEBUG && debugTyping ? (
        <div className="mb-3 rounded border border-amber-800/60 bg-amber-950/40 px-3 py-2 font-mono text-[11px] text-amber-200/95">
          <div>debugTyping: on</div>
          <div className="mt-1 break-all text-amber-100/80">GET {streamUrl}</div>
        </div>
      ) : null}
      <p className="mb-4 text-center text-sm text-muted" role="status" aria-live="polite">
        {fallbackLoading
          ? statusMessage || "流式生成失败，正在切换普通生成…"
          : statusMessage}
      </p>

      <StreamingLoreGrid cards={streamingCards} />

      {streamError ? (
        <p className="mt-4 text-center text-sm text-red-400" role="alert">
          {streamError}
        </p>
      ) : null}
    </section>
    <WorkChatDrawer
      workTitle={meta?.title ?? query.trim()}
      workMeta={meta ?? undefined}
      cards={[]}
      ready={false}
      readyHint="四卡还在生成中，稍后再聊哦～"
      coverImage={meta?.coverImage}
    />
    </>
  );
}
