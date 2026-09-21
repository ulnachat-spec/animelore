"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Suggestion = {
  title: string;
  nativeTitle?: string;
  coverImage?: string;
  seasonYear?: number;
  query: string;
  reason: string;
};

export function WorkSearchSuggestions({ query }: { query: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/work/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { suggestions?: Suggestion[] } | null) => setSuggestions(data?.suggestions || []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [query]);

  if (suggestions.length === 0) return null;

  return (
    <aside className="relative mt-5 rounded-xl border border-gold/35 bg-gold/5 p-3" aria-label="作品检索建议">
      <p className="archive-kicker text-ink">你想找的或许是</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <Link
            key={`${item.query}-${item.title}`}
            href={`/work/${encodeURIComponent(item.query)}`}
            className="group flex min-h-12 max-w-full items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5 text-left transition hover:border-brand/50 hover:bg-brand/5"
          >
            {item.coverImage ? (
              <Image src={item.coverImage} alt="" width={30} height={42} className="h-[42px] w-[30px] rounded object-cover" />
            ) : null}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink group-hover:text-brand">{item.title}</span>
              <span className="block truncate text-xs text-muted">
                {[item.nativeTitle, item.seasonYear].filter(Boolean).join(" · ") || item.reason}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
