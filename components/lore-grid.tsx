/**
 * Lore card grid with optional regen enter animation.
 * Card footer: source labels link to source_urls (new tab).
 */
"use client";

import { motion } from "framer-motion";
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
    return <div className="mt-3 text-xs text-zinc-500">{source}</div>;
  }

  return (
    <div className="mt-3 text-xs text-zinc-500">
      {viaPrefix ? <span>via </span> : null}
      {links.map((item, i) => (
        <span key={`${item.label}-${i}`}>
          {i > 0 ? <span> {sep} </span> : null}
          {item.href ? (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-zinc-600 underline-offset-2 hover:text-zinc-400"
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

  return (
    <motion.div className="grid gap-4 md:grid-cols-2">
      {cards.map((card, idx) => (
        <motion.article
          key={`${enterBatchKey}-${card.id}`}
          initial={isRegenEnter ? { opacity: 0, y: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            isRegenEnter
              ? { duration: 0.3, delay: idx * 0.1, type: "tween" }
              : { delay: idx * 0.1, type: "spring" }
          }
          className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-5"
        >
          <motion.div className="text-xs text-zinc-400">
            {String(idx + 1).padStart(2, "0")} {"\u00b7"} {card.en_label}
          </motion.div>
          <h3 className="mt-2 text-lg font-semibold">{card.zh_name}</h3>
          <p className="mt-2 text-brand">{card.headline}</p>
          <p className="mt-2 text-sm text-zinc-200">{card.intro}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-300">
            {card.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <CardSourceLine source={card.source} sourceUrls={card.source_urls ?? []} />
        </motion.article>
      ))}
    </motion.div>
  );
}
