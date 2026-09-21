import { buildColdHookPrompt } from "@/lib/cold-hook-prompt";
import {
  buildColdRecommendationCandidates,
  finalizeColdRecommendations
} from "@/lib/cold-recommendation-candidates";
import {
  clearHomeHookCache,
  getCachedHomeHookPayload,
  setCachedHomeHookPayload,
  todayDateKey
} from "@/lib/cold-hook-cache";
import {
  COLD_MIN_EVIDENCE_COUNT,
  COLD_MIN_LIBRARY_ENTRIES_FOR_ROTATION,
  homeHookForceRefreshInDev,
  homeHookGenerateOnMiss,
  homeHookMode,
  homeHookRotationMode
} from "@/lib/cold-hook-config";
import { evidenceUrls, retrieveColdEvidence } from "@/lib/cold-rag";
import { shouldForceColdRegenerate } from "@/lib/cold-hook-dev";
import {
  avoidDuplicateColdHook,
  countLibraryVerified,
  getColdHookLibraryStats,
  getRecentTopicsFromStore,
  markColdHookShown,
  pickColdHookFromStore,
  readColdHookStore,
  recordFromRaw,
  saveColdHookToStore,
  upsertColdHookByTopicKey
} from "@/lib/cold-hook-store";
import { COLD_PROMPT_VERSION } from "@/lib/cold-prompt-version";
import { planColdTopic } from "@/lib/cold-topic-planner";
import { verifyColdHook } from "@/lib/cold-verifier";
import type {
  ColdEvidence,
  ColdTopicPlan,
  ColdVerificationResult,
  HomeHookDebugInfo,
  HomeHookRawV2
} from "@/lib/cold-types";
import { coldPayloadFromRaw } from "@/lib/hook-enrich";
import { pickFallbackColdHook } from "@/lib/hook-fallback";
import { generateHomeHookRaw } from "@/lib/llm";
import type { ColdHookPayload } from "@/lib/types";

export type ResolveHomeHookResult = {
  payload: ColdHookPayload;
  debug: HomeHookDebugInfo;
};

const recentMemory: { topic_keys: string[]; hooks: string[] } = {
  topic_keys: [],
  hooks: []
};

let rotationNonce = 0;

function pushRecent(topic_key: string, hook: string): void {
  if (topic_key) recentMemory.topic_keys.push(topic_key);
  recentMemory.hooks.push(hook);
  const max = 14;
  if (recentMemory.topic_keys.length > max) {
    recentMemory.topic_keys = recentMemory.topic_keys.slice(-max);
    recentMemory.hooks = recentMemory.hooks.slice(-max);
  }
}

function mergeRecentTopics(): { topic_keys: string[]; hooks: string[] } {
  const fromStore = getRecentTopicsFromStore();
  return {
    topic_keys: [...new Set([...fromStore.topic_keys, ...recentMemory.topic_keys])],
    hooks: [...new Set([...fromStore.hooks, ...recentMemory.hooks])]
  };
}

function nextRotationSalt(refresh: boolean): string {
  rotationNonce += 1;
  if (refresh) return `refresh-${Date.now()}-${rotationNonce}`;
  return `visit-${rotationNonce}-${hashQuick(String(Date.now()))}`;
}

