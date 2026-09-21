export function RelatedWorksSkeleton() {
  return (
    <section
      className="mt-10 rounded-2xl border border-line bg-surface/85 p-5"
      aria-busy="true"
      aria-label="正在加载相关推荐"
    >
      <div className="h-3 w-36 animate-pulse rounded bg-soft" />
      <RelatedRowsPlaceholder />
      <p className="mt-4 text-xs text-muted" role="status">
        正在加载相关推荐…
      </p>
    </section>
  );
}

function RelatedRowsPlaceholder() {
  return (
    <div className="mt-5 space-y-5">
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="h-[102px] w-[72px] shrink-0 animate-pulse rounded-lg bg-soft" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-2/3 animate-pulse rounded bg-soft" />
            <div className="h-3 w-24 animate-pulse rounded bg-soft/70" />
            <div className="h-4 w-full animate-pulse rounded bg-soft/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
