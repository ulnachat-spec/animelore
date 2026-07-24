export function CommunityRecsSkeleton() {
  return (
    <section
      className="mt-10 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5"
      aria-busy="true"
      aria-label="正在加载中文社区考据"
    >
      <div className="h-4 w-40 animate-pulse rounded bg-zinc-800" />
      <div className="mt-4 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2 border-b border-zinc-800 pb-3 last:border-0">
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-full animate-pulse rounded bg-zinc-800/70" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-zinc-500" role="status">
        正在加载中文社区考据…
      </p>
    </section>
  );
}
