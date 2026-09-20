import { COLD_PROMPT_VERSION } from "@/lib/cold-prompt-version";
import { isUsableColdHookRecord, readColdHookStore } from "@/lib/cold-hook-store";
import { enrichColdRecommendations } from "@/lib/hook-enrich";
import type { ColdHookRecord } from "@/lib/cold-types";
import type { RoamCard, RoamCardTag, RoamCardType } from "@/lib/roam/roam-types";
import type { ColdHookPayload, ColdRecommendationEnriched, ColdSubtype } from "@/lib/types";

const tagByTopicType: Record<ColdHookRecord["topic_type"], RoamCardTag> = {
  work: "作品",
  concept: "概念",
  phenomenon: "社区"
};

function fallbackSubtypeFromRecord(record: ColdHookRecord): ColdSubtype {
  const text = `${record.topic_key} ${record.hook} ${record.angle ?? ""}`;
  if (/梗|万策尽|声优/.test(text)) return "meme_origin";
  if (/制作|幕后|委员会|工期|作画|PV/.test(text)) return "production_note";
  if (/社区|观众|粉丝|党争|评分|口碑/.test(text)) return "community_take";
  if (/角色|名字|别名|小黑/.test(text)) return "character_fact";
  if (record.topic_type === "concept") return "concept_origin";
  return "work_fact";
}

function tagFromType(type: RoamCardType, record: ColdHookRecord): RoamCardTag {
  if (type === "meme_origin") return "梗";
  if (type === "production_note") return "幕后";
  if (type === "staff_fact") return "幕后";
  if (type === "genre_trope" || type === "trope_explanation") return "谱系";
  if (type === "term_origin" || type === "concept_origin") return "概念";
  if (type === "community_discussion") return "社区";
  if (type === "community_take") return "社区";
  return tagByTopicType[record.topic_type];
}

function trimBlurb(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 90) return normalized;
  const firstSentence = normalized.match(/^.{35,90}?[。！？]/)?.[0];
  if (firstSentence && firstSentence.length >= 35) return firstSentence;
  return `${normalized.slice(0, 86)}…`;
}

function targetFromRecord(record: ColdHookRecord, type: RoamCardType): RoamCard["target"] {
  if (type !== "work_fact" && type !== "character_fact") {
    const title = record.topic_key.split(":")[1] || record.hook.slice(0, 16);
    return { kind: "cold", title, href: "/cold" };
  }
  const firstRec = record.recommendations.find((r) => r.anilistId || r.anime_title);
  if (firstRec) {
    const title = firstRec.anime_title || firstRec.reason.slice(0, 20);
    return {
      kind: "work",
      title,
      href: `/work/${encodeURIComponent(title)}`
    };
  }
  const title = record.topic_key.split(":")[1] || record.hook.slice(0, 16);
  return {
    kind: "work",
    title,
    href: `/work/${encodeURIComponent(title)}`
  };
}

function nextSeedsFromRecord(record: ColdHookRecord): string[] {
  const seeds = [
    record.topic_key.split(":")[1],
    record.angle,
    ...record.recommendations.map((r) => r.anime_title),
    ...record.recommendations.map((r) => r.reason.split(/[，。,.]/)[0])
  ].filter((s): s is string => Boolean(s && s.trim()));
  return [...new Set(seeds.map((s) => s.trim()))].slice(0, 5);
}

async function payloadFromRecord(
  record: ColdHookRecord,
  type: ColdSubtype
): Promise<ColdHookPayload> {
  const recommendations: ColdRecommendationEnriched[] = await enrichColdRecommendations(
    record.recommendations,
    { resolveMissingIds: false }
  );
  return {
    topic_type: record.topic_type,
    cold_subtype: type,
    topic_key: record.topic_key,
    hook: record.hook,
    blurb: record.blurb,
    angle: record.angle,
    example_bridge: record.example_bridge,
    insight: record.insight,
    quiz: record.quiz ?? null,
    source_urls: record.source_urls,
    verification_status: record.verification_status,
    confidence: record.confidence,
    prompt_version: record.prompt_version,
    recommendations
  };
}

export async function coldRecordToRoamCard(record: ColdHookRecord): Promise<RoamCard> {
  const type = record.cold_subtype ?? fallbackSubtypeFromRecord(record);
  const coldPayload = await payloadFromRecord(record, type);
  return {
    id: `cold-${record.id}`,
    type,
    tag: tagFromType(type, record),
    hook: record.hook,
    blurb: record.blurb?.trim() || trimBlurb(record.insight),
    target: targetFromRecord(record, type),
    cold_payload: coldPayload,
    source_urls: record.source_urls,
    confidence: record.confidence ?? 0.6,
    verification_status: record.verification_status,
    next_seeds: nextSeedsFromRecord(record),
    topic_key: record.topic_key
  };
}

export async function readRoamCardsFromColdLibrary(): Promise<RoamCard[]> {
  const records = readColdHookStore().filter(
    (record) => record.prompt_version === COLD_PROMPT_VERSION && isUsableColdHookRecord(record)
  );
  return Promise.all(records.map(coldRecordToRoamCard));
}
