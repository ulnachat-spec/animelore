function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 单张卡 LLM 流式生成最长等待（毫秒） */
export function workLoreStreamCardTimeoutMs(): number {
  return envInt("WORK_LORE_STREAM_CARD_TIMEOUT_MS", 45_000);
}

/** 整条 /api/work/stream 最长等待（毫秒） */
export function workLoreStreamTotalTimeoutMs(): number {
  return envInt("WORK_LORE_STREAM_TOTAL_TIMEOUT_MS", 180_000);
}

/** 前端无 SSE 事件后触发 fallback（毫秒）；由 Server Component 传入客户端 */
export function workLoreStreamClientIdleMs(): number {
  return envInt("WORK_LORE_STREAM_CLIENT_IDLE_MS", 30_000);
}
