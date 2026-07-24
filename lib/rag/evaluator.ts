import type {
  EvaluationResult,
  Evidence,
  EvidenceScores,
  EvidenceSource,
  ScoredEvidence
} from "@/lib/rag/types";
import type { WorkMeta } from "@/lib/types";
import { ragLog } from "@/lib/rag/logger";
import {
  authorityWeight,
  COMMUNITY_SOURCES,
  CONTEXT_SOURCES,
  HARD_FACT_SOURCES,
  isCommunitySource,
  isHardFactSource
} from "@/lib/rag/source-policy";

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeForMatch(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function tokenOverlap(query: string, text: string): number {
  const q = new Set(normalizeForMatch(query));
  const t = normalizeForMatch(text);
  if (q.size === 0 || t.length === 0) return 0.3;
  let hit = 0;
  for (const w of t) {
    if (q.has(w)) hit += 1;
  }
  return Math.min(1, hit / Math.max(q.size, 3) + 0.2);
}

function specificityScore(snippet: string): number {
  const len = snippet.trim().length;
  if (len >= 400) return 1;
  if (len >= 120) return 0.85;
  if (len >= 60) return 0.65;
  return 0.4;
}

function freshnessScore(meta: WorkMeta): number {
  const y = meta.seasonYear;
  if (y == null) return 0.5;
  const gap = new Date().getFullYear() - y;
  if (gap <= 3) return 1;
  if (gap <= 10) return 0.85;
  return 0.7;
}

/** 证据包中是否包含可支撑硬事实的权威来源 */
export function hasHardFactEvidence(evidence: Evidence[]): boolean {
  return evidence.some(
    (e) => isHardFactSource(e.source) && e.snippet.trim().length >= 40
  );
}

/**
 * 结构化事实是否足够支撑「作品图鉴」硬信息（与叙述文本分开判断）
 */
export function hasHardMeta(meta: WorkMeta): boolean {
  return !!(
    meta.seasonYear ||
    (meta.studios && meta.studios.length > 0) ||
    meta.coverImage ||
    meta.season
  );
}

export function hasBangumiStructuredEvidence(evidence: Evidence[]): boolean {
  return evidence.some(
    (e) =>
      e.source === "bangumi" &&
      (e.structured?.subjectId != null || e.snippet.includes("rating:"))
  );
}

export function hasNarrativeEvidence(evidence: Evidence[]): boolean {
  return evidence.some((e) => {
    if (e.source === "wikipedia" || e.source === "moegirl") {
      return e.snippet.trim().length >= 80;
    }
    if (e.source === "bangumi") {
      const len = e.snippet.trim().length;
      return len >= 80 && (e.snippet.includes("summary:") || len >= 120);
    }
    return false;
  });
}

export function computeCoverageOk(meta: WorkMeta, evidence: Evidence[]): boolean {
  const hasAni = evidence.some((e) => e.source === "anilist");
  const hard = hasHardMeta(meta) || hasBangumiStructuredEvidence(evidence);
  const nar = hasNarrativeEvidence(evidence);
  const strict = process.env.RAG_COVERAGE_STRICT === "true";
  if (strict) {
    return hasAni && hard && nar && hasHardFactEvidence(evidence);
  }
  /**
   * 宽松：AniList 必备；叙述文本 **或** 足够结构化硬信息（含仅 AniList 条目）即可生成。
   * 避免维基/萌娘在部分网络下不可达时整页「资料不足」。
   */
  return hasAni && (nar || hard);
}

/** 供 prompt / debug：当前证据包中的来源角色摘要 */
export function summarizeSourceRoles(evidence: Evidence[]): {
  hard_fact: EvidenceSource[];
  context: EvidenceSource[];
  community: EvidenceSource[];
} {
  const hard_fact = new Set<EvidenceSource>();
  const context = new Set<EvidenceSource>();
  const community = new Set<EvidenceSource>();
  for (const e of evidence) {
    if (isHardFactSource(e.source)) hard_fact.add(e.source);
    else if ((CONTEXT_SOURCES as readonly string[]).includes(e.source)) context.add(e.source);
    else if (isCommunitySource(e.source)) community.add(e.source);
  }
  return {
    hard_fact: [...hard_fact],
    context: [...context],
    community: [...community]
  };
}

export function evaluateEvidence(
  query: string,
  evidence: Evidence[],
  meta: WorkMeta,
  topK: number
): EvaluationResult {
  const scored: ScoredEvidence[] = [];
  const packHasHardFact = hasHardFactEvidence(evidence);

  for (const ev of evidence) {
    const relevance = tokenOverlap(query, `${ev.title}\n${ev.snippet}`);
    let authority = authorityWeight(ev.source);

    /** 社区源在无硬事实来源时降权，避免进入 Top-K 主导生成 */
    if (isCommunitySource(ev.source) && !packHasHardFact) {
      authority *= 0.75;
    }

    const specificity = specificityScore(ev.snippet);
    const freshness =
      ev.source === "anilist" || ev.source === "bangumi"
        ? freshnessScore(meta)
        : specificity * 0.9;

    const final =
      0.38 * relevance + 0.28 * authority + 0.22 * specificity + 0.12 * freshness;

    const scores: EvidenceScores = {
      relevance,
      authority,
      specificity,
      freshness,
      final
    };

    const role =
      (ev.structured?.evidenceRole as string) ||
      (isHardFactSource(ev.source)
        ? "hard_fact"
        : isCommunitySource(ev.source)
          ? "community"
          : "context");

    scored.push({
      evidence_id: ev.id,
      scores,
      keep: final >= (isCommunitySource(ev.source) ? 0.4 : 0.35),
      reason: `rel=${relevance.toFixed(2)} auth=${authority.toFixed(2)} spec=${specificity.toFixed(2)} role=${role}`
    });
  }

  scored.sort((a, b) => b.scores.final - a.scores.final);

  /** 社区源最多保留 1 条进入 Top-K，且不得挤掉全部硬事实/叙述源 */
  const communityCap = 1;
  let communityKept = 0;

  const ranked = [...scored].sort((a, b) => b.scores.final - a.scores.final);
  const passed: string[] = [];
  for (const s of ranked) {
    if (!s.keep) continue;
    const ev = evidence.find((e) => e.id === s.evidence_id);
    if (!ev) continue;
    if (isCommunitySource(ev.source)) {
      if (communityKept >= communityCap) continue;
      communityKept += 1;
    }
    passed.push(s.evidence_id);
    if (passed.length >= topK) break;
  }

  const rankedIds = ranked.map((s) => s.evidence_id);
  const ensured = passed.length > 0 ? passed : rankedIds.slice(0, Math.min(3, rankedIds.length));

  const conflicts = detectConflicts(evidence);
  const coverage_ok = computeCoverageOk(meta, evidence);

  const result: EvaluationResult = {
    scored_evidence: scored,
    top_k_ids: ensured,
    conflicts,
    coverage_ok
  };

  ragLog("evaluator", {
    coverage_ok,
    top_k_ids: ensured,
    scored_count: scored.length,
    soft_keep_used: passed.length === 0 && ensured.length > 0,
    hard_fact_sources: HARD_FACT_SOURCES,
    community_sources: COMMUNITY_SOURCES
  });

  return result;
}

function detectConflicts(evidence: Evidence[]): EvaluationResult["conflicts"] {
  const years: string[] = [];
  for (const e of evidence) {
    if (e.source === "anilist") {
      const m = e.snippet.match(/seasonYear:\s*(\d{4})/);
      if (m) years.push(m[1]);
    }
    if (e.source === "bangumi") {
      const m = e.snippet.match(/date:\s*(\d{4})/);
      if (m) years.push(m[1]);
    }
  }
  const uniq = [...new Set(years)];
  if (uniq.length > 1) {
    return [{ field: "seasonYear", values: uniq, evidence_ids: evidence.map((e) => e.id) }];
  }
  return [];
}
