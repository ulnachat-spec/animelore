/**
 * 首页「今日冷知识」：主题调度 + 证据检索 + 写作 + 验真 + 内容库。
 * 与 GET /api/hook 共用 resolveHomeHook。
 */
import { resolveHomeHook } from "@/lib/cold-hook-service";
import type { ColdHookPayload } from "@/lib/types";

export async function getHomeHookPayload(options?: {
  refresh?: boolean;
}): Promise<ColdHookPayload> {
  const { payload } = await resolveHomeHook(options);
  return payload;
}

export { resolveHomeHook } from "@/lib/cold-hook-service";
