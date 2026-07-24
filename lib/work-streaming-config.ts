/** 作品页四卡是否走 SSE 逐字流式（/api/work/stream） */
export function workLoreStreamingEnabled(): boolean {
  return process.env.WORK_LORE_STREAMING === "true";
}
