"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const clicks = useRef<number[]>([]);
  const [burst, setBurst] = useState(0);
  const [message, setMessage] = useState("");

  const discover = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((time) => now - time < 1800), now];
    if (clicks.current.length < 5) return;
    clicks.current = [];
    setBurst((value) => value + 1);
    setMessage("芽衣发现了五连星书签");
    window.setTimeout(() => setMessage(""), 2200);
  };

  return (
    <div className="relative">
      <Link
        href="/"
        onClick={discover}
        className="group inline-flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-none"
        aria-label="AnimeLore 首页"
      >
        <span className="relative grid size-10 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand transition group-hover:-rotate-2 group-hover:border-brand/60">
          <svg viewBox="0 0 40 40" className="size-7" aria-hidden="true">
            <path
              d="M9 9.5c4.6-1.1 8.2-.2 11 2.7 2.8-2.9 6.4-3.8 11-2.7v20c-4.7-1.1-8.3-.2-11 2.6-2.7-2.8-6.3-3.7-11-2.6v-20Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M20 12.2v19.2" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="m27.5 13.5 1.05 2.15 2.37.34-1.71 1.67.4 2.35-2.11-1.11-2.12 1.11.41-2.35-1.71-1.67 2.36-.34 1.06-2.15Z"
              fill="currentColor"
            />
          </svg>
          {burst ? (
            <span key={burst} className="mei-star-burst" aria-hidden="true">
              <i>★</i><i>✦</i><i>★</i><i>✧</i><i>★</i>
            </span>
          ) : null}
        </span>
        {compact ? null : (
          <span className="leading-none">
            <span className="block font-display text-xl font-semibold tracking-tight text-ink">
              AnimeLore
            </span>
            <span className="mt-1 block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted">
              Animation archive
            </span>
          </span>
        )}
      </Link>
      <span className="sr-only" role="status" aria-live="polite">{message}</span>
    </div>
  );
}
