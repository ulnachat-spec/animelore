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
      /* ignore quota / private mode */
    }
    router.push("/cold");
  };

  return (
    <section className="mt-12 w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 p-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
        <span>今日冷知识</span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
          {topicLabel[payload.topic_type] || payload.topic_type}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpenDetail}
        className="mt-3 w-full rounded-xl text-left transition hover:bg-zinc-800/60 focus:outline-none focus:ring-2 focus:ring-brand"
      >
        <p className="text-xl font-medium text-paper">{payload.hook}</p>
        <p className="mt-3 text-sm text-brand">点击查看完整解读与推荐 →</p>
      </button>
    </section>
  );
}
