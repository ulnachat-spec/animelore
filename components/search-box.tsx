"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  const [q, setQ] = useState(defaultValue);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    startTransition(() => {
      router.push(`/work/${encodeURIComponent(trimmed)}`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="w-full max-w-2xl">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="输入一部作品，发现它不为人知的另一面"
        className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-lg outline-none focus:border-brand"
      />
    </form>
  );
}
