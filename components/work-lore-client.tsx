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
  const sourceUrls = [
    ...new Set(
      cards.flatMap((card) =>
        (card.source_urls ?? []).filter((url) => /^https?:\/\//i.test(url))
      )
    )
  ];
  const backedCards = cards.filter((card) =>
    (card.source_urls ?? []).some((url) => /^https?:\/\//i.test(url))
  ).length;
  const insufficient = cards.every(
    (card) =>
      card.headline === "公开资料不足" ||
      card.source.includes("无足够证据")
  );

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
      <details className="archive-disclosure mb-4 rounded-2xl border border-line/80 bg-surface px-3 py-2">
        <summary>
          {sourceUrls.length
            ? `资料依据：${backedCards}/${cards.length} 张卡有外部来源 · ${sourceUrls.length} 个链接`
            : "资料提示：当前卡片缺少可直接核查的外部链接"}
        </summary>
        <div className="px-2 pb-2 text-xs leading-6 text-muted">
          <p>
            {sourceUrls.length
              ? "链接数量只代表可核查程度，不代表观点一定正确；社区讨论与官方资料也会分开对待。"
              : "这组内容更适合作为发现线索，不建议把其中的制作信息或数字直接当作确定事实。"}
          </p>
          {sourceUrls.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {sourceUrls.slice(0, 6).map((url, index) => {
                let host = `来源 ${index + 1}`;
                try {
                  host = new URL(url).hostname.replace(/^www\./, "");
                } catch {
                  // URL has already passed the protocol check.
                }
                return (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-line px-3 py-1 text-body hover:border-brand/50 hover:text-brand"
                  >
                    {host}
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
      </details>
      {insufficient ? (
        <section className="archive-card p-5 sm:p-7">
          <p className="archive-kicker text-brand">Evidence needed · 需要更多资料</p>
          <h2 className="archive-title mt-3 text-2xl">这次不生成四张“看起来很完整”的空档案</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-body">
            当前公开资料不足以支撑可靠解读。你可以尝试日文原名、官方英文标题或罗马音；如果作品非常冷门，等资料源补全后再来会更合适。
          </p>
        </section>
      ) : (
        <motion.div
          animate={{ opacity: fadeOut ? 0 : 1 }}
          transition={{ duration: fadeOut ? 0.2 : 0 }}
        >
          <LoreGrid cards={cards} enterBatchKey={enterBatchKey} />
        </motion.div>
      )}

      {canRegenerate ? (
        <motion.div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="rounded-full border border-line bg-soft px-6 py-2.5 text-sm font-medium text-ink transition hover:border-brand hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRegenerating ? "生成中..." : "换一批 ↻"}
          </button>
          {statusHint ? (
            <p className="text-center text-xs text-muted" aria-live="polite">
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
    <WorkChatDrawer
      workTitle={meta.title}
      workMeta={meta}
      cards={cards}
      coverImage={meta.coverImage}
      ready={!insufficient}
      readyHint="当前资料不足，芽衣先不凭印象回答这部作品。换一个更准确的标题再试试。"
    />
    </>
  );
}
