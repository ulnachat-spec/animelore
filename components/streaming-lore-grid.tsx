"use client";

import { LORE_CARD_ORDER, LORE_CARD_META } from "@/lib/lore-card-meta";
import type { LoreCard, LoreCardId } from "@/lib/types";

export type StreamingCardState = {
  id: LoreCardId;
  en_label: string;
  zh_name: string;
  headline: string;
  intro: string;
  points: string[];
  started: boolean;
  done: boolean;
  finalCard?: LoreCard;
};

export function emptyStreamingCards(): StreamingCardState[] {
  return LORE_CARD_ORDER.map((id) => ({
    id,
    ...LORE_CARD_META[id],
    headline: "",
    intro: "",
    points: ["", "", ""],
    started: false,
    done: false
  }));
}

function StreamCursor({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-zinc-400 align-middle" />
  );
}

export function StreamingLoreGrid({ cards }: { cards: StreamingCardState[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card, idx) => {
        const isStreaming = card.started && !card.done;
        const headline = isStreaming ? card.headline : (card.finalCard?.headline ?? card.headline);
        const intro = isStreaming ? card.intro : (card.finalCard?.intro ?? card.intro);
        const points = isStreaming ? card.points : (card.finalCard?.points ?? card.points);
        const showCursor = isStreaming;
        const activePoints = points.filter((p) => p.length > 0);
        const showPoints = isStreaming || activePoints.length > 0;

        return (
          <article
            key={card.id}
            className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-5"
          >
            <CardIndexLabel idx={idx} enLabel={card.en_label} />
            <h3 className="mt-2 text-lg font-semibold">{card.zh_name}</h3>
            {card.started ? (
              <>
                {(headline || isStreaming) && (
                  <p className="mt-2 min-h-[1.25rem] text-brand">
                    {headline}
                    <StreamCursor show={showCursor && !headline} />
                  </p>
                )}
                {(intro || headline || isStreaming) && (
                  <p className="mt-2 min-h-[1.25rem] text-sm text-zinc-200">
                    {intro}
                    <StreamCursor show={showCursor && Boolean(headline) && !intro} />
                  </p>
                )}
                {showPoints ? (
                  <ul className="mt-3 min-h-[1rem] list-disc space-y-1 pl-5 text-sm text-zinc-300">
                    {(activePoints.length ? activePoints : isStreaming ? [""] : []).map(
                      (point, pi) => (
                        <li key={`${card.id}-p-${pi}`}>
                          {point}
                          <StreamCursor
                            show={
                              showCursor &&
                              pi === (activePoints.length || 1) - 1
                            }
                          />
                        </li>
                      )
                    )}
                  </ul>
                ) : null}
                {card.done && card.finalCard?.source ? (
                  <div className="mt-3 text-xs text-zinc-500">{card.finalCard.source}</div>
                ) : null}
              </>
            ) : (
              <CardSkeleton />
            )}
          </article>
        );
      })}
    </div>
  );
}

function CardIndexLabel({ idx, enLabel }: { idx: number; enLabel: string }) {
  return (
    <div className="text-xs text-zinc-400">
      {String(idx + 1).padStart(2, "0")} {"\u00b7"} {enLabel}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="mt-4 space-y-2" aria-hidden>
      <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
      <div className="h-4 w-full animate-pulse rounded bg-zinc-800/70" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-800/50" />
    </div>
  );
}
