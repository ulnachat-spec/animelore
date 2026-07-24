"use client";

import { useEffect } from "react";

export function RecentWorkRecorder({ title }: { title: string }) {
  useEffect(() => {
    try {
      const key = "animelore.recent-works.v1";
      const raw = localStorage.getItem(key);
      const current = raw ? (JSON.parse(raw) as { title: string; at: string }[]) : [];
      const next = [
        { title, at: new Date().toISOString() },
        ...current.filter((item) => item.title !== title)
      ].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Optional local-only history.
    }
  }, [title]);

  return null;
}
