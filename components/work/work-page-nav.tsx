import Link from "next/link";

export function WorkPageNav({ query }: { query: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/"
        className="text-sm text-muted transition hover:text-ink"
      >
        ← 返回搜索
      </Link>
      <p className="text-sm text-muted">
        正在查看：<span className="text-body">{query}</span>
      </p>
    </header>
  );
}
