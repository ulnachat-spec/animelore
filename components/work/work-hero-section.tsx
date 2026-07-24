import Image from "next/image";
import { LibraryActions } from "@/components/library-actions";
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
  const studios = (meta.studios || []).filter(Boolean);

  return (
    <section className="archive-card relative mt-6 overflow-hidden p-4 sm:mt-8 sm:flex sm:gap-6 sm:p-5">
      {meta.coverImage ? (
        <Image
          src={meta.coverImage}
          alt=""
          fill
          className="pointer-events-none object-cover opacity-[0.055] blur-2xl"
          sizes="100vw"
          aria-hidden
        />
      ) : null}
      {meta.coverImage ? (
        <Image
          src={meta.coverImage}
          alt={title}
          width={180}
          height={252}
          className="relative float-left mr-4 h-[150px] w-[106px] shrink-0 rounded-xl object-cover shadow-card sm:float-none sm:mr-0 sm:h-[252px] sm:w-[180px]"
          priority
        />
      ) : (
        <div
          className="relative float-left mr-4 h-[150px] w-[106px] shrink-0 rounded-xl bg-soft/60 ring-1 ring-line/80 sm:float-none sm:mr-0 sm:h-[252px] sm:w-[180px]"
          aria-hidden
        />
      )}
      <div className="relative min-w-0 flex-1 py-1 sm:py-4">
        <p className="archive-kicker text-brand">Work dossier</p>
        <h1 className="archive-title mt-2 text-2xl leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
          {meta.nativeTitle || "原名待补充"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-line bg-canvas/70 px-3 py-1.5 text-xs text-body">
            {meta.seasonYear || "年份待补"}
          </span>
          {studios.slice(0, 3).map((studio) => (
            <span
              key={studio}
              className="rounded-full border border-line bg-canvas/70 px-3 py-1.5 text-xs text-body"
            >
              {studio}
            </span>
          ))}
        </div>
        <div className="mt-4 clear-both pt-1 sm:clear-none">
          <LibraryActions
            compact
            item={{
              id: `work:${title}`,
              kind: "work",
              title,
              subtitle: meta.nativeTitle,
              href: `/work/${encodeURIComponent(fallbackTitle)}`,
              image: meta.coverImage,
              tags: studios
            }}
          />
        </div>
        <p className="mt-5 hidden max-w-xl text-sm leading-7 text-body sm:block">
          下面四份档案分别从作品遗产、社区迷因、制作幕后与创作谱系切入。
        </p>
      </div>
      <div className="clear-both" />
    </section>
  );
}
