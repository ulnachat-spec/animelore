export function WorkHeroSkeleton() {
  return (
    <section
      className="mt-8 flex gap-6 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5"
      aria-busy="true"
      aria-label="正在加载作品信息"
    >
      <div
        className="h-[250px] w-[180px] shrink-0 animate-pulse rounded-xl bg-zinc-800/90 ring-1 ring-zinc-700/80"
        aria-hidden
      />
      <TitleBlockPlaceholder />
    </section>
  );
}

function TitleBlockPlaceholder() {
  return (
    <div className="min-w-0 flex-1 space-y-3" aria-hidden>
      <div className="h-9 w-2/3 max-w-md animate-pulse rounded-lg bg-zinc-800" />
      <div className="h-5 w-1/2 max-w-xs animate-pulse rounded-lg bg-zinc-800/80" />
      <div className="h-4 w-3/5 max-w-sm animate-pulse rounded-lg bg-zinc-800/80" />
    </div>
  );
}
