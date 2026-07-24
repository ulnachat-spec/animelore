export function RelatedWorksSkeleton() {
  return (
    <section
      className="mt-10 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5"
      aria-busy="true"
      aria-label="正在加载相关推荐"
    >
      <div className="h-3 w-36 animate-pulse rounded bg-zinc-800" />
      <RelatedRowsPlaceholder />
      <p className="mt-4 text-xs text-zinc-500" role="status">
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
          <div className="h-[102px] w-[72px] shrink-0 animate-pulse rounded-lg bg-zinc-800" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-800/70" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
