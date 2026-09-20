import { Suspense } from "react";
import Image from "next/image";
import { HomeColdSection } from "@/components/home-cold-section";
import { HomeDiscovery } from "@/components/home-discovery";
import { MeiState } from "@/components/mei-state";
import { SearchBox } from "@/components/search-box";

export const dynamic = "force-dynamic";

function ColdHookFallback() {
  return (
    <div aria-busy="true">
      <MeiState
        compact
        eyebrow="今日档案"
        title="芽衣正在翻找一条冷知识"
        description="书签已经夹好了，很快就送到你面前。"
      />
    </div>
  );
}

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<{ refreshHook?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const refreshHook =
    resolvedSearchParams?.refreshHook === "1" ||
    (Array.isArray(resolvedSearchParams?.refreshHook) &&
      resolvedSearchParams.refreshHook[0] === "1");

  return (
    <main>
      <section className="mx-auto grid max-w-6xl gap-7 px-4 pb-9 pt-7 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.7fr)] lg:items-center lg:gap-16 lg:pb-16">
        <div>
          <p className="archive-kicker text-brand">Anime work archive · 公开检索中</p>
          <h1 className="archive-title mt-5 max-w-3xl text-[clamp(2.55rem,8vw,5.4rem)] leading-[0.98]">
            每部动画，
            <span className="mt-2 block text-brand">都有第二份档案。</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-body sm:text-lg">
            和芽衣一起翻开作品背后的梗、争议、幕后与创作谱系。
            这里不是百科目录，而是一场有来源的同好深聊。
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchBox showSuggestions />
          </div>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="产品能力">
            {["四种档案视角", "来源可追溯", "芽衣陪你聊"].map((label, index) => (
              <span
                key={label}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  index === 0
                    ? "border-brand/25 bg-brand/10 text-brand"
                    : index === 1
                      ? "border-sage/25 bg-sage/10 text-sage"
                      : "border-gold/30 bg-gold/10 text-ink"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <aside className="relative mx-auto w-full max-w-[420px] lg:max-w-none" aria-label="芽衣档案员">
          <div className="absolute -left-4 top-10 hidden h-24 w-8 rounded-l-xl border-y border-l border-line bg-sage/20 sm:block" />
          <div className="archive-card relative aspect-[16/10] overflow-hidden sm:aspect-[4/3] lg:aspect-[4/5]">
            <Image
              src="/brand/mei-reference.png"
              alt="AnimeLore 档案员芽衣：佩戴圆框眼镜和星形书签发夹，手持档案本"
              fill
              priority
              sizes="(max-width: 1023px) 420px, 38vw"
              className="object-cover object-[35%_35%] transition duration-500 hover:scale-[1.018]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#201b17]/90 via-[#201b17]/45 to-transparent p-5 pt-20 text-[#fff8eb]">
              <p className="font-display text-xl font-semibold">芽衣正在值班</p>
              <p className="mt-1 text-sm text-[#eadfce]">“今天想从哪部作品开始？”</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="border-y border-line/70 bg-canvas-tint/45">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-2">
          <Suspense fallback={<ColdHookFallback />}>
            <HomeColdSection refreshHook={refreshHook} />
          </Suspense>
          <HomeDiscovery />
        </div>
      </section>
    </main>
  );
}
