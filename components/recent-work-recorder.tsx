"use client";

import { useEffect } from "react";
import { recordLibraryHistory } from "@/lib/user-library-client";

export function RecentWorkRecorder({ title }: { title: string }) {
  useEffect(() => {
    recordLibraryHistory({
      id: `work:${title}`,
      kind: "work",
      title,
      href: `/work/${encodeURIComponent(title)}`
    });
  }, [title]);

  return null;
}
