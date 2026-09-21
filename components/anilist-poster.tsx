"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function AniListPoster({
  title,
  initialSrc,
  className = "object-cover",
  sizes = "85px"
}: {
  title: string;
  initialSrc?: string;
  className?: string;
  sizes?: string;
}) {
  const [src, setSrc] = useState(initialSrc || "");

  useEffect(() => {
    if (src || !title) return;
    const controller = new AbortController();
    void fetch(`/api/anilist-cover?title=${encodeURIComponent(title)}`, {
      signal: controller.signal
    })
      .then((response) => response.json() as Promise<{ coverUrl?: string }>)
      .then((data) => setSrc(data.coverUrl || ""))
      .catch(() => undefined);
    return () => controller.abort();
  }, [src, title]);

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/15 via-gold/10 to-sage/15 px-2 text-center text-[10px] leading-4 text-muted">
        海报待取
      </div>
    );
  }

  return <Image src={src} alt={`${title} 海报`} fill className={className} sizes={sizes} />;
}
