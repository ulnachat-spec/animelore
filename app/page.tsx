import { Suspense } from "react";
import Link from "next/link";
import { HomeColdSection } from "@/components/home-cold-section";
import { SearchBox } from "@/components/search-box";

export const dynamic = "force-dynamic";

function ColdHookFallback() {
  return (
    <section
      className="mt-12 w-full rounded-2xl border border-zinc-700 bg-zinc-900/40 p-6"
      aria-busy="true"
      aria-label="今日冷知识加载中"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
        <span>今日冷知识</span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">加载中</span>
      </div>
      <p className="mt-4 text-sm text-zinc-400">
        正在拉取冷知识（含外源与模型），首屏标题与搜索框已可用；若网络较慢请稍候。
      </p>
      <div className="mt-4 space-y-2">
        <div className="h-6 w-3/4 max-w-md animate-pulse rounded-lg bg-zinc-800/80" />
        <div className="h-6 w-1/2 max-w-sm animate-pulse rounded-lg bg-zinc-800/60" />
      </div>
    </section>
  );
}

export default function HomePage({
  searchParams
}: {
  searchParams?: { refreshHook?: string | string[] };
}) {
  const refreshHook =
    searchParams?.refreshHook === "1" ||
    (Array.isArray(searchParams?.refreshHook) && searchParams.refreshHook[0] === "1");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 py-20">
      <h1 className="text-4xl font-bold md:text-5xl">AnimeLore / 作品图鉴</h1>
      <p className="mt-3 text-zinc-300">不是百科词条，而是资深同好的安利现场。</p>

      <div className="mt-10 w-full">
        <SearchBox />
      </div>

      <Suspense fallback={<ColdHookFallback />}>
        <HomeColdSection refreshHook={refreshHook} />
      </Suspense>

      <Link
        href="/roam"
        className="mt-4 w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 p-6 transition hover:border-brand/70 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">知识漫游</p>
            <p className="mt-2 text-xl font-medium text-paper">刷一条二次元冷知识</p>
          </div>
          <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white">
            开始 →
          </span>
        </div>
      </Link>
    </main>
  );
}
