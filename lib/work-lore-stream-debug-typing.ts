import { LORE_CARD_META } from "@/lib/lore-card-meta";
import type { SseSender } from "@/lib/sse";
import type { LoreCard, LorePayload } from "@/lib/types";

const DEBUG_HEADLINE = "测试流式输出";
const DEBUG_TICK_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 不调用 DeepSeek：仅 LEGACY headline 逐字 card_delta，用于验证作品页流式 UI。
 */
export async function runDebugTypingStream(query: string, send: SseSender): Promise<void> {
  const t0 = Date.now();
  const trimmed = query.trim();
  const cardId = "legacy" as const;
  const cardMeta = LORE_CARD_META[cardId];

  send("status", {
    message: "debugTyping：测试流式 headline…",
    stage: "debug_typing"
  });

  send("meta", {
    meta: { title: trimmed || "调试作品" }
  });

  send("card_start", {
    card_id: cardId,
    zh_name: cardMeta.zh_name,
    en_label: cardMeta.en_label
  });

  let deltaCount = 0;
  for (const ch of DEBUG_HEADLINE) {
    await sleep(DEBUG_TICK_MS);
    send("card_delta", {
      card_id: cardId,
      field: "headline",
      delta: ch
    });
    deltaCount += 1;
    console.log(
      `[work-stream] debugTyping card_delta #${deltaCount} +${Date.now() - t0}ms char=${ch}`
    );
  }

  const mockCard: LoreCard = {
    id: cardId,
    en_label: cardMeta.en_label,
    zh_name: cardMeta.zh_name,
    headline: DEBUG_HEADLINE,
    intro: "（debugTyping 占位 intro）",
    points: ["（debugTyping 占位 point 1）"],
    source: "AnimeLore debug",
    source_urls: []
  };

  send("card_done", { card: mockCard, debug_typing: true });
  console.log(
    `[work-stream] debugTyping card_done delta_count=${deltaCount} +${Date.now() - t0}ms`
  );

  const placeholderBody = {
    headline: "—",
    intro: "—",
    points: ["—"],
    source: "AnimeLore debug",
    source_urls: [] as string[]
  };

  const lore: LorePayload = {
    work_title: trimmed,
    cards: (["legacy", "meme", "behind", "lineage"] as const).map((id) => {
      if (id === "legacy") return mockCard;
      return {
        id,
        en_label: LORE_CARD_META[id].en_label,
        zh_name: LORE_CARD_META[id].zh_name,
        ...placeholderBody
      };
    }),
    bottom_hook: { work: trimmed, hook: "debugTyping 完成" }
  };

  send("status", { message: "debugTyping 完成", stage: "done" });
  send("done", {
    lore,
    meta: { title: trimmed },
    evidence: [],
    debug_typing: true
  });

  console.log(`[work-stream] debugTyping done +${Date.now() - t0}ms`);
}
