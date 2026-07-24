"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RecentWork = { title: string; at: string };

const randomWorks = [
  "星际牛仔",
  "魔法少女小圆",
  "攻壳机动队 SAC",
  "命运石之门",
  "钢之炼金术师 FULLMETAL ALCHEMIST",
  "来自深渊"
];

export function HomeDiscovery() {
  const router = useRouter();
  const [recent, setRecent] = useState<RecentWork[]>([]);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("animelore.recent-works.v1");
      setRecent(raw ? (JSON.parse(raw) as RecentWork[]).slice(0, 3) : []);
    } catch {
      setRecent([]);
    }
  }, []);

  const openRandom = () => {
    if (rolling) return;
    setRolling(true);
    const pick = randomWorks[Math.floor(Math.random() * randomWorks.length)];
    window.setTimeout(() => router.push(`/work/${encodeURIComponent(pick)}`), 420);
  };

  return (
    <section className="archive-card flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="archive-kicker">知识漫游 · Roam</p>
          <h2 className="archive-title mt-3 text-2xl">不知道搜什么？</h2>
        </div>
        <button
          type="button"
          onClick={openRandom}
          className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-xl text-white shadow-card transition hover:bg-brand-strong ${
            rolling ? "rotate-180 scale-90" : "hover:rotate-6"
          }`}
          aria-label="随机打开一份作品档案"
        >
          ✦
        </button>
      </div>
      <p className="mt-4 text-sm leading-7 text-body">
        随机抽一份作品档案，或者进入漫游卡组，顺着一个梗找到下一部作品。
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/roam" className="archive-button-primary">
          开始漫游 <span aria-hidden="true">→</span>
        </Link>
        <button type="button" onClick={openRandom} className="archive-button">
          随机档案
        </button>
      </div>

      <div className="mt-auto pt-7">
        <div className="mb-3 flex items-center justify-between">
          <p className="archive-kicker">最近打开</p>
          <span className="text-xs text-muted">仅保存在本机</span>
        </div>
        {recent.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recent.map((item) => (
              <Link
                key={item.title}
                href={`/work/${encodeURIComponent(item.title)}`}
                className="min-h-10 shrink-0 rounded-full border border-line bg-canvas px-3.5 py-2 text-xs font-medium text-body transition hover:border-brand/50 hover:text-brand"
              >
                {item.title}
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
            搜索过的作品会安静地留在这里。
          </p>
        )}
      </div>
    </section>
  );
}
