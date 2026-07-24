const CARD_KEYS = ["card-a", "card-b", "card-c", "card-d"] as const;

export function SearchBoxSkeleton() {
  return (
    <div
      className="h-[60px] w-full max-w-2xl animate-pulse rounded-2xl border border-line bg-surface"
      aria-hidden
    />
  );
}

export function WorkPageSkeleton({
  query,
  showStatus = true
}: {
  query?: string;
  showStatus?: boolean;
}) {
  const ariaLabel = query?.trim()
    ? `正在加载《${query.trim()}》作品图鉴`
    : "正在加载作品图鉴";

  return (
    <>
      <section
        className="mt-8 flex gap-6 rounded-2xl border border-line bg-surface/85 p-5"
        aria-busy="true"
        aria-label={ariaLabel}
      >
        <CoverSkeleton />
        <TitleBlockSkeleton />
      </section>

      <section className="mt-8" aria-hidden>
        <div className="grid gap-4 md:grid-cols-2">
          {CARD_KEYS.map((key, idx) => (
            <LoreCardSkeleton key={key} variant={idx % 2} />
          ))}
        </div>
      </section>

      {showStatus ? (
        <p className="mt-6 text-center text-sm text-muted" role="status">
          正在检索资料与生成图鉴…
        </p>
      ) : null}
    </>
  );
}

function CoverSkeleton() {
  return (
    <div
      className="h-[250px] w-[180px] shrink-0 animate-pulse rounded-xl bg-soft/90 ring-1 ring-line/80"
      aria-hidden
    />
  );
}

function TitleBlockSkeleton() {
  return (
    <div className="min-w-0 flex-1 space-y-3" aria-hidden>
      <div className="h-9 w-2/3 max-w-md animate-pulse rounded-lg bg-soft" />
      <PulseLine className="h-5 w-1/2 max-w-xs" />
      <PulseLine className="h-4 w-3/5 max-w-sm" />
    </div>
  );
}

function PulseLine({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-soft/80 ${className}`} />;
}

function LoreCardSkeleton({ variant }: { variant: number }) {
  return (
    <article className="rounded-2xl border border-line bg-surface/90 p-5">
      <div className="h-3 w-16 animate-pulse rounded bg-soft" />
      <div className="mt-3 h-5 w-2/5 animate-pulse rounded-lg bg-soft" />
      <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-soft/90" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-soft/70" />
      <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-soft/60" />
      <div className="mt-4 space-y-2">
        <BulletLine width={variant === 0 ? "w-full" : "w-10/12"} />
        <BulletLine width="w-9/12" />
        <BulletLine width="w-4/5" />
      </div>
      <div className="mt-4 h-3 w-24 animate-pulse rounded bg-soft/50" />
    </article>
  );
}

function BulletLine({ width }: { width: string }) {
  return <div className={`h-3 ${width} animate-pulse rounded bg-soft/50`} />;
}
