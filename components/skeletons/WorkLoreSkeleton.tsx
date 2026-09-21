const CARD_KEYS = ["card-a", "card-b", "card-c", "card-d"] as const;

export function WorkLoreSkeleton() {
  return (
    <div aria-busy="true" aria-label="正在生成作品图鉴">
      <div className="mt-7 flex items-center gap-4 rounded-2xl border border-brand/20 bg-brand/[0.045] px-4 py-3 shadow-sm" role="status">
        <span className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-brand/25 bg-surface">
          <Image src="/brand/mei-avatar-v1.png" alt="芽衣" fill sizes="48px" className="object-cover motion-safe:animate-pulse" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">芽衣正在核对这部作品的四份档案</p>
          <p className="mt-1 text-xs leading-5 text-muted">海报与标题确认后，资料卡会逐张出现；宁可多核对一下，也不会拿别的作品来填空。</p>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-soft">
            <span className="block h-full w-2/5 animate-[loading-bar_1.6s_ease-in-out_infinite] rounded-full bg-brand" />
          </span>
        </div>
      </div>
      <section className="mt-8" aria-hidden>
        <div className="grid gap-4 md:grid-cols-2">
          {CARD_KEYS.map((key, idx) => (
            <LoreCardSkeleton key={key} variant={idx % 2} />
          ))}
        </div>
      </section>
      <p className="mt-6 text-center text-sm text-muted" role="status">
        正在检索资料与生成图鉴…
      </p>
    </div>
  );
}

function LoreCardSkeleton({ variant }: { variant: number }) {
  const bulletWidth = variant === 0 ? "w-full" : "w-10/12";
  return (
    <article className="rounded-2xl border border-line bg-surface/90 p-5">
      <div className="h-3 w-16 animate-pulse rounded bg-soft" />
      <div className="mt-3 h-5 w-2/5 animate-pulse rounded-lg bg-soft" />
      <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-soft/90" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-soft/70" />
      <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-soft/60" />
      <div className="mt-4 space-y-2">
        <div className={`h-3 ${bulletWidth} animate-pulse rounded bg-soft/50`} />
        <div className="h-3 w-9/12 animate-pulse rounded bg-soft/50" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-soft/50" />
      </div>
      <div className="mt-4 h-3 w-24 animate-pulse rounded bg-soft/50" />
    </article>
  );
}
import Image from "next/image";
