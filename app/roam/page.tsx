import Link from "next/link";
import { RoamCardDeck } from "@/components/roam/RoamCardDeck";
import { getRoamCards } from "@/lib/roam/roam-service";

export const dynamic = "force-dynamic";

export default async function RoamPage() {
  const { cards } = await getRoamCards({ count: 8 });

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-200">
          ← 返回首页
        </Link>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          轻量短内容
        </span>
      </header>

      <section className="mt-8">
        <p className="text-sm text-brand">AnimeLore Roam</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-paper">知识漫游</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
          连续刷二次元冷知识、梗、幕后、概念和社区现象。短一点，轻一点，刷到感兴趣的就点进去。
        </p>
      </section>

      <RoamCardDeck initialCards={cards} />
    </main>
  );
}
