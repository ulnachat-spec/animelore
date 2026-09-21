"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AniListPoster } from "@/components/anilist-poster";
import {
  buildColdSessionEnvelope,
  COLD_SESSION_STORAGE_KEY
} from "@/lib/cold-session";
import type { ColdHookPayload } from "@/lib/types";

const topicLabel: Record<string, string> = {
  work: "作品向",
  concept: "文化概念",
  phenomenon: "行业 / 现象"
};

export function ColdHookTeaser({ payload }: { payload: ColdHookPayload }) {
  const router = useRouter();
  const preview = payload.blurb
    ? `${payload.blurb.replace(/[。！？!?]+$/, "").slice(0, 76)}…`
    : `${payload.insight.replace(/\s+/g, " ").slice(0, 76).replace(/[，；、\s]+$/, "")}…`;

  const onOpenDetail = () => {
    try {
      sessionStorage.setItem(
        COLD_SESSION_STORAGE_KEY,
        JSON.stringify(buildColdSessionEnvelope(payload))
      );
    } catch {
      // The detail page will show its recovery state when storage is unavailable.
    }
    router.push(payload.record_id ? `/cold/${encodeURIComponent(payload.record_id)}` : "/cold");
  };

  return (
    <section className="archive-card group relative h-full overflow-hidden p-5 sm:p-6">
      <span
        className="absolute -right-5 -top-6 font-display text-8xl text-brand/5 transition group-hover:-rotate-6 group-hover:text-brand/10"
        aria-hidden="true"
      >
        ?
      </span>
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <span className="archive-kicker">今日冷知识 · Daily note</span>
        <span className="rounded-full bg-sage/10 px-2.5 py-1 text-xs font-medium text-sage">
          {topicLabel[payload.topic_type] || payload.topic_type}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpenDetail}
        className="relative mt-8 w-full rounded-xl text-left focus-visible:outline-none"
      >
        <p className="archive-title text-xl leading-snug sm:text-2xl">{payload.hook}</p>
        <p className="mt-3 max-w-xl text-sm leading-6 text-body">
          <span className="font-semibold text-brand">先露一角：</span>{preview}
        </p>
        <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand">
          展开继续阅读
          <span className="transition group-hover:translate-x-1" aria-hidden="true">→</span>
        </p>
      </button>
      {payload.recommendations.length ? (
        <div className={`relative mt-5 grid gap-2 border-t border-line/70 pt-4 ${payload.recommendations.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {payload.recommendations.slice(0, 2).map((rec) => (
            <Link
              key={`${rec.candidate_id}-${rec.anilistId}`}
              href={`/work/${encodeURIComponent(rec.searchQuery)}`}
              className="flex items-center gap-3 rounded-xl bg-canvas-tint/70 p-2 transition hover:bg-soft"
            >
              <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-soft">
                <AniListPoster title={rec.searchQuery} initialSrc={rec.coverImage} sizes="36px" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-medium text-muted">相关作品</span>
                <span className="block truncate text-sm font-semibold text-ink">{rec.displayTitle}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
