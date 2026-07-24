import Image from "next/image";
import Link from "next/link";
import type { WorkRelatedRec } from "@/lib/types";

function formatLabel(f?: string | null): string {
  if (!f) return "—";
  const map: Record<string, string> = {
    TV: "TV",
    MOVIE: "剧场版",
    OVA: "OVA",
    ONA: "ONA",
    SPECIAL: "SP",
    MUSIC: "音乐",
    MANGA: "漫画",
    NOVEL: "小说",
    ONE_SHOT: "短篇"
  };
  return map[f] || f;
}

export function RelatedWorksList({ recs }: { recs: WorkRelatedRec[] }) {
  if (recs.length === 0) return null;

  return (
    <section className="mt-10 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        相关条目（AniList，可核对）
      </p>
      <ul className="space-y-5">
        {recs.map((r) => (
          <li
            key={r.anilistId}
            className="flex gap-4 border-b border-zinc-800 pb-5 last:border-0 last:pb-0"
          >
            {r.coverImage ? (
              <Image
                src={r.coverImage}
                alt={r.displayTitle}
                width={72}
                height={102}
                className="h-[102px] w-[72px] shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-[102px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-500">
                无封面
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-100">{r.displayTitle}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {r.seasonYear ?? "—"} · {formatLabel(r.format)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{r.reason}</p>
              <Link
                href={`/work/${encodeURIComponent(r.searchQuery)}`}
                className="mt-2 inline-block text-sm text-brand hover:underline"
              >
                去看《{r.displayTitle}》 →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
