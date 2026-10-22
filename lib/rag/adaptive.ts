import { buildStableCommunityHint } from "@/lib/community-hint";
import { verifyLoreWithGemini } from "@/lib/gemini-verifier";
import { buildLorePromptFromAdaptive } from "@/lib/prompt";
import { generateLore } from "@/lib/llm";
import { sanitizeLoreAgainstEvidence } from "@/lib/lore-claim-safety";
import { dedupeLoreAcrossCards } from "@/lib/lore-cross-card-dedupe";
import { analyzeWorkQuery } from "@/lib/rag/analyzer";
import { evaluateEvidence } from "@/lib/rag/evaluator";
import { insufficientEvidenceLore } from "@/lib/rag/insufficient";
import { ragLog } from "@/lib/rag/logger";
import { planRetrieval } from "@/lib/rag/planner";
import { mergeEvidence, retrieveWorkEvidenceRound } from "@/lib/rag/retriever";
import type {
  AdaptiveWorkOutcome,
  AnalyzerResult,
  EvaluationResult,
  Evidence,
  EvidenceSource,
  RagDebugReport,
  RagDebugRound,
  RagResult,
  RagTrace,
  RetrievalPlan
} from "@/lib/rag/types";
import type { LorePayload, WorkMeta } from "@/lib/types";

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Debug JSON 里摘要过长时截断（字符数），默认 600 */
function truncateForDebug(text: string): string {
  const max = envInt("RAG_DEBUG_TRUNCATE_SNIPPET", 600);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… [truncated, total ${text.length} chars]`;
}

function cloneEvidenceForDebug(items: Evidence[]): Evidence[] {
  return items.map((e) => ({
    ...e,
    snippet: truncateForDebug(e.snippet)
  }));
}

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

function buildEvidencePack(items: Evidence[]) {
  const summary_for_prompt = items
    .map((e) => `[${e.id}] ${e.source} | ${e.title}\n${e.snippet.slice(0, 3500)}`)
    .join("\n\n---\n\n");
  return { items, summary_for_prompt };
}

function enabledSources(plan: RetrievalPlan): EvidenceSource[] {
  return plan.sources.filter((s) => s.enabled).map((s) => s.id as EvidenceSource);
}

type RunOptions = { debug?: boolean };

export type AdaptiveRunResult = AdaptiveWorkOutcome & {
  debugReport?: RagDebugReport;
};

/**
 * 作品图鉴自适应 RAG：analyze → plan → 多轮 retrieve → evaluate →（coverage OK）generate。
 * `options.debug=true` 时附带 `debugReport`（仅用于调试接口）。
 */
export async function runAdaptiveWorkLore(
  userQuery: string,
  options?: RunOptions
): Promise<AdaptiveRunResult> {
  const debugMode = options?.debug === true;
  const trace: RagTrace = { steps: [] };

  const pushTrace = (step: string, payload: Record<string, unknown>) => {
    trace.steps.push({ step, at: new Date().toISOString(), payload });
    ragLog(step, payload);
  };

  const roundsDebug: RagDebugRound[] = [];
  let secondRoundTriggered = false;
  let lastEvaluation: EvaluationResult | null = null;

  const queries_tried: string[] = [];
  const analyzed = analyzeWorkQuery({ raw_query: userQuery, route_hint: "work_lore" });
  const q0 = analyzed.normalized_queries[0] || userQuery.trim();
  queries_tried.push(q0);

  pushTrace("analyze", {
    normalized_queries: analyzed.normalized_queries,
    task_type: analyzed.task_type
  });

  const plan0 = planRetrieval("work_lore", 0);
  const maxRounds = plan0.max_rounds;
  const topK = envInt("RAG_TOP_K", 6);

  let allEvidence: Evidence[] = [];
  let meta: WorkMeta = { title: userQuery.trim() };

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
      if (!alt) {
        pushTrace("adaptive.skip_round_1", { reason: "no_alternate_query" });
        if (debugMode) {
          const pr = planRetrieval("work_lore", 1);
          roundsDebug.push({
            round: 1,
            planner: pr,
            sources_selected: enabledSources(pr),
            primary_query: "",
            evidence_this_round: [],
            merged_evidence_total: allEvidence.length,
            community_fetch: [],
            bangumi_fetch: [],
            source_timings: [],
            evaluation:
              lastEvaluation ??
              evaluateEvidence(q0, allEvidence, meta, topK),
            coverage_ok: false,
            skipped: true,
            skip_reason: "no_alternate_query（别名与首轮相同或为空）"
          });
        }
        break;
      }
      primaryQuery = alt;
      queries_tried.push(primaryQuery);
      secondRoundTriggered = true;
    }

    const planRound = planRetrieval("work_lore", round);

    const {
      evidence,
      meta: newMeta,
      communityFetches,
      communityQueryCandidates,
      bangumiFetches,
      sourceTimings
    } = await retrieveWorkEvidenceRound({
      primaryQuery,
      userQuery: q0,
      metaHint: round > 0 ? meta : undefined,
      round,
      tryAlternateTitles: round > 0 || !lastEvaluation?.coverage_ok,
      enabledSources: enabledSources(planRound)
    });

    meta = newMeta;
    allEvidence = mergeEvidence(allEvidence, evidence);

    pushTrace(`retrieve_round_${round}`, {
      evidence_count: evidence.length,
      merged_total: allEvidence.length,
      primaryQuery,
      community_fetch: communityFetches,
      community_query_candidates: communityQueryCandidates,
      bangumi_fetch: bangumiFetches,
      source_timings: sourceTimings
    });

    const evalResult = evaluateEvidence(q0, allEvidence, meta, topK);
    lastEvaluation = evalResult;

    if (debugMode) {
      roundsDebug.push({
        round,
        planner: planRound,
        sources_selected: enabledSources(planRound),
        primary_query: primaryQuery,
        evidence_this_round: cloneEvidenceForDebug(evidence),
        merged_evidence_total: allEvidence.length,
        community_query_candidates: communityQueryCandidates,
        community_fetch: communityFetches,
        bangumi_fetch: bangumiFetches,
        source_timings: sourceTimings,
        evaluation: {
          ...evalResult,
          scored_evidence: evalResult.scored_evidence.map((s) => ({
            ...s,
            reason: s.reason
          }))
        },
        coverage_ok: evalResult.coverage_ok
      });
    }

    pushTrace(`evaluate_round_${round}`, {
      coverage_ok: evalResult.coverage_ok,
      top_k_ids: evalResult.top_k_ids,
      conflicts: evalResult.conflicts.length
    });

    if (evalResult.coverage_ok) {
      const kept = allEvidence.filter((e) => evalResult.top_k_ids.includes(e.id));
      const pack = buildEvidencePack(kept);
      const prompt = buildLorePromptFromAdaptive(
        meta,
        kept,
        buildStableCommunityHint({ meta, evidence: kept, userQuery: q0 })
      );

      pushTrace("generate.input", {
        evidence_ids: kept.map((e) => e.id),
        prompt_length: prompt.length
      });

      const generatedLore = await generateLore(prompt);

      pushTrace("generate.ok", { work_title: generatedLore.work_title });

      let finalLore = generatedLore;
      let outcomeKind: "success" | "insufficient_evidence" = "success";
      let insufficientReason: string | null = null;
      let geminiVerification: Record<string, unknown> | undefined;

      if (debugMode) {
        const verify = await verifyLoreWithGemini({
          lore: generatedLore,
          evidence: kept,
          meta
        });
        geminiVerification = verify.tracePayload;
        pushTrace("gemini.verify", verify.tracePayload);
        finalLore = verify.lore;

        if (verify.action === "insufficient") {
          outcomeKind = "insufficient_evidence";
          insufficientReason =
            verify.report?.summary ??
            "Gemini 交叉验证：现有证据不足以支撑生成内容，已降级为资料不足提示。";
          finalLore = insufficientEvidenceLore(meta, insufficientReason);
          pushTrace("gemini.verify.insufficient", { reason: insufficientReason });
        } else if (verify.action === "low_risk") {
          pushTrace("gemini.verify.low_risk", {
            summary: verify.report?.summary,
            overall_confidence: verify.report?.overall_confidence
          });
        } else if (verify.action === "sanitized") {
          pushTrace("gemini.verify.sanitized", verify.tracePayload);
        } else if (!verify.tracePayload.skipped) {
          pushTrace("gemini.verify.pass", {
            overall_confidence: verify.report?.overall_confidence,
            outcome: verify.report?.outcome
          });
        }
      } else {
        pushTrace("gemini.verify.skipped", {
          reason: "non_blocking_prod_path"
        });
      }

      if (outcomeKind === "success") {
        const claimSafety = sanitizeLoreAgainstEvidence(finalLore, kept);
        finalLore = claimSafety.value;
        pushTrace("claim_safety", {
          removed_claims: claimSafety.removedClaims,
          downgraded_fields: claimSafety.downgradedFields
        });
        const crossCardDedupe = dedupeLoreAcrossCards(finalLore);
        finalLore = crossCardDedupe.value;
        pushTrace("cross_card_dedupe", {
          removed_fields: crossCardDedupe.removedCount
        });
      }

      const rag: RagResult = {
        task_type: "work_lore",
        rounds_used: round + 1,
        queries_tried,
        evidence_pack: pack,
        status: outcomeKind === "success" ? "ok" : "insufficient_evidence",
        insufficient_reason: insufficientReason,
        trace
      };

      const base: AdaptiveRunResult = {
        kind: outcomeKind,
        meta,
        lore: finalLore,
        rag
      };

      if (debugMode) {
        base.debugReport = buildDebugReport({
          input_query: userQuery.trim(),
          analyzer: analyzed,
          max_rounds_config: maxRounds,
          secondRoundTriggered,
          roundsDebug,
          promptEvidence: cloneEvidenceForDebug(kept),
          prompt_ids: kept.map((e) => e.id),
          promptLength: prompt.length,
          promptFull: prompt,
          lore: finalLore,
          outcome: outcomeKind === "success" ? "success" : "insufficient_evidence",
          geminiVerification
        });
      }

      return base;
    }
  }

  const evalFinal =
    lastEvaluation ?? evaluateEvidence(q0, allEvidence, meta, topK);
  const kept = allEvidence.filter((e) => evalFinal.top_k_ids.includes(e.id));
  const pack = buildEvidencePack(
    kept.length > 0 ? kept : allEvidence.slice(0, Math.min(topK, allEvidence.length))
  );

  const reason =
    "未达到覆盖面阈值：需要 AniList 或 Bangumi 结构化信息，以及维基/萌娘/Bangumi 叙述或足够硬元数据（已尝试多轮检索）。";

  const rag: RagResult = {
    task_type: "work_lore",
    rounds_used: maxRounds,
    queries_tried,
    evidence_pack: pack,
    status: "insufficient_evidence",
    insufficient_reason: reason,
    trace
  };

  pushTrace("insufficient", { reason, queries_tried });

  const insufficientLore = insufficientEvidenceLore(meta, reason);

  const base: AdaptiveRunResult = {
    kind: "insufficient_evidence",
    meta,
    lore: insufficientLore,
    rag
  };

  if (debugMode) {
    const fallbackKept =
      kept.length > 0
        ? kept
        : allEvidence.slice(0, Math.min(topK, allEvidence.length));
    base.debugReport = buildDebugReport({
      input_query: userQuery.trim(),
      analyzer: analyzed,
      max_rounds_config: maxRounds,
      secondRoundTriggered,
      roundsDebug,
      promptEvidence: cloneEvidenceForDebug(fallbackKept),
      prompt_ids: fallbackKept.map((e) => e.id),
      promptLength: undefined,
      promptFull: undefined,
      lore: insufficientLore,
      outcome: "insufficient_evidence"
    });
  }

  return base;
}

function buildDebugReport(args: {
  input_query: string;
  analyzer: AnalyzerResult;
  max_rounds_config: number;
  secondRoundTriggered: boolean;
  roundsDebug: RagDebugRound[];
  promptEvidence: Evidence[];
  prompt_ids: string[];
  promptLength?: number;
  promptFull?: string;
  lore: LorePayload | null;
  outcome: "success" | "insufficient_evidence";
  geminiVerification?: Record<string, unknown>;
}): RagDebugReport {
  const includePrompt = process.env.RAG_DEBUG_INCLUDE_PROMPT === "true";
  return {
    input_query: args.input_query,
    analyzer: args.analyzer,
    max_rounds_config: args.max_rounds_config,
    second_round_triggered: args.secondRoundTriggered,
    rounds: args.roundsDebug,
    prompt_evidence: args.promptEvidence,
    prompt_evidence_ids: args.prompt_ids,
    prompt_character_count: args.promptLength,
    prompt_full_text: includePrompt ? args.promptFull : undefined,
    lore_json: args.lore,
    outcome: args.outcome,
    gemini_verification: args.geminiVerification ?? null
  };
}
