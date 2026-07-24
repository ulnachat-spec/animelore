"use client";

import type { RoamCard as RoamCardData } from "@/lib/roam/roam-types";

const tagTone: Record<RoamCardData["tag"], string> = {
  作品: "border-sky-500/40 bg-sky-500/10 text-sky-100",
  梗: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100",
  幕后: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  概念: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  谱系: "border-violet-500/40 bg-violet-500/10 text-violet-100",
  社区: "border-orange-500/40 bg-orange-500/10 text-orange-100"
};

export function RoamCard({ card }: { card: RoamCardData }) {
  const sourceCount = card.source_urls.length;
  const confidencePercent = Math.round(card.confidence * 100);
  const verifiedLabel = card.verification_status === "fallback" ? "安全兜底" : "已校验";

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-zinc-700/80 bg-zinc-900 p-6 shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,0.12),transparent_28%)]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tagTone[card.tag]}`}>
            {card.tag}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            {card.type.replaceAll("_", " ")}
          </span>
        </div>

        <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-paper">
          {card.hook}
        </h1>
        <p className="mt-5 text-base leading-8 text-zinc-300">{card.blurb}</p>

        <div className="mt-8 rounded-2xl border border-zinc-700/70 bg-black/20 p-4">
          <p className="text-xs text-zinc-500">深入目标</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">{card.target.title}</p>
          <p className="mt-2 text-xs text-zinc-500">
            {card.next_seeds.slice(0, 3).join(" / ") || card.topic_key}
          </p>
        </div>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <span>
            {verifiedLabel} / 来源 {sourceCount} 个
          </span>
          <span>confidence {confidencePercent}%</span>
        </footer>
      </div>
    </article>
  );
}
