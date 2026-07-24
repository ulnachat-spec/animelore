"use client";

import { useRouter } from "next/navigation";
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

  const onOpenDetail = () => {
    try {
      sessionStorage.setItem(
        COLD_SESSION_STORAGE_KEY,
        JSON.stringify(buildColdSessionEnvelope(payload))
      );
    } catch {
      // The detail page will show its recovery state when storage is unavailable.
    }
    router.push("/cold");
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
        <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand">
          翻开完整解读
          <span className="transition group-hover:translate-x-1" aria-hidden="true">→</span>
        </p>
      </button>
    </section>
  );
}
