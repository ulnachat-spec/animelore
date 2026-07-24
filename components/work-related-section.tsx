"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isWorkTitleSameAsPage } from "@/lib/work-rec-utils";
import { CommunityArticleRecs } from "@/components/CommunityArticleRecs";
import type { CommunityArticleRec, LorePayload, WorkRelatedRec } from "@/lib/types";

function formatLabel(f?: string | null): string {
  if (!f) return "—";
  const map: Record<string, string> = {
    TV: "TV",
    MOVIE: "剧场版",
    OVA: "OVA",
    ONA: "ONA",
    SPECIAL: "SP",
    MUSIC: "音乐",
    MANGA: "漫画",
    NOVEL: "小说",
    ONE_SHOT: "短篇"
  };
  return map[f] || f;
}

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

/**
 * 作品页底部：优先 LLM「看完这部…」叙事（大字推荐语 + 外链）；下方可选展示 AniList 可核对条目。
 */
function SectionLoadingLine({ label }: { label: string }) {
  return (
    <p className="mt-4 animate-pulse text-xs text-zinc-500" role="status">
      {label}
    </p>
  );
}

export function WorkRelatedSection({
  recs,
  bottomHook,
  communityRecs,
  pageContext,
  communityLoading = false,
  relatedLoading = false
}: {
  recs: WorkRelatedRec[];
  bottomHook?: LorePayload["bottom_hook"];
  communityRecs?: CommunityArticleRec[];
  pageContext: PageContext;
  communityLoading?: boolean;
  relatedLoading?: boolean;
}) {
  const showLlm = llmBlockHasVisibleContent(bottomHook, pageContext);
  const showCommunity = (communityRecs?.length ?? 0) > 0;
  const showList = recs.length > 0;
  const showCommunityPending = communityLoading && !showCommunity;
  const showRelatedPending = relatedLoading && !showList;

  /** 底部 Hook 外链唯一数据源：始终来自当前 props 的 bottom_hook.work */
  const hookWork = bottomHook?.work?.trim() ?? "";
  const showLlmLink =
    hookWork.length > 0 &&
    !isWorkTitleSameAsPage(
      hookWork,
      { title: pageContext.title, nativeTitle: pageContext.nativeTitle },
      pageContext.urlQuery
    );

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const coverFetchGen = useRef(0);

  useEffect(() => {
    setCoverUrl(null);

    if (!showLlmLink || !hookWork) {
      return;
    }

    const generation = ++coverFetchGen.current;
    const titleForCover = bottomHook?.work?.trim() ?? "";
    if (!titleForCover) return;

    const qs = new URLSearchParams({ title: titleForCover }).toString();

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
  }, [showLlmLink, hookWork, bottomHook?.work, bottomHook]);

  if (!showLlm && !showCommunity && !showList && !showCommunityPending && !showRelatedPending) {
    return null;
  }

  const hookRaw = bottomHook?.hook?.trim() ?? "";

  return (
    <section className="mt-10 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-400">看完这部，你知道吗……</p>

      {showLlm && bottomHook ? (
        showLlmLink && hookWork ? (
          <div className="mt-3 flex gap-3 items-start">
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
                key={hookWork}
                href={`/work/${encodeURIComponent(hookWork)}`}
                className="text-lg font-bold text-brand hover:underline"
              >
                去看《{hookWork}》→
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {hookRaw ? <p className="text-sm leading-relaxed text-zinc-50">{hookRaw}</p> : null}
          </div>
        )
      ) : null}

      {showCommunity && communityRecs ? (
        <CommunityArticleRecs recs={communityRecs} showDivider={showLlm} />
      ) : null}
      {showCommunityPending ? (
        <SectionLoadingLine label="正在加载中文社区考据…" />
      ) : null}

      {showList ? (
        <div className={showLlm || showCommunity ? "mt-6 border-t border-zinc-800 pt-5" : "mt-5"}>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            相关条目（AniList，可核对）
          </p>
          <ul className="space-y-5">
            {recs.map((r) => (
              <li
                key={r.anilistId}
                className="flex gap-4 border-b border-zinc-800 pb-5 last:border-0 last:pb-0"
              >
                {r.coverImage ? (
                  <Image
                    src={r.coverImage}
                    alt={r.displayTitle}
                    width={72}
                    height={102}
                    className="h-[102px] w-[72px] shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-[102px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-500">
                    无封面
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-100">{r.displayTitle}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {r.seasonYear ?? "—"} · {formatLabel(r.format)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{r.reason}</p>
                  <Link
                    href={`/work/${encodeURIComponent(r.searchQuery)}`}
                    className="mt-2 inline-block text-sm text-brand hover:underline"
                  >
                    去看《{r.displayTitle}》 →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {showRelatedPending ? <SectionLoadingLine label="正在加载相关推荐…" /> : null}
    </section>
  );
}
