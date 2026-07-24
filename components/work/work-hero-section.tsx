import Image from "next/image";
import { getWorkMetaQuickCached } from "@/lib/work-page-loaders";
import type { WorkMeta } from "@/lib/types";

export async function WorkHeroSection({ query }: { query: string }) {
  const meta = await getWorkMetaQuickCached(query);
  return <WorkHeroContent meta={meta} fallbackTitle={query} />;
}

function WorkHeroContent({
  meta,
  fallbackTitle
}: {
  meta: WorkMeta;
  fallbackTitle: string;
}) {
  const title = meta.title?.trim() || fallbackTitle;

  return (
    <section className="mt-8 flex gap-6 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5">
      {meta.coverImage ? (
        <Image
          src={meta.coverImage}
          alt={title}
          width={180}
          height={250}
          className="rounded-xl object-cover"
          priority
        />
      ) : (
        <div
          className="h-[250px] w-[180px] shrink-0 rounded-xl bg-zinc-800/60 ring-1 ring-zinc-700/80"
          aria-hidden
        />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-zinc-400">
          {meta.nativeTitle || "N/A"} · {meta.seasonYear || "未知年份"}
        </p>
        <p className="mt-3 text-sm text-zinc-300">
          {(meta.studios || []).join(" · ") || "制作信息待补充"}
        </p>
      </div>
    </section>
  );
}
