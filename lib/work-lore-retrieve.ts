import { buildStableCommunityHint } from "@/lib/community-hint";
import {
  buildCommunitySearchHint,
  fetchAniListMeta,
  fetchMoegirlContext,
  fetchWikipediaSummary
} from "@/lib/data-sources";
import { analyzeWorkQuery } from "@/lib/rag/analyzer";
import { evaluateEvidence } from "@/lib/rag/evaluator";
import { planRetrieval } from "@/lib/rag/planner";
import { mergeEvidence, retrieveWorkEvidenceRound } from "@/lib/rag/retriever";
import type { Evidence, EvidenceSource } from "@/lib/rag/types";
import type { WorkMeta } from "@/lib/types";
import { adaptiveWorkEnabled } from "@/lib/work-service";

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

function enabledSources(plan: ReturnType<typeof planRetrieval>): EvidenceSource[] {
  return plan.sources.filter((s) => s.enabled).map((s) => s.id as EvidenceSource);
}

export type WorkLoreRetrieveResult = {
  meta: WorkMeta;
  evidence: Evidence[];
  communityHint: string;
  coverageOk: boolean;
  insufficientReason?: string;
  userQuery: string;
  mode: "adaptive" | "legacy";
};

export async function retrieveWorkLoreContext(query: string): Promise<WorkLoreRetrieveResult> {
  if (adaptiveWorkEnabled()) {
    return retrieveAdaptiveContext(query);
  }
  return retrieveLegacyContext(query);
}

async function retrieveAdaptiveContext(userQuery: string): Promise<WorkLoreRetrieveResult> {
  const analyzed = analyzeWorkQuery({ raw_query: userQuery, route_hint: "work_lore" });
  const q0 = analyzed.normalized_queries[0] || userQuery.trim();
  const plan0 = planRetrieval("work_lore", 0);
  const maxRounds = plan0.max_rounds;
  const topK = envInt("RAG_TOP_K", 6);

  let allEvidence: Evidence[] = [];
  let meta: WorkMeta = { title: userQuery.trim() };
  let lastEvaluation: ReturnType<typeof evaluateEvidence> | null = null;

  for (let round = 0; round < maxRounds; round++) {
    let primaryQuery = q0;

    if (round === 1) {
      const candidates = [
        ...analyzed.normalized_queries.slice(1),
        meta.nativeTitle || null,
        meta.title && normKey(meta.title) !== normKey(q0) ? meta.title : null
      ].filter((x): x is string => !!x && x.trim().length > 0);

      const seenAlt = new Set<string>();
      const alt = candidates.find((c) => {
        const k = normKey(c);
        if (k === normKey(q0) || seenAlt.has(k)) return false;
        seenAlt.add(k);
        return true;
      });
      if (!alt) break;
      primaryQuery = alt;
    }

    const planRound = planRetrieval("work_lore", round);
    const { evidence, meta: newMeta } = await retrieveWorkEvidenceRound({
      primaryQuery,
      userQuery: q0,
      metaHint: round > 0 ? meta : undefined,
      round,
      tryAlternateTitles: round > 0 || !lastEvaluation?.coverage_ok,
      enabledSources: enabledSources(planRound)
    });

    meta = newMeta;
    allEvidence = mergeEvidence(allEvidence, evidence);
    lastEvaluation = evaluateEvidence(q0, allEvidence, meta, topK);

    if (lastEvaluation.coverage_ok) {
      const kept = allEvidence.filter((e) => lastEvaluation!.top_k_ids.includes(e.id));
      return {
        meta,
        evidence: kept,
        communityHint: buildStableCommunityHint({ meta, evidence: kept, userQuery: q0 }),
        coverageOk: true,
        userQuery: q0,
        mode: "adaptive"
      };
    }
  }

  const evalFinal = lastEvaluation ?? evaluateEvidence(q0, allEvidence, meta, topK);
  const kept = allEvidence.filter((e) => evalFinal.top_k_ids.includes(e.id));
  const fallbackKept =
    kept.length > 0 ? kept : allEvidence.slice(0, Math.min(topK, allEvidence.length));
  const reason =
    "未达到覆盖面阈值：需要 AniList 或 Bangumi 结构化信息，以及维基/萌娘/Bangumi 叙述或足够硬元数据（已尝试多轮检索）。";

  return {
    meta,
    evidence: fallbackKept,
    communityHint: buildStableCommunityHint({
      meta,
      evidence: fallbackKept,
      userQuery: q0
    }),
    coverageOk: false,
    insufficientReason: reason,
    userQuery: q0,
    mode: "adaptive"
  };
}

async function retrieveLegacyContext(query: string): Promise<WorkLoreRetrieveResult> {
  const wikiTitle = query.trim() || query;
  const [metaResolved, wikiSummary] = await Promise.all([
    fetchAniListMeta(query),
    fetchWikipediaSummary(wikiTitle)
  ]);
  const meta = metaResolved ?? ({ title: query } as WorkMeta);
  const moegirlContext = await fetchMoegirlContext(
    meta.nativeTitle || meta.title || query
  );
  const communityHint = buildCommunitySearchHint(meta.title);

  const evidence: Evidence[] = [];
  const now = new Date().toISOString();
  if (wikiSummary?.trim()) {
    evidence.push({
      id: "legacy-wiki",
      source: "wikipedia",
      title: meta.title,
      url: null,
      snippet: wikiSummary.slice(0, 4000),
      retrieval_query: query,
      round: 0,
      retrieved_at: now
    });
  }
  if (moegirlContext?.extract?.trim()) {
    evidence.push({
      id: "legacy-moegirl",
      source: "moegirl",
      title: moegirlContext.title,
      url: moegirlContext.url,
      snippet: moegirlContext.extract.slice(0, 4000),
      retrieval_query: query,
      round: 0,
      retrieved_at: now
    });
  }

  return {
    meta,
    evidence,
    communityHint,
    coverageOk: true,
    userQuery: query.trim(),
    mode: "legacy"
  };
}
