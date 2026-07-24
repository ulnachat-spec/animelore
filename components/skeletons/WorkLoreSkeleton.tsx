const CARD_KEYS = ["card-a", "card-b", "card-c", "card-d"] as const;

export function WorkLoreSkeleton() {
  return (
    <div aria-busy="true" aria-label="正在生成作品图鉴">
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
