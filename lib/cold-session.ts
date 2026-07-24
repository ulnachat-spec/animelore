import { COLD_PROMPT_VERSION } from "@/lib/cold-prompt-version";
import type { ColdHookPayload } from "@/lib/types";

export const COLD_SESSION_STORAGE_KEY = "animelore_cold_v1";

/** 开发环境 session 有效期更短，避免 stale 误导测试 */
export const COLD_SESSION_MAX_AGE_MS =
  process.env.NODE_ENV === "development" ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000;

export type ColdSessionEnvelope = {
  promptVersion: string;
  savedAt: string;
  payload: ColdHookPayload;
};

export type ColdSessionStaleReason =
  | "invalid_json"
  | "missing_fields"
  | "stale"
  | "prompt_version";

export type ColdSessionParseResult =
  | { ok: true; envelope: ColdSessionEnvelope }
  | { ok: false; reason: ColdSessionStaleReason };

export function buildColdSessionEnvelope(payload: ColdHookPayload): ColdSessionEnvelope {
  return {
    promptVersion: COLD_PROMPT_VERSION,
    savedAt: new Date().toISOString(),
    payload
  };
}

export function parseColdSession(raw: string | null): ColdSessionParseResult {
  if (!raw?.trim()) {
    return { ok: false, reason: "missing_fields" };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ColdSessionEnvelope> & ColdHookPayload;
    if (parsed.promptVersion && parsed.savedAt && parsed.payload) {
      const envelope = parsed as ColdSessionEnvelope;
      if (envelope.promptVersion !== COLD_PROMPT_VERSION) {
        return { ok: false, reason: "prompt_version" };
      }
      const age = Date.now() - new Date(envelope.savedAt).getTime();
      if (!Number.isFinite(age) || age > COLD_SESSION_MAX_AGE_MS) {
        return { ok: false, reason: "stale" };
      }
      return { ok: true, envelope };
    }
    if (parsed.hook && parsed.insight) {
      return { ok: false, reason: "prompt_version" };
    }
    return { ok: false, reason: "missing_fields" };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}

export function coldSessionStaleMessage(reason: ColdSessionStaleReason): string {
  if (reason === "stale") {
    return "这份冷知识在浏览器里放太久啦，请回到首页重新打开（开发环境约 30 分钟有效）。";
  }
  if (reason === "prompt_version") {
    return "冷知识格式已更新，请回到首页点「今日冷知识」重新加载，不要用旧的浏览器缓存。";
  }
  return "没有找到有效的冷知识数据，请从首页进入。";
}
