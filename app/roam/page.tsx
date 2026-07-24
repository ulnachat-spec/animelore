import Link from "next/link";
import Image from "next/image";
import { RoamCardDeck } from "@/components/roam/RoamCardDeck";
import { getRoamCards } from "@/lib/roam/roam-service";

export const dynamic = "force-dynamic";

export default async function RoamPage() {
  const { cards } = await getRoamCards({ count: 8 });

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-muted transition hover:text-ink">
          ← 返回首页
        </Link>
        <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
          轻量短内容
        </span>
      </header>

      <section className="mt-8 flex items-start gap-4 sm:items-center">
        <Image
          src="/brand/mei-avatar-v1.png"
          alt=""
          width={72}
          height={72}
          className="size-16 shrink-0 rounded-2xl border border-brand/20 object-cover shadow-card sm:size-[72px]"
        />
        <div>
          <p className="archive-kicker text-brand">AnimeLore Roam</p>
          <h1 className="archive-title mt-2 text-4xl sm:text-5xl">知识漫游</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-body">
            左滑略过，右滑深入。芽衣会根据你的选择，悄悄调整下一叠档案。
          </p>
        </div>
      </section>

      <RoamCardDeck initialCards={cards} />
    </main>
  );
}
