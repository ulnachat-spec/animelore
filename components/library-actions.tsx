"use client";

import { useState } from "react";
import type { LibraryItemInput } from "@/lib/user-library";
import { useUserLibrary } from "@/lib/use-user-library";

export function LibraryActions({
  item,
  compact = false
}: {
  item: LibraryItemInput;
  compact?: boolean;
}) {
  const { library, ready, toggleFavorite, toggleReadLater } = useUserLibrary();
  const [notice, setNotice] = useState("");
  const favorite = library.favorites.some((entry) => entry.id === item.id);
  const later = library.readLater.some((entry) => entry.id === item.id);
  const favoriteLabel =
    item.kind === "work"
      ? favorite
        ? "已收藏作品"
        : "收藏作品"
      : item.kind === "cold"
        ? favorite
          ? "已收藏冷知识"
          : "收藏冷知识"
        : favorite
          ? "已收藏"
          : "收藏";

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1600);
  };

  return (
    <div className="relative flex flex-wrap gap-2" aria-label="书架操作">
      <button
        type="button"
        disabled={!ready}
        aria-pressed={favorite}
        onClick={() => announce(toggleFavorite(item) ? "已收入收藏" : "已移出收藏")}
        className={favorite ? "archive-button-primary" : "archive-button"}
      >
        <span aria-hidden="true">{favorite ? "★" : "☆"}</span>
        {favoriteLabel}
      </button>
      <button
        type="button"
        disabled={!ready}
        aria-pressed={later}
        onClick={() => announce(toggleReadLater(item) ? "已加入稍后阅读" : "已移出稍后阅读")}
        className={later ? "archive-button border-brand/50 text-brand" : "archive-button"}
      >
        <span aria-hidden="true">⌑</span>
        {compact ? "稍后" : later ? "已加入稍后" : "稍后阅读"}
      </button>
      <span
        className={`archive-toast ${notice ? "archive-toast-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice}
      </span>
    </div>
  );
}
