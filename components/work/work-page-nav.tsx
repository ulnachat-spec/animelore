import Link from "next/link";

export function WorkPageNav({ query }: { query: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/"
        className="text-sm text-zinc-400 transition hover:text-zinc-200"
      >
        ← 返回搜索
      </Link>
      <p className="text-sm text-zinc-500">
        正在查看：<span className="text-zinc-300">{query}</span>
      </p>
    </header>
  );
}