function hashQuick(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function fillDebugFromPayload(
  debug: HomeHookDebugInfo,
  payload: ColdHookPayload,
  mode: HomeHookDebugInfo["mode"]
): HomeHookDebugInfo {
  return {
    ...debug,
    mode,
    source: mode,
    selected_topic_type: payload.topic_type,
    selected_topic_key: payload.topic_key,
    seed_keyword: payload.topic_key?.split(":")[1],
    verification_status: payload.verification_status
  };
}

async function rawToPayload(
  raw: HomeHookRawV2,
  verification_status: ColdHookPayload["verification_status"]
): Promise<ColdHookPayload> {
  const base = await coldPayloadFromRaw(raw);
  return {
    ...base,
    topic_key: raw.topic_key,
    source_urls: raw.source_urls,
    verification_status,
    confidence: raw.confidence,
    prompt_version: COLD_PROMPT_VERSION
  };
}

/** 供 cold:clear / dev API 重置进程内轮换状态 */
export function resetColdHookServiceState(): void {
  recentMemory.topic_keys = [];
  recentMemory.hooks = [];
  rotationNonce = 0;
  clearHomeHookCache();
}

async function tryGenerateOnce(
  plan: ColdTopicPlan,
  evidence: ColdEvidence[]
): Promise<{
  raw: HomeHookRawV2 | null;
  verification: ColdVerificationResult | null;
  final_prompt?: string;
  llm_raw?: unknown;
  candidates?: unknown[];
  recommendation_target_count?: number;
  recommendation_actual_count?: number;
  recommendation_shortfall_reason?: string;
}> {
  const candidates = await buildColdRecommendationCandidates(plan, evidence);
  const prompt = buildColdHookPrompt(plan, evidence, candidates);
  try {
    const llm = await generateHomeHookRaw(prompt);
    const mergedUrls = [
      ...new Set([...(llm.source_urls ?? []), ...evidenceUrls(evidence)])
    ].filter((u) => u.startsWith("http"));
    const finalized = finalizeColdRecommendations(llm.recommendations, candidates, plan);
    const normalized: HomeHookRawV2 = {
      topic_type: llm.topic_type,
      topic_key: llm.topic_key || plan.topic_key,
      cold_subtype: llm.cold_subtype,
      hook: llm.hook,
      blurb: llm.blurb,
      angle: llm.angle,
      example_bridge: llm.example_bridge,
      style_pattern: llm.style_pattern,
      insight: llm.insight,
      quiz: llm.quiz ?? null,
      source_urls: mergedUrls,
      confidence: llm.confidence,
      recommendations: finalized.recommendations
    };
    const verification = await verifyColdHook({
      raw: normalized,
      evidence,
      candidates,
      allowSingleRecommendation: Boolean(finalized.shortfall_reason)
    });
    if (!verification.ok) {
      return {
        raw: null,
        verification,
        final_prompt: prompt,
        llm_raw: llm,
        candidates,
        recommendation_target_count: finalized.target_count,
        recommendation_actual_count: finalized.actual_count,
        recommendation_shortfall_reason: finalized.shortfall_reason
      };
    }
    return {
      raw: normalized,
      verification,
      final_prompt: prompt,
      llm_raw: llm,
      candidates,
      recommendation_target_count: finalized.target_count,
      recommendation_actual_count: finalized.actual_count,
      recommendation_shortfall_reason: finalized.shortfall_reason
    };
  } catch {
    return { raw: null, verification: null, final_prompt: prompt, candidates };
  }
}

async function generateColdHook(
  recent: { topic_keys: string[]; hooks: string[] },
  rotationSalt: string,
  retried: boolean,
  opts?: { forceSave?: boolean }
): Promise<{
  payload: ColdHookPayload | null;
  plan?: ColdTopicPlan;
  evidence?: ColdEvidence[];
  verification?: ColdVerificationResult;
  final_prompt?: string;
  llm_raw?: unknown;
  candidates?: unknown[];
  skipped_reason?: string;
  recommendation_target_count?: number;
  recommendation_actual_count?: number;
  recommendation_shortfall_reason?: string;
}> {
  const plan = planColdTopic({
    recentTopics: recent.topic_keys,
    rotationSalt
  });

  const evidence = await retrieveColdEvidence(plan);
  if (evidence.length < COLD_MIN_EVIDENCE_COUNT) {
    return {
      payload: null,
      plan,
      evidence,
      skipped_reason: `evidence_insufficient (${evidence.length}/${COLD_MIN_EVIDENCE_COUNT})`
    };
  }

  let result = await tryGenerateOnce(plan, evidence);
  if (!result.raw && !retried) {
    const altPlan = planColdTopic({
      date: `${todayDateKey()}-retry`,
      recentTopics: [...recent.topic_keys, plan.topic_key],
      rotationSalt: `${rotationSalt}-retry`
    });
    const altEvidence = await retrieveColdEvidence(altPlan);
    if (altEvidence.length >= COLD_MIN_EVIDENCE_COUNT) {
      result = await tryGenerateOnce(altPlan, altEvidence);
      return {
        payload: result.raw
          ? await finalizeGenerated(result.raw, result.verification!, {
              forceSave: opts?.forceSave
            })
          : null,
        plan: altPlan,
        evidence: altEvidence,
        verification: result.verification ?? undefined,
        final_prompt: result.final_prompt,
        llm_raw: result.llm_raw,
        candidates: result.candidates,
        skipped_reason: result.raw ? undefined : "verification_failed_after_retry",
        recommendation_target_count: result.recommendation_target_count,
        recommendation_actual_count: result.recommendation_actual_count,
        recommendation_shortfall_reason: result.recommendation_shortfall_reason
      };
    }
    return {
      payload: null,
      plan: altPlan,
      evidence: altEvidence,
      skipped_reason: `retry_evidence_insufficient (${altEvidence.length})`
    };
  }

  if (!result.raw || !result.verification) {
    return {
      payload: null,
      plan,
      evidence,
      verification: result.verification ?? undefined,
      final_prompt: result.final_prompt,
      llm_raw: result.llm_raw,
      candidates: result.candidates,
      skipped_reason: result.verification
        ? `verification_failed: ${result.verification.reasons.join("; ")}`
        : "llm_or_parse_failed",
      recommendation_target_count: result.recommendation_target_count,
      recommendation_actual_count: result.recommendation_actual_count,
      recommendation_shortfall_reason: result.recommendation_shortfall_reason
    };
  }

  return {
    payload: await finalizeGenerated(result.raw, result.verification, {
      forceSave: opts?.forceSave
    }),
    plan,
    evidence,
    verification: result.verification,
    final_prompt: result.final_prompt,
    llm_raw: result.llm_raw,
    candidates: result.candidates,
    recommendation_target_count: result.recommendation_target_count,
    recommendation_actual_count: result.recommendation_actual_count,
    recommendation_shortfall_reason: result.recommendation_shortfall_reason
  };
}

async function finalizeGenerated(
  raw: HomeHookRawV2,
  verification: ColdVerificationResult,
  opts?: { forceSave?: boolean }
): Promise<ColdHookPayload | null> {
  if (!opts?.forceSave) {
    const recent = mergeRecentTopics();
    if (!avoidDuplicateColdHook(raw.hook, raw.topic_key, recent.topic_keys, recent.hooks)) {
      return null;
    }
  }
  const status = verification.status;
  const record = recordFromRaw(raw, status);
  if (opts?.forceSave) {
    upsertColdHookByTopicKey(record);
  } else {
    saveColdHookToStore(record);
  }
  return rawToPayload(raw, status);
}

async function payloadFromLibrary(
  recent: { topic_keys: string[]; hooks: string[] }
): Promise<{
  payload: ColdHookPayload | null;
  id?: string;
  pick_note?: string;
}> {
  const pick = pickColdHookFromStore({
    recentTopicKeys: recent.topic_keys,
    recentHooks: recent.hooks
  });
  if (!pick.record) {
    return { payload: null, pick_note: pick.note };
  }
  markColdHookShown(pick.record.id);
  const rec = pick.record;
  const raw: HomeHookRawV2 = {
    topic_type: rec.topic_type,
    cold_subtype: rec.cold_subtype,
    topic_key: rec.topic_key,
    hook: rec.hook,
    blurb: rec.blurb,
    angle: rec.angle,
    example_bridge: rec.example_bridge,
    insight: rec.insight,
    quiz: rec.quiz ?? null,
    source_urls: rec.source_urls,
    confidence: rec.confidence ?? 0.6,
    recommendations: rec.recommendations.map((r, i) => ({
      candidate_id: r.candidate_id || `lib_${rec.id}_${i}`,
      reason: r.reason,
      anilistId: r.anilistId,
      anime_title: r.anime_title
    }))
  };
  const payload = await rawToPayload(raw, rec.verification_status);
  return {
    payload: { ...payload, record_id: rec.id },
    id: rec.id,
    pick_note: pick.note
  };
}

function shouldSkipStableCache(refresh: boolean): boolean {
  if (refresh) return true;
  if (homeHookRotationMode() === "balanced") return true;
  if (homeHookForceRefreshInDev()) return true;
  return false;
}

function maybeSetStableCache(dateKey: string, payload: ColdHookPayload): void {
  if (homeHookRotationMode() === "stable") {
    setCachedHomeHookPayload(dateKey, payload);
  }
}

export async function resolveHomeHook(options?: {
  refresh?: boolean;
}): Promise<ResolveHomeHookResult> {
  const refreshRequested = options?.refresh === true;
  const forceRegenerate = shouldForceColdRegenerate(refreshRequested);
  const dateKey = todayDateKey();
  const recent = mergeRecentTopics();
  const library_size = readColdHookStore().length;
  const library_verified_count = countLibraryVerified();
  const rotation_mode = homeHookRotationMode();
  const rotationSalt = nextRotationSalt(refreshRequested);

  const debug: HomeHookDebugInfo = {
    mode: "fallback",
    source: "fallback",
    library_size,
    library_verified_count,
    selected_from_library: false,
    recent_topics: recent.topic_keys,
    cache_hit: false,
    refresh_requested: refreshRequested,
    rotation_mode,
    force_regenerate: forceRegenerate,
    prompt_version: COLD_PROMPT_VERSION
  };

  if (refreshRequested) {
    clearHomeHookCache();
    if (forceRegenerate) {
      resetColdHookServiceState();
      debug.library_pick_note = "skipped_dev_refresh_force_generate";
    }
  }

  if (!shouldSkipStableCache(refreshRequested)) {
    const cached = getCachedHomeHookPayload(dateKey);
    if (cached) {
      pushRecent(cached.topic_key ?? "", cached.hook);
      return {
        payload: cached,
        debug: fillDebugFromPayload(
          { ...debug, cache_hit: true, mode: "cache" },
          cached,
          "cache"
        )
      };
    }
  }

  const libraryRichEnough =
    library_verified_count >= COLD_MIN_LIBRARY_ENTRIES_FOR_ROTATION;

  if (
    (homeHookMode() === "library_first" || homeHookMode() === "library_only") &&
    libraryRichEnough &&
    !refreshRequested &&
    !forceRegenerate
  ) {
    const lib = await payloadFromLibrary(recent);
    debug.library_pick_note = lib.pick_note;
    if (lib.payload) {
      pushRecent(lib.payload.topic_key ?? "", lib.payload.hook);
      maybeSetStableCache(dateKey, lib.payload);
      return {
        payload: lib.payload,
        debug: fillDebugFromPayload(
          {
            ...debug,
            mode: "library",
            selected_from_library: true,
            duplicate_avoidance: {
              recent_topic_keys: recent.topic_keys,
              recent_hooks: recent.hooks,
              picked_library_id: lib.id
            }
          },
          lib.payload,
          "library"
        )
      };
    }
    debug.generation_skipped_reason = lib.pick_note ?? "library_pick_failed";
  } else if (homeHookMode() === "library_only" && !refreshRequested && !forceRegenerate) {
    debug.generation_skipped_reason = libraryRichEnough
      ? "library_only_pick_failed"
      : "library_only_insufficient_library";
  } else if (forceRegenerate) {
    if (!debug.library_pick_note) {
      debug.library_pick_note = "skipped_dev_refresh_force_generate";
    }
  } else if (!libraryRichEnough) {
    debug.library_pick_note = `library_too_small (${library_verified_count} verified, need ${COLD_MIN_LIBRARY_ENTRIES_FOR_ROTATION})`;
  }

  if (
    homeHookMode() !== "library_only" &&
    (homeHookGenerateOnMiss() || refreshRequested || forceRegenerate)
  ) {
    const gen = await generateColdHook(recent, rotationSalt, false, {
      forceSave: refreshRequested
    });
    debug.plan = gen.plan;
    debug.evidence = gen.evidence;
    debug.verification = gen.verification;
    debug.final_prompt = gen.final_prompt;
    debug.llm_raw = gen.llm_raw;
    debug.candidates = gen.candidates;
    debug.evidence_count = gen.evidence?.length;
    debug.recommendation_target_count = gen.recommendation_target_count;
    debug.recommendation_actual_count = gen.recommendation_actual_count;
    debug.recommendation_shortfall_reason = gen.recommendation_shortfall_reason;
    debug.retried_generation = Boolean(gen.skipped_reason?.includes("retry"));
    if (gen.skipped_reason) {
      debug.generation_skipped_reason = gen.skipped_reason;
    }

    if (gen.payload) {
      pushRecent(gen.payload.topic_key ?? "", gen.payload.hook);
      maybeSetStableCache(dateKey, gen.payload);
      return {
        payload: gen.payload,
        debug: fillDebugFromPayload({ ...debug, mode: "generated" }, gen.payload, "generated")
      };
    }
  }

  const fb = pickFallbackColdHook(recent.topic_keys);
  pushRecent(fb.topic_key, fb.hook);
  const payload = await rawToPayload(fb, "fallback");
  maybeSetStableCache(dateKey, payload);
  return {
    payload,
    debug: fillDebugFromPayload({ ...debug, mode: "fallback" }, payload, "fallback")
  };
}

export function getHomeHookLibraryStats() {
  return getColdHookLibraryStats();
}
