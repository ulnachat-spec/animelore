import fs from "node:fs";
import path from "node:path";
import {
  homeHookRecentTopicWindow,
  homeHookRotationMode
} from "@/lib/cold-hook-config";
import { COLD_PROMPT_VERSION } from "@/lib/cold-prompt-version";
import type { ColdHookRecord, ColdVerificationStatus, PickColdHookResult } from "@/lib/cold-types";
import type { HomeHookRawV2 } from "@/lib/cold-types";

const STORE_PATH = path.join(process.cwd(), "data", "cold-hooks.json");

let memoryStore: ColdHookRecord[] | null = null;

function ensureLoaded(): ColdHookRecord[] {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      const parsed = JSON.parse(raw) as ColdHookRecord[];
      memoryStore = Array.isArray(parsed) ? parsed : [];
    } else {
      memoryStore = [];
    }
  } catch {
    memoryStore = [];
  }
  return memoryStore;
}

export function readColdHookStore(): ColdHookRecord[] {
  return [...ensureLoaded()];
}

function isCurrentPromptRecord(r: ColdHookRecord): boolean {
  return r.prompt_version === COLD_PROMPT_VERSION;
}

function cjkLen(s: string | undefined): number {
  return (s ?? "").replace(/[^\u4e00-\u9fff]/g, "").length;
}

export function isUsableColdHookRecord(r: ColdHookRecord): boolean {
  const insightLen = cjkLen(r.insight);
  const blurbLen = cjkLen(r.blurb);
  return (
    isCurrentPromptRecord(r) &&
    (r.verification_status === "verified" || r.verification_status === "skipped") &&
    r.recommendations.length > 0 &&
    insightLen >= 80 &&
    insightLen <= 420 &&
    blurbLen >= 30 &&
    r.source_urls.length > 0
  );
}

export function countLibraryVerified(): number {
  return readColdHookStore().filter(isUsableColdHookRecord).length;
}

function persistStore(store: ColdHookRecord[]): void {
  memoryStore = store;
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.warn("[cold-hook-store] disk write skipped (serverless?):", (e as Error).message);
  }
}

export function saveColdHookToStore(record: ColdHookRecord): void {
  const store = ensureLoaded();
  const idx = store.findIndex((r) => r.id === record.id);
  if (idx >= 0) store[idx] = record;
  else store.push(record);
  persistStore(store);
}

/** refresh 测试：同 topic_key 只保留最新一条 */
export function upsertColdHookByTopicKey(record: ColdHookRecord): void {
  const store = ensureLoaded();
  const tk = record.topic_key.toLowerCase();
  const next = store.filter((r) => r.topic_key.toLowerCase() !== tk);
  next.push(record);
  persistStore(next);
}

/** 清空磁盘库并重置进程内 cache（配合 npm run cold:clear 或 dev API） */
export function clearColdHookStore(): void {
  memoryStore = [];
  persistStore([]);
}

export function recordFromRaw(
  raw: HomeHookRawV2,
  verification_status: ColdVerificationStatus
): ColdHookRecord {
  const now = new Date().toISOString();
  return {
    id: `cold_${now.slice(0, 10).replace(/-/g, "")}_${Math.random().toString(36).slice(2, 8)}`,
    prompt_version: COLD_PROMPT_VERSION,
    topic_type: raw.topic_type,
    cold_subtype: raw.cold_subtype,
    topic_key: raw.topic_key || `${raw.topic_type}:${raw.hook.slice(0, 12)}`,
    hook: raw.hook,
    blurb: raw.blurb,
    angle: raw.angle,
    example_bridge: raw.example_bridge,
    insight: raw.insight,
    quiz: raw.quiz ?? null,
    source_urls: raw.source_urls ?? [],
    recommendations: raw.recommendations,
    verification_status,
    confidence: raw.confidence,
    created_at: now,
    shown_count: 0
  };
}

export type PickColdHookOptions = {
  recentTopicKeys?: string[];
  recentHooks?: string[];
};

function scoreRecord(r: ColdHookRecord, now: number): number {
  const shown = r.shown_count ?? 0;
  const lastMs = r.last_shown_at ? new Date(r.last_shown_at).getTime() : 0;
  const hoursSince =
    lastMs > 0 ? (now - lastMs) / 3_600_000 : 999;
  let score = 100 - shown * 18;
  score += Math.min(hoursSince, 240) * 0.35;
  if (r.verification_status === "verified") score += 8;
  return score;
}

