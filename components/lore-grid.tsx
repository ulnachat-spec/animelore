/**
 * Lore card grid with optional regen enter animation.
 * Card footer: source labels link to source_urls (new tab).
 */
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LoreCard } from "@/lib/types";

function validHttpUrls(urls: string[] | undefined): string[] {
  return (urls ?? [])
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http://") || u.startsWith("https://"));
}

function parseSourceLabels(source: string): { viaPrefix: boolean; labels: string[] } {
  const trimmed = source.trim();
  if (!trimmed) return { viaPrefix: false, labels: [] };
  const viaPrefix = /^via\s+/i.test(trimmed);
  const body = viaPrefix ? trimmed.replace(/^via\s+/i, "").trim() : trimmed;
  const labels = body
    .split(/\s*[\u00b7\u2022|]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { viaPrefix, labels };
}

function urlForLabel(label: string, urls: string[]): string | null {
  const needle = label.toLowerCase();
  for (const u of urls) {
    try {
      const host = new URL(u).hostname.toLowerCase();
      if (needle.includes("anilist") && host.includes("anilist")) return u;
      if (needle.includes("wikipedia") && host.includes("wikipedia")) return u;
      if (needle.includes("moegirl") && host.includes("moegirl")) return u;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function resolveSourceLinks(
  source: string,
  urls: string[]
): { label: string; href: string | null }[] {
  const { labels } = parseSourceLabels(source);
  if (labels.length === 0) return [];

  return labels.map((label, i) => {
    const byDomain = urlForLabel(label, urls);
    const byIndex = labels.length === urls.length ? urls[i] : null;
    const href = byDomain ?? byIndex ?? null;
    return { label, href };
  });
}

function CardSourceLine({ source, sourceUrls }: { source: string; sourceUrls: string[] }) {
  const urls = validHttpUrls(sourceUrls);
  const { viaPrefix } = parseSourceLabels(source);
  const links = resolveSourceLinks(source, urls);
  const sep = "\u00b7";

  if (!source.trim()) return null;

  if (links.length === 0) {
    return <div className="mt-3 text-xs text-muted">{source}</div>;
  }

  return (
    <div className="mt-3 text-xs text-muted">
      {viaPrefix ? <span>via </span> : null}
      {links.map((item, i) => (
        <span key={`${item.label}-${i}`}>
          {i > 0 ? <span> {sep} </span> : null}
          {item.href ? (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-line underline-offset-2 hover:text-muted"
            >
              {item.label}
            </a>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function LoreGrid({
  cards,
  enterBatchKey = 0
}: {
  cards: LoreCard[];
  enterBatchKey?: number;
}) {
  const isRegenEnter = enterBatchKey > 0;
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [enterBatchKey]);

  const current = cards[active] ?? cards[0];

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2 md:hidden" role="tablist" aria-label="档案索引">
        {cards.map((card, index) => (
          <button
            key={card.id}
            type="button"
            role="tab"
            aria-selected={active === index}
            onClick={() => setActive(index)}
            className={`relative min-h-[4.5rem] overflow-hidden rounded-xl border p-3 text-left transition ${
              active === index
                ? "border-brand bg-brand/10"
                : "border-line bg-surface text-body"
            }`}
          >
            <span className="font-mono text-[0.62rem] tracking-wider text-muted">
              {String(index + 1).padStart(2, "0")} · {card.en_label}
            </span>
            <span className="mt-1 block text-sm font-semibold text-ink">{card.zh_name}</span>
            {active === index ? (
              <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-brand" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="md:hidden">
        <AnimatePresence mode="wait">
          {current ? (
            <LoreArticle
              key={`${enterBatchKey}-${current.id}`}
              card={current}
              index={active}
              mobile
            />
          ) : null}
        </AnimatePresence>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
          {cards.map((card, index) => (
            <span
              key={card.id}
              className={`h-1.5 rounded-full transition-all ${
                active === index ? "w-6 bg-brand" : "w-1.5 bg-line"
              }`}
            />
          ))}
        </div>
      </div>

      <motion.div className="hidden gap-4 md:grid md:grid-cols-2">
        {cards.map((card, idx) => (
          <LoreArticle
            key={`${enterBatchKey}-${card.id}`}
            card={card}
            index={idx}
            isRegenEnter={isRegenEnter}
          />
        ))}
      </motion.div>
    </>
  );
}

function LoreArticle({
  card,
  index,
  isRegenEnter = false,
  mobile = false
}: {
  card: LoreCard;
  index: number;
  isRegenEnter?: boolean;
  mobile?: boolean;
}) {
  const tone: Record<LoreCard["id"], string> = {
    legacy: "before:bg-brand",
    meme: "before:bg-gold",
    behind: "before:bg-sage",
    lineage: "before:bg-plum"
  };
  return (
    <motion.article
      initial={mobile ? { opacity: 0, x: 28 } : isRegenEnter ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={mobile ? { opacity: 0, x: -22 } : undefined}
      transition={mobile ? { duration: 0.22 } : { duration: 0.3, delay: index * 0.08 }}
      className={`archive-card relative overflow-hidden p-5 before:absolute before:inset-x-0 before:top-0 before:h-1 sm:p-6 ${tone[card.id]}`}
    >
      <div className="archive-kicker">
        {String(index + 1).padStart(2, "0")} {"\u00b7"} {card.en_label}
      </div>
      <h3 className="archive-title mt-3 text-xl">{card.zh_name}</h3>
      <p className="mt-4 font-display text-lg leading-7 text-brand">{card.headline}</p>
      <p className="mt-4 text-sm leading-7 text-body">{card.intro}</p>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-body">
        {(mobile ? card.points.slice(0, 2) : card.points).map((point) => (
          <li key={point} className="flex gap-2.5">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      {mobile && card.points.length > 2 ? (
        <details className="archive-disclosure mt-3">
          <summary>展开其余 {card.points.length - 2} 条</summary>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-body">
            {card.points.slice(2).map((point) => (
              <li key={point} className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <CardSourceLine source={card.source} sourceUrls={card.source_urls ?? []} />
    </motion.article>
  );
}
