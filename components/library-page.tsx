"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MeiState } from "@/components/mei-state";
import type { LibraryItem, LibraryItemKind } from "@/lib/user-library";
import { useUserLibrary } from "@/lib/use-user-library";

type ShelfTab = "favorites" | "readLater" | "history";

const tabs: Array<{ id: ShelfTab; label: string }> = [
  { id: "favorites", label: "收藏" },
  { id: "readLater", label: "稍后阅读" },
  { id: "history", label: "历史" }
];

const kindLabels: Record<LibraryItemKind, string> = {
  work: "作品",
  cold: "冷知识",
  card: "档案卡"
};

export function LibraryPage() {
  const { library, ready, update } = useUserLibrary();
  const [tab, setTab] = useState<ShelfTab>("favorites");
  const [kind, setKind] = useState<LibraryItemKind | "all">("all");
  const source = library[tab];
  const items = useMemo(
    () => (kind === "all" ? source : source.filter((item) => item.kind === kind)),
    [kind, source]
  );

  const remove = (id: string) => {
    update({ ...library, [tab]: source.filter((item) => item.id !== id) });
  };

  return (
    <main className="mx-auto min-h-[calc(100svh-4.5rem)] max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <header className="flex items-end justify-between gap-5">
        <div>
          <p className="archive-kicker text-brand">Local bookshelf · 只保存在本机</p>
          <h1 className="archive-title mt-3 text-3xl sm:text-4xl">我的书架</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-body">
            收藏以整部作品档案为主，也可以保留喜欢的冷知识。无需登录，也不会上传浏览记录。
          </p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="font-display text-3xl text-brand">{library.favorites.length}</p>
          <p className="text-xs text-muted">份收藏</p>
        </div>
      </header>

      <div className="mt-7 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition ${
              tab === item.id ? "bg-brand text-white shadow-card" : "text-body hover:bg-soft"
            }`}
          >
            {item.label}
            <span className="ml-1.5 opacity-70">{library[item.id].length}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1" aria-label="内容筛选">
        {(["all", "work", "cold"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            aria-pressed={kind === value}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-medium transition ${
              kind === value
                ? "border-brand bg-brand/10 text-brand"
                : "border-line bg-surface text-body hover:border-brand/40"
            }`}
          >
            {value === "all" ? "全部" : kindLabels[value]}
          </button>
        ))}
      </div>

      {!ready ? (
        <div className="mt-6 h-52 animate-pulse rounded-3xl bg-soft" aria-label="正在读取本地书架" />
      ) : items.length ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ShelfItem key={item.id} item={item} onRemove={() => remove(item.id)} />
          ))}
        </section>
      ) : (
        <div className="mt-6">
          <MeiState
            compact
            eyebrow={tab === "history" ? "还没有浏览足迹" : "这个书格还是空的"}
            title={tab === "favorites" ? "遇到喜欢的内容，就让星标亮起来" : tab === "readLater" ? "先放进来，等有空再慢慢读" : "打开一份作品档案后，足迹会留在这里"}
            description="芽衣会把它们安静地整理在本机，不需要注册账号。"
          >
            <Link href={tab === "history" ? "/" : "/roam"} className="archive-button-primary">
              {tab === "history" ? "去找一部作品" : "去漫游发现"}
            </Link>
          </MeiState>
        </div>
      )}
    </main>
  );
}

function ShelfItem({ item, onRemove }: { item: LibraryItem; onRemove: () => void }) {
  return (
    <article className="archive-card group flex min-h-36 gap-4 p-4">
      {item.image ? (
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-soft">
          <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />
        </div>
      ) : (
        <div className="grid h-20 w-16 shrink-0 place-items-center rounded-xl bg-brand/10 font-display text-2xl text-brand">
          {item.kind === "work" ? "册" : item.kind === "cold" ? "知" : "卡"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="archive-kicker">{kindLabels[item.kind]}</p>
        <h2 className="mt-2 line-clamp-2 font-display text-lg font-semibold leading-6 text-ink">
          <Link href={item.href} className="hover:text-brand">
            {item.title}
          </Link>
        </h2>
        {item.subtitle ? <p className="mt-1 line-clamp-1 text-xs text-muted">{item.subtitle}</p> : null}
        <div className="mt-4 flex items-center justify-between gap-3">
          <Link href={item.href} className="text-xs font-medium text-brand">
            打开档案 →
          </Link>
          <button
            type="button"
            onClick={onRemove}
            className="min-h-10 rounded-lg px-2 text-xs text-muted hover:bg-soft hover:text-ink"
            aria-label={`移除 ${item.title}`}
          >
            移除
          </button>
        </div>
      </div>
    </article>
  );
}