/**
 * 加权轮换：verified 优先；排除近期 topic_key；展示越少、越久未展示分越高。
 */
export function pickColdHookFromStore(opts: PickColdHookOptions = {}): PickColdHookResult {
  const store = readColdHookStore();
  const window = homeHookRecentTopicWindow();
  const balanced = homeHookRotationMode() === "balanced";
  const blockedKeys = new Set(
    (opts.recentTopicKeys ?? []).slice(-window).map((k) => k.toLowerCase())
  );
  const blockedHooks = new Set(
    (opts.recentHooks ?? []).slice(-window).map((h) => h.trim())
  );

  const candidates = store.filter(
    (r) =>
      isUsableColdHookRecord(r) &&
      !blockedKeys.has(r.topic_key.toLowerCase()) &&
      !blockedHooks.has(r.hook.trim())
  );

  if (candidates.length === 0) {
    const allVerified = store.filter(isUsableColdHookRecord);
    if (allVerified.length === 0) {
      return { record: null, candidates_count: 0, note: "library_empty" };
    }
    if (allVerified.length === 1) {
      return {
        record: null,
        candidates_count: 0,
        note: "single_library_entry_blocked_or_only_one"
      };
    }
    return {
      record: null,
      candidates_count: 0,
      note: "all_candidates_blocked_by_recent_topics"
    };
  }

  const now = Date.now();
  const scored = candidates.map((r) => ({
    r,
    score: scoreRecord(r, now) + (balanced ? Math.random() * 14 : 0)
  }));
  scored.sort((a, b) => b.score - a.score);
  return {
    record: scored[0].r,
    candidates_count: candidates.length,
    note: balanced ? "balanced_weighted_pick" : "stable_weighted_pick"
  };
}

export function markColdHookShown(id: string): void {
  // Next's production build may execute dynamic server components while collecting
  // route data. A build must never mutate the checked-in content library.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const store = ensureLoaded();
  const rec = store.find((r) => r.id === id);
  if (!rec) return;
  rec.last_shown_at = new Date().toISOString();
  rec.shown_count = (rec.shown_count ?? 0) + 1;
  saveColdHookToStore(rec);
}

export function getRecentTopicsFromStore(): { topic_keys: string[]; hooks: string[] } {
  const store = readColdHookStore().filter(isCurrentPromptRecord);
  const window = homeHookRecentTopicWindow();
  const sorted = [...store].sort((a, b) => {
    const ta = a.last_shown_at ? new Date(a.last_shown_at).getTime() : 0;
    const tb = b.last_shown_at ? new Date(b.last_shown_at).getTime() : 0;
    return tb - ta;
  });
  return {
    topic_keys: sorted.slice(0, window).map((r) => r.topic_key),
    hooks: sorted.slice(0, window).map((r) => r.hook)
  };
}

export function getColdHookLibraryStats() {
  const store = readColdHookStore();
  const current = store.filter(isCurrentPromptRecord);
  const usable = current.filter(isUsableColdHookRecord);
  const subtypeStats: Record<string, number> = {};
  for (const r of current) {
    const key = r.cold_subtype || "missing";
    subtypeStats[key] = (subtypeStats[key] ?? 0) + 1;
  }
  return {
    promptVersion: COLD_PROMPT_VERSION,
    libraryTotal: store.length,
    currentVersionCount: current.length,
    oldVersionCount: store.length - current.length,
    usableCount: usable.length,
    quizCount: current.filter((r) => Boolean(r.quiz)).length,
    noRecommendationsCount: current.filter((r) => r.recommendations.length === 0).length,
    missingBlurbCount: current.filter((r) => !r.blurb?.trim()).length,
    shortInsightCount: current.filter((r) => cjkLen(r.insight) < 80).length,
    longInsightCount: current.filter((r) => cjkLen(r.insight) > 420).length,
    subtypeStats
  };
}

export function avoidDuplicateColdHook(
  hook: string,
  topic_key: string,
  recentTopicKeys: string[],
  recentHooks: string[]
): boolean {
  const hk = hook.trim();
  const tk = topic_key.toLowerCase();
  if (recentHooks.some((h) => h.trim() === hk)) return false;
  if (recentTopicKeys.some((k) => k.toLowerCase() === tk)) return false;
  return true;
}
