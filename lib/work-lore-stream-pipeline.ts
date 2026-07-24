import { createCardStreamStats, logCardStreamStats } from "@/lib/card-stream-stats";
import {
  fallbackLoreCard,
  generateBottomHookJson,
  generateLoreCardStream
} from "@/lib/llm-stream";
import { LORE_CARD_META, LORE_CARD_ORDER } from "@/lib/lore-card-meta";
import { insufficientEvidenceLore } from "@/lib/rag/insufficient";
import type { SseSender } from "@/lib/sse";
import type { Evidence } from "@/lib/rag/types";
import type { LoreCard, LorePayload, WorkMeta } from "@/lib/types";
import { retrieveWorkLoreContext } from "@/lib/work-lore-retrieve";
import {
  workLoreStreamCardTimeoutMs,
  workLoreStreamTotalTimeoutMs
} from "@/lib/work-stream-timeouts";

const HEARTBEAT_MS = 10_000;

function logStage(query: string, stage: string, t0: number, extra?: Record<string, unknown>) {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[work-stream] q=${query.slice(0, 40)} stage=${stage} +${Date.now() - t0}ms${suffix}`);
}

export type StreamDonePayload = {
  lore: LorePayload;
  meta: WorkMeta;
  evidence: Evidence[];
};

export async function runWorkLoreStream(
  query: string,
  send: SseSender
): Promise<void> {
  const t0 = Date.now();
  const trimmed = query.trim();
  if (!trimmed) {
    send("error", { message: "missing q" });
    return;
  }

  let currentStage = "analyzing";
  const touchPing = () => {
    send("ping", { at: new Date().toISOString(), stage: currentStage });
  };

  const pingTimer = setInterval(touchPing, HEARTBEAT_MS);
  touchPing();

  const totalAbort = new AbortController();
  const totalTimer = setTimeout(() => {
    totalAbort.abort();
    logStage(trimmed, "stream_total_timeout", t0, {
      limit_ms: workLoreStreamTotalTimeoutMs()
    });
  }, workLoreStreamTotalTimeoutMs());

  const assertNotTotalTimeout = () => {
    if (totalAbort.signal.aborted) {
      throw new Error("stream_total_timeout");
    }
  };

  try {
    send("status", { message: "analyzing", stage: "analyzing" });
    logStage(trimmed, "analyzing", t0);
    assertNotTotalTimeout();

    currentStage = "retrieving";
    send("status", { message: "正在检索资料...", stage: "retrieving" });
    const ctx = await retrieveWorkLoreContext(trimmed);
    logStage(trimmed, "retrieving", t0, { mode: ctx.mode, evidence: ctx.evidence.length });
    assertNotTotalTimeout();

    send("meta", { meta: ctx.meta });
    currentStage = "evaluating";
    send("status", { message: "正在评估证据...", stage: "evaluating" });
    logStage(trimmed, "evaluating", t0, { coverage_ok: ctx.coverageOk });
    assertNotTotalTimeout();

    if (!ctx.coverageOk) {
      const lore = insufficientEvidenceLore(ctx.meta, ctx.insufficientReason ?? "资料不足");
      for (const cardId of LORE_CARD_ORDER) {
        const card = lore.cards.find((c) => c.id === cardId)!;
        const meta = LORE_CARD_META[cardId];
        send("card_start", { card_id: cardId, zh_name: meta.zh_name, en_label: meta.en_label });
        send("card_done", { card });
      }
      send("done", {
        lore,
        meta: ctx.meta,
        evidence: ctx.evidence
      } satisfies StreamDonePayload & Record<string, unknown>);
      logStage(trimmed, "done_insufficient", t0);
      return;
    }

    const cards: LoreCard[] = [];

    for (const cardId of LORE_CARD_ORDER) {
      assertNotTotalTimeout();

      const meta = LORE_CARD_META[cardId];
      currentStage = `generating_card:${cardId}`;
      send("status", {
        message: `正在生成：${meta.zh_name}…`,
        stage: currentStage
      });
      logStage(trimmed, `generating_card:${cardId}`, t0, {
        card_timeout_ms: workLoreStreamCardTimeoutMs()
      });

      send("card_start", { card_id: cardId, zh_name: meta.zh_name, en_label: meta.en_label });
      console.log(`[work-stream] card_start card=${cardId}`);

      try {
        const cardStats = createCardStreamStats();
        const result = await generateLoreCardStream({
          meta: ctx.meta,
          evidence: ctx.evidence,
          communityHint: ctx.communityHint,
          cardId,
          signal: totalAbort.signal,
          stats: cardStats,
          onStream: async (ev) => {
            if (ev.type === "card_delta") {
              send("card_delta", {
                card_id: cardId,
                field: ev.field,
                delta: ev.delta
              });
            } else {
              send("card_point_delta", {
                card_id: cardId,
                point_index: ev.point_index,
                delta: ev.delta
              });
            }
          }
        });
        logCardStreamStats(cardId, result.stats);
        cards.push(result.card);
        send("card_done", { card: result.card, timed_out: result.timedOut === true });
        logStage(trimmed, `card_done:${cardId}`, t0, {
          repaired: result.repaired,
          timed_out: result.timedOut === true,
          delta_event_count: result.stats.delta_event_count,
          point_delta_event_count: result.stats.point_delta_event_count
        });
      } catch (e) {
        const msg = (e as Error).message || "card_failed";
        const isTotal = msg.includes("stream_total_timeout") || totalAbort.signal.aborted;
        if (isTotal) throw e;

        logStage(trimmed, `card_error:${cardId}`, t0, { message: msg });
        const errCard = fallbackLoreCard(cardId, msg);
        cards.push(errCard);
        send("card_done", { card: errCard, error: true });
        send("status", {
          message: `${meta.zh_name} 生成失败，已显示占位内容`,
          stage: `card_error:${cardId}`
        });
      }
    }

    assertNotTotalTimeout();

    let bottom_hook: LorePayload["bottom_hook"];
    try {
      bottom_hook = await generateBottomHookJson(ctx.meta, ctx.meta.title, totalAbort.signal);
    } catch {
      bottom_hook = {
        work: ctx.meta.title,
        hook: "继续探索更多作品关系与幕后故事。"
      };
    }

    const lore: LorePayload = {
      work_title: ctx.meta.title,
      cards,
      bottom_hook
    };

    currentStage = "done";
    send("status", { message: "生成完成", stage: "done" });
    send("done", {
      lore,
      meta: ctx.meta,
      evidence: ctx.evidence
    });
    logStage(trimmed, "done", t0);
  } catch (e) {
    const msg = (e as Error).message || "stream_failed";
    if (msg.includes("stream_total_timeout") || totalAbort.signal.aborted) {
      send("error", {
        message: "stream_total_timeout",
        stage: currentStage,
        elapsed_ms: Date.now() - t0
      });
      logStage(trimmed, "error_total_timeout", t0);
    } else {
      send("error", { message: msg, stage: currentStage });
      logStage(trimmed, "error", t0, { message: msg });
    }
  } finally {
    clearInterval(pingTimer);
    clearTimeout(totalTimer);
  }
}
