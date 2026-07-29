"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { recordLibraryHistory } from "@/lib/user-library-client";

const suggestions = ["新世纪福音战士", "葬送的芙莉莲", "孤独摇滚！"];

function rememberSearch(title: string) {
  recordLibraryHistory({
    id: `work:${title}`,
    kind: "work",
    title,
    href: `/work/${encodeURIComponent(title)}`
  });
}

export function SearchBox({
  defaultValue = "",
  showSuggestions = false
}: {
  defaultValue?: string;
  showSuggestions?: boolean;
}) {
  const [q, setQ] = useState(defaultValue);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const openWork = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    rememberSearch(trimmed);
    startTransition(() => router.push(`/work/${encodeURIComponent(trimmed)}`));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    openWork(q);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={onSubmit}
        className="flex w-full items-center rounded-2xl border border-line bg-elevated p-1.5 shadow-card transition focus-within:border-brand/70 focus-within:ring-4 focus-within:ring-brand/10"
      >
        <svg
          viewBox="0 0 24 24"
          className="ml-3 size-5 shrink-0 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          id="work-search"
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="输入作品名，例如 EVA、芙莉莲…"
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-ink outline-none placeholder:text-muted sm:text-lg"
          aria-label="搜索动画作品"
        />
        <button
          type="submit"
          disabled={pending || !q.trim()}
          className="archive-button-primary shrink-0 px-4 sm:px-5"
        >
          <span className="hidden sm:inline">{pending ? "翻找中" : "打开档案"}</span>
          <span className="sm:hidden" aria-hidden="true">→</span>
        </button>
      </form>

      {showSuggestions ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="archive-kicker mr-1">试着搜索</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQ(suggestion);
                openWork(suggestion);
              }}
              className="min-h-9 rounded-full border border-line bg-surface px-3 text-xs text-body transition hover:border-brand/50 hover:text-brand"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
