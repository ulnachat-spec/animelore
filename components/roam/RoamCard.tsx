"use client";

import type { RoamCard as RoamCardData } from "@/lib/roam/roam-types";

const tagTone: Record<RoamCardData["tag"], string> = {
  作品: "border-sage/35 bg-sage/10 text-sage",
  梗: "border-brand/35 bg-brand/10 text-brand",
  幕后: "border-brand/35 bg-brand/10 text-brand",
  概念: "border-sage/35 bg-sage/10 text-sage",
  谱系: "border-muted/35 bg-soft text-body",
  社区: "border-brand/35 bg-brand/10 text-brand"
};

export function RoamCard({ card }: { card: RoamCardData }) {
  const sourceCount = card.source_urls.length;
  const confidencePercent = Math.round(card.confidence * 100);
  const verifiedLabel = card.verification_status === "fallback" ? "安全兜底" : "已校验";

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

        <details className="archive-disclosure mt-5 rounded-2xl border border-line/70 bg-canvas/55 p-2 sm:mt-8" name="roam-context">
          <summary>看看这条线索会通向哪里</summary>
          <div className="px-2 pb-2">
            <p className="mt-1 text-sm font-medium text-ink">{card.target.title}</p>
            <p className="mt-2 text-xs text-muted">
              {card.next_seeds.slice(0, 3).join(" / ") || card.topic_key}
            </p>
          </div>
        </details>

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
