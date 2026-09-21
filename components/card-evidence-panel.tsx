"use client";

import { useState } from "react";
import { trackProductEvent } from "@/lib/client-product-events";
import type { LoreCard } from "@/lib/types";

function safeUrls(urls: string[]): string[] {
  return urls.filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  });
}

function sourceName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "公开来源";
  }
}

export function CardEvidencePanel({ card }: { card: LoreCard }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<"helpful" | "flagged" | null>(null);
  const urls = safeUrls(card.source_urls ?? []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) trackProductEvent("lore_evidence_opened");
  };

  return (
    <section className="mt-4 border-t border-line/70 pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-brand transition hover:bg-brand/10"
      >
        <span aria-hidden="true">⌘</span>
        档案依据 {urls.length ? `· ${urls.length} 个来源` : "· 生成摘要"}
        <span aria-hidden="true">{open ? "↑" : "↓"}</span>
      </button>
      {open ? (
        <div className="mt-2 rounded-xl border border-line/80 bg-canvas/55 p-3 text-xs leading-6 text-body">
          <p><span className="font-semibold text-ink">资料边界：</span>本卡以公开资料为线索，经模型整理为阅读型解读；观点与联想不等同于来源原文。</p>
          {urls.length ? (
            <div className="mt-2 flex flex-wrap gap-2" aria-label="本卡公开来源">
              {urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-line bg-surface px-2 py-1 text-brand hover:border-brand/50">
                  {sourceName(url)} ↗
                </a>
              ))}
            </div>
          ) : <p className="mt-2 text-muted">这一张暂未保留可直接跳转的来源，请把它当作阅读提示而非事实定论。</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-2">
            <span className="text-muted">这份依据有帮助吗？</span>
            <button type="button" onClick={() => { setFeedback("helpful"); trackProductEvent("lore_feedback_helpful"); }} className={`rounded-md px-2 py-1 ${feedback === "helpful" ? "bg-sage/15 text-sage" : "hover:bg-soft"}`}>有帮助</button>
            <button type="button" onClick={() => { setFeedback("flagged"); trackProductEvent("lore_feedback_flagged"); }} className={`rounded-md px-2 py-1 ${feedback === "flagged" ? "bg-brand/10 text-brand" : "hover:bg-soft"}`}>这条存疑</button>
            {feedback === "flagged" ? <span className="text-muted">已记入匿名质量信号。</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
