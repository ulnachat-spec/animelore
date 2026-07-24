import { SearchBoxSkeleton } from "@/components/work-page-skeleton";
import { WorkHeroSkeleton } from "@/components/skeletons/WorkHeroSkeleton";
import { WorkLoreSkeleton } from "@/components/skeletons/WorkLoreSkeleton";
import { WorkPageNav } from "@/components/work/work-page-nav";

export default function WorkPageLoading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <WorkPageNav query="…" />
      <div className="mt-6">
        <SearchBoxSkeleton />
      </div>
      <WorkHeroSkeleton />
      <WorkLoreSkeleton />
    </main>
  );
}
