/**
 * 作品页四卡区：换一批（按板块独立去重 + 程序校验）。
 */
"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { WorkChatDrawer } from "@/components/WorkChatDrawer";
import { LoreGrid } from "@/components/lore-grid";
import {
  mergeSeenWithCards,
  seenStringsFromCards,
  type SeenContentByCard
} from "@/lib/regenerate-dedupe";
import type { Evidence } from "@/lib/rag/types";
import type { LoreCard, LorePayload, WorkMeta } from "@/lib/types";

export interface WorkLoreClientProps {
  meta: WorkMeta;
  initialCards: LoreCard[];
  evidenceForRegenerate: Evidence[] | null;
}

export function WorkLoreClient({ meta, initialCards, evidenceForRegenerate }: WorkLoreClientProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [cards, setCards] = useState<LoreCard[]>(initialCards);
  const [seenContentByCard, setSeenContentByCard] = useState<SeenContentByCard>(() =>
    seenStringsFromCards(initialCards)
  );
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [enterBatchKey, setEnterBatchKey] = useState(0);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [regenStatus, setRegenStatus] = useState<"idle" | "ok" | "exhausted">("idle");

  const canRegenerate = Boolean(evidenceForRegenerate && evidenceForRegenerate.length > 0);

  async function handleRegenerate() {
    if (!evidenceForRegenerate?.length || isRegenerating) return;

    setRegenError(null);
    setIsRegenerating(true);

    let lore: LorePayload | null = null;
    let exhausted = true;

    try {
      const res = await fetch("/api/work/regenerate-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta,
          evidence: evidenceForRegenerate,
          seenContentByCard
        })
      });
      const data = (await res.json()) as {
        lore?: LorePayload;
        exhausted?: boolean;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : data.error || `HTTP ${res.status}`
        );
      }
      if (!data.lore?.cards?.length) {
        throw new Error("empty_lore");
      }
      lore = data.lore;
      exhausted = data.exhausted === true;
    } catch (e) {
      setRegenError((e as Error).message);
      setIsRegenerating(false);
      return;
    }

    setFadeOut(true);
    await new Promise((r) => setTimeout(r, 200));
    setCards(lore.cards);
    setSeenContentByCard((prev) => mergeSeenWithCards(prev, lore!.cards));
    setEnterBatchKey((k) => k + 1);
    setFadeOut(false);
    setRegenStatus(exhausted ? "exhausted" : "ok");
    setIsRegenerating(false);

    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const statusHint =
    regenStatus === "ok"
      ? "已避开之前看过的内容"
      : regenStatus === "exhausted"
        ? "可写新角度可能已用尽，后续可能接近已看过内容"
        : null;

  return (
    <>
    <section ref={sectionRef} className="mt-8">
      <motion.div
        animate={{ opacity: fadeOut ? 0 : 1 }}
        transition={{ duration: fadeOut ? 0.2 : 0 }}
      >
        <LoreGrid cards={cards} enterBatchKey={enterBatchKey} />
      </motion.div>

      {canRegenerate ? (
        <motion.div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="rounded-full border border-zinc-600 bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRegenerating ? "生成中..." : "换一批 ↻"}
          </button>
          {statusHint ? (
            <p className="text-center text-xs text-zinc-500" aria-live="polite">
              {statusHint}
            </p>
          ) : null}
          {regenError ? (
            <p className="text-center text-sm text-red-400" role="alert">
              换一批失败：{regenError}
            </p>
          ) : null}
        </motion.div>
      ) : null}
    </section>
    <WorkChatDrawer workTitle={meta.title} cards={cards} coverImage={meta.coverImage} />
    </>
  );
}
