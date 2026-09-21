export function CommunityRecsSkeleton() {
  return (
    <section
      className="mt-10 rounded-2xl border border-line bg-surface/85 p-5"
      aria-busy="true"
      aria-label="正在加载中文社区考据"
    >
      <div className="h-4 w-40 animate-pulse rounded bg-soft" />
      <div className="mt-4 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2 border-b border-line/70 pb-3 last:border-0">
            <div className="h-4 w-3/4 animate-pulse rounded bg-soft" />
            <div className="h-3 w-full animate-pulse rounded bg-soft/70" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted" role="status">
        正在加载中文社区考据…
      </p>
    </section>
  );
}
