import type { Evidence } from "@/lib/rag/types";
import type { LoreCard, LorePayload } from "@/lib/types";

const ATTRIBUTION_PATTERN =
  /(?:采访中|访谈中|接受采访|曾表示|表示过|透露|坦言|回应称|官方宣布|制作组表示|导演表示|监督表示)/i;
const ATTRIBUTION_EVIDENCE_PATTERN =
  /(?:采访|访谈|interview|曾表示|表示过|透露|坦言|回应称|官方宣布|official announcement)/i;
const METRIC_PATTERN =
  /(?:评分|得分|销量|票房|播放量|收视率|占比|比例|集数|话数|册数|排名)[^\d０-９]{0,12}(\d+(?:\.\d+)?%?|[０-９]+(?:\．[０-９]+)?％?)/gi;

export interface LoreClaimSafetyResult<T> {
  value: T;
  removedClaims: number;
  downgradedFields: number;
}

function evidenceCorpus(evidence: Evidence[]): string {
  return evidence
    .map((item) =>
      [
        item.title,
        item.snippet,
        item.url ?? "",
        item.structured ? JSON.stringify(item.structured) : ""
      ].join("\n")
    )
    .join("\n\n")
    .normalize("NFKC")
    .toLowerCase();
}

function normalizedCompact(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function unsupportedAttribution(text: string, corpus: string): boolean {
  if (!ATTRIBUTION_PATTERN.test(text)) return false;

  const compactClaim = normalizedCompact(text);
  const compactCorpus = normalizedCompact(corpus);
  if (compactClaim.length >= 12 && compactCorpus.includes(compactClaim)) return false;

  return !ATTRIBUTION_EVIDENCE_PATTERN.test(corpus);
}

function unsupportedMetrics(text: string, corpus: string): boolean {
  const values = Array.from(text.matchAll(METRIC_PATTERN), (match) =>
    (match[1] ?? "").normalize("NFKC").toLowerCase()
  ).filter(Boolean);

  return values.some((value) => !corpus.includes(value));
}

function isUnsupportedHighRiskClaim(text: string, corpus: string): boolean {
  return unsupportedAttribution(text, corpus) || unsupportedMetrics(text, corpus);
}

export function sanitizeLoreCardAgainstEvidence(
  card: LoreCard,
  evidence: Evidence[]
): LoreClaimSafetyResult<LoreCard> {
  const corpus = evidenceCorpus(evidence);
  let removedClaims = 0;
  let downgradedFields = 0;

  const headline = isUnsupportedHighRiskClaim(card.headline, corpus)
    ? "这项档案仍待更多来源核实"
    : card.headline;
  if (headline !== card.headline) {
    removedClaims += 1;
    downgradedFields += 1;
  }

  const intro = isUnsupportedHighRiskClaim(card.intro, corpus)
    ? "当前证据包不足以确认这项具体说法，暂不作为确定事实展示。"
    : card.intro;
  if (intro !== card.intro) {
    removedClaims += 1;
    downgradedFields += 1;
  }

  const points = card.points.filter((point) => {
    const unsupported = isUnsupportedHighRiskClaim(point, corpus);
    if (unsupported) removedClaims += 1;
    return !unsupported;
  });

  return {
    value: {
      ...card,
      headline,
      intro,
      points
    },
    removedClaims,
    downgradedFields
  };
}

export function sanitizeLoreAgainstEvidence(
  lore: LorePayload,
  evidence: Evidence[]
): LoreClaimSafetyResult<LorePayload> {
  let removedClaims = 0;
  let downgradedFields = 0;
  const cards = lore.cards.map((card) => {
    const result = sanitizeLoreCardAgainstEvidence(card, evidence);
    removedClaims += result.removedClaims;
    downgradedFields += result.downgradedFields;
    return result.value;
  });

  return {
    value: { ...lore, cards },
    removedClaims,
    downgradedFields
  };
}
