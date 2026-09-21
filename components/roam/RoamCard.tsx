"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { AniListPoster } from "@/components/anilist-poster";
import type { RoamCard as RoamCardData } from "@/lib/roam/roam-types";

const tagTone: Record<RoamCardData["tag"], string> = {
  作品: "border-sage/35 bg-sage/10 text-sage",
  梗: "border-brand/35 bg-brand/10 text-brand",
  幕后: "border-brand/35 bg-brand/10 text-brand",
  概念: "border-sage/35 bg-sage/10 text-sage",
  谱系: "border-muted/35 bg-soft text-body",
  社区: "border-brand/35 bg-brand/10 text-brand"
};

export function RoamCard({ card, preferenceReason }: { card: RoamCardData; preferenceReason?: string }) {
  const [quizChoice, setQuizChoice] = useState<boolean | null>(null);
  const sourceCount = card.source_urls.length;
  const confidencePercent = Math.round(card.confidence * 100);
  const verifiedLabel = card.verification_status === "fallback" ? "安全兜底" : "已校验";
  const recommendations = card.cold_payload?.recommendations ?? [];
  const quiz = card.cold_payload?.quiz;
  const showTrail = !quiz || quizChoice !== null;
  const quizCorrect = quiz && quizChoice !== null ? quizChoice === quiz.answer : null;

  return (
    <article className="archive-card relative min-h-[360px] overflow-hidden p-5 sm:min-h-[430px] sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_5%,rgb(var(--c-brand)/0.13),transparent_34%),radial-gradient(circle_at_90%_20%,rgb(var(--c-sage)/0.12),transparent_30%)]" />
      <span className="pointer-events-none absolute -bottom-12 -right-4 font-display text-[11rem] leading-none text-brand/5" aria-hidden="true">
        ✦
      </span>
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tagTone[card.tag]}`}>
            {card.tag}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {card.type.replaceAll("_", " ")}
          </span>
        </div>

        <h1 className="archive-title mt-5 text-2xl leading-tight sm:mt-8 sm:text-4xl">
          {card.hook}
        </h1>
        <p className="mt-5 text-base leading-8 text-body">{card.blurb}</p>

        {preferenceReason ? (
          <p className="mt-4 inline-flex rounded-full border border-sage/25 bg-sage/10 px-3 py-1.5 text-xs text-sage">
            ✦ {preferenceReason}
          </p>
        ) : null}

        {quiz ? (
          <section className="mt-6 rounded-2xl border border-brand/20 bg-brand/[0.045] p-4 sm:p-5">
            <p className="archive-kicker text-brand">先判断一下 · True or false</p>
            <p className="mt-2 font-display text-base font-semibold leading-7 text-ink sm:text-lg">
              {quiz.statement}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setQuizChoice(true)}
                className={`archive-button ${quizChoice === true ? "border-brand bg-brand/10 text-brand" : ""}`}
              >
                ✓ 我觉得是真的
              </button>
              <button
                type="button"
                onClick={() => setQuizChoice(false)}
                className={`archive-button ${quizChoice === false ? "border-brand bg-brand/10 text-brand" : ""}`}
              >
                × 我觉得是假的
              </button>
            </div>
            <AnimatePresence initial={false}>
              {quizChoice !== null ? (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 border-t border-line/70 pt-4">
                    <p className="font-semibold text-ink">
                      {quizCorrect ? "答对了，芽衣盖章。" : "差一点，这条确实很会骗人。"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-body">{quiz.explanation}</p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        ) : null}

        <AnimatePresence initial={false}>
          {showTrail ? (
            <motion.section
              initial={quiz ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-2xl border border-line/70 bg-canvas/55 p-4 sm:mt-8"
            >
              <p className="archive-kicker text-brand">
                {quiz ? "答案背后的档案线索" : "看看这条线索会通向哪里"}
              </p>
            <Link href={card.target.href} className="mt-1 inline-flex text-sm font-semibold text-brand hover:underline">
              {card.target.title} →
            </Link>
            <p className="mt-2 text-xs text-muted">
              {card.next_seeds.slice(0, 3).join(" / ") || card.topic_key}
            </p>
            {recommendations.length ? (
              <div className={`mt-4 grid gap-2 ${recommendations.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                {recommendations.slice(0, 2).map((rec) => (
                  <Link
                    key={`${rec.candidate_id}-${rec.anilistId}`}
                    href={`/work/${encodeURIComponent(rec.searchQuery)}`}
                    className="flex items-center gap-3 rounded-xl border border-line/70 bg-surface/80 p-2 transition hover:border-brand/40"
                  >
                    <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-soft">
                      <AniListPoster title={rec.searchQuery} initialSrc={rec.coverImage} sizes="40px" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] text-muted">沿线作品</span>
                      <span className="block truncate text-xs font-semibold text-ink">{rec.displayTitle}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
            </motion.section>
          ) : null}
        </AnimatePresence>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>
            {verifiedLabel} / 来源 {sourceCount} 个
          </span>
          <span>confidence {confidencePercent}%</span>
        </footer>
      </div>
    </article>
  );
}
