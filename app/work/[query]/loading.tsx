import { SearchBoxSkeleton } from "@/components/work-page-skeleton";
import { WorkHeroSkeleton } from "@/components/skeletons/WorkHeroSkeleton";
import { WorkLoreSkeleton } from "@/components/skeletons/WorkLoreSkeleton";
import { MeiState } from "@/components/mei-state";
import { WorkPageNav } from "@/components/work/work-page-nav";

export default function WorkPageLoading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <WorkPageNav query="…" />
      <div className="mt-6">
        <SearchBoxSkeleton />
      </div>
      <div className="mt-5 max-w-2xl">
        <MeiState
          compact
          eyebrow="正在调取作品档案"
          title="芽衣正在整理资料卡"
          description="会先呈现核心内容，再逐步补齐相关推荐。"
        />
      </div>
      <WorkHeroSkeleton />
      <WorkLoreSkeleton />
    </main>
  );
}
