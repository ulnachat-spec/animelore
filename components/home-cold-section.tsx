import { ColdHookTeaser } from "@/components/cold-hook-teaser";
import { getHomeHookPayload } from "@/lib/home-hook";

export async function HomeColdSection({
  refreshHook = false
}: {
  refreshHook?: boolean;
}) {
  const hook = await getHomeHookPayload({ refresh: refreshHook });
  return <ColdHookTeaser payload={hook} />;
}
