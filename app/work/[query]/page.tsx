/**
 * 作品页：路由级 loading.tsx + Suspense 分块 streaming。
 * 顶层不 await 慢数据；各区块在 async Server Component 内独立加载。
 */
import { Suspense } from "react";

/** 保证 ?debugTyping=1 等 searchParams 不被静态缓存丢掉 */
export const dynamic = "force-dynamic";

function searchParamIsOn(
  v: string | string[] | undefined
): boolean {
  if (v === "1") return true;
  if (Array.isArray(v) && v[0] === "1") return true;
  return false;
}
import { SearchBox } from "@/components/search-box";
import { RecentWorkRecorder } from "@/components/recent-work-recorder";
import { CommunityRecsSkeleton } from "@/components/skeletons/CommunityRecsSkeleton";
import { RelatedWorksSkeleton } from "@/components/skeletons/RelatedWorksSkeleton";
import { WorkHeroSkeleton } from "@/components/skeletons/WorkHeroSkeleton";
import { WorkLoreSkeleton } from "@/components/skeletons/WorkLoreSkeleton";
import { CommunityRecsSection } from "@/components/work/community-recs-section";
import { RelatedWorksSection } from "@/components/work/related-works-section";
import { WorkHeroSection } from "@/components/work/work-hero-section";
import { WorkLoreSection } from "@/components/work/work-lore-section";
import { WorkPageNav } from "@/components/work/work-page-nav";

export default function WorkPage({
  params,
  searchParams
}: {
  params: { query: string };
  searchParams?: { debugTyping?: string | string[] };
}) {
  const query = decodeURIComponent(params.query);
  const debugTyping = searchParamIsOn(searchParams?.debugTyping);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <RecentWorkRecorder title={query} />
      <WorkPageNav query={query} />
      <div className="mt-6">
        <SearchBox defaultValue={query} />
      </div>

      <Suspense fallback={<WorkHeroSkeleton />}>
        <WorkHeroSection query={query} />
      </Suspense>

      <Suspense fallback={<WorkLoreSkeleton />}>
        <WorkLoreSection query={query} debugTyping={debugTyping} />
      </Suspense>

      <Suspense fallback={<CommunityRecsSkeleton />}>
        <CommunityRecsSection query={query} />
      </Suspense>

      <Suspense fallback={<RelatedWorksSkeleton />}>
        <RelatedWorksSection query={query} />
      </Suspense>
    </main>
  );
}
