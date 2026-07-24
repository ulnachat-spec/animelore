"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isWorkTitleSameAsPage } from "@/lib/work-rec-utils";
import type { LorePayload } from "@/lib/types";

type PageContext = { title: string; nativeTitle?: string; urlQuery: string };

function llmBlockHasVisibleContent(
  bottomHook: LorePayload["bottom_hook"] | undefined,
  ctx: PageContext
): boolean {
  if (!bottomHook) return false;
  if (bottomHook.hook?.trim()) return true;
  const w = bottomHook.work?.trim();
  if (!w) return false;
  return !isWorkTitleSameAsPage(w, { title: ctx.title, nativeTitle: ctx.nativeTitle }, ctx.urlQuery);
}

function HookWithLink({ hookRaw, hookWork }: { hookRaw: string; hookWork: string }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const coverFetchGen = useRef(0);

  useEffect(() => {
    setCoverUrl(null);
    const generation = ++coverFetchGen.current;
    const qs = new URLSearchParams({ title: hookWork }).toString();

    fetch(`/api/anilist-cover?${qs}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { coverUrl?: string } | null) => {
        if (generation !== coverFetchGen.current) return;
        setCoverUrl(data?.coverUrl ?? null);
      })
      .catch(() => {
        if (generation !== coverFetchGen.current) return;
        setCoverUrl(null);
      });
  }, [hookWork]);

  return (
    <div className="mt-3 flex items-start gap-3">
      <div className="h-[68px] w-[48px] shrink-0 overflow-hidden rounded-[4px] bg-zinc-800/60">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`《${hookWork}》封面`}
            width={48}
            height={68}
            className="h-[68px] w-[48px] object-cover"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {hookRaw ? <p className="text-sm leading-relaxed text-zinc-50">{hookRaw}</p> : null}
        <Link
          href={`/work/${encodeURIComponent(hookWork)}`}
          className="text-lg font-bold text-brand hover:underline"
        >
          去看《{hookWork}》→
        </Link>
      </div>
    </div>
  );
}

export function WorkBottomHookPanel({
  bottomHook,
  pageContext
}: {
  bottomHook?: LorePayload["bottom_hook"];
  pageContext: PageContext;
}) {
  if (!llmBlockHasVisibleContent(bottomHook, pageContext) || !bottomHook) return null;

  const hookWork = bottomHook.work?.trim() ?? "";
  const showLlmLink =
    hookWork.length > 0 &&
    !isWorkTitleSameAsPage(
      hookWork,
      { title: pageContext.title, nativeTitle: pageContext.nativeTitle },
      pageContext.urlQuery
    );
  const hookRaw = bottomHook.hook?.trim() ?? "";

  return (
    <section className="mt-10 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-400">看完这部，你知道吗……</p>
      {showLlmLink && hookWork ? (
        <HookWithLink hookRaw={hookRaw} hookWork={hookWork} />
      ) : hookRaw ? (
        <p className="mt-3 text-sm leading-relaxed text-zinc-50">{hookRaw}</p>
      ) : null}
    </section>
  );
}
