import {
  evidenceSupportsStrongClaims,
  hookLooksSpecificEnough,
  insightAvoidsSourceCitations,
  insightFirstSentence,
  insightHasBannedPhrases
} from "@/lib/cold-fact-rules";
import type { ColdEvidence, ColdVerificationResult, HomeHookRawV2 } from "@/lib/cold-types";
import {
  cjkLen,
  getPrimaryCandidates,
  type ColdRecommendationCandidate
} from "@/lib/cold-recommendation-candidates";
import { evidenceUrls } from "@/lib/cold-rag";
import { isGeminiVerifyEnabled } from "@/lib/gemini-verifier";
import type { ColdSubtype } from "@/lib/types";

const COLD_SUBTYPES: ColdSubtype[] = [
  "concept_origin",
  "term_origin",
  "meme_origin",
  "work_fact",
  "character_fact",
  "production_note",
  "staff_fact",
  "genre_trope",
  "trope_explanation",
  "community_discussion",
  "community_take"
];

const SOURCE_NAME_PATTERN = /Bangumi|Wikipedia|AniList|萌娘百科|维基|anilist/i;
const QUIZ_DISCUSSION_PATTERN = /为什么|如何|怎么样|如何理解|怎么理解|到底.*什么/;
const QUIZ_SUBJECTIVE_PATTERN =
  /最可怕|最感人|最有名|最重要|影响力|常被认为|适合理解|感觉|观众觉得|容易让人想到|核心在于|真正|厉害|好看|出圈|常被拿来|常被用来|社区|讨论|更适合|很适合|代名词|代表|典型|耐聊|耐看/;
const QUIZ_INTERNAL_META_PATTERN =
  /不是纯概念闲聊|作品语境|继续点进|详情核对|正文里保留|可以继续|内部|prompt|校验|验证器|元说明/;
const QUIZ_OBJECTIVE_FACT_PATTERN =
  /获得|获奖|奖项|奥斯卡|播出|首播|上映|发行|集数|第[一二三四五六七八九十\d]+[集话]|OP|ED|片头|片尾|演唱|作词|作曲|配乐|导演|监督|执导|脚本|声优|配音|制作公司|改编自|原作|漫画|小说|名字|本名|代号|酒名|标题|官方|资料|设定|出自|来自|出处|公开|第\d+届|角色|主角|成员|组织|能力|读心|义体|公安九课|飞船|道具|Bebop|人体炼成|故事开端|秘密身份|杀手|间谍|超能力|由.+(制作|创作|演唱|配乐|执导)/;
const QUIZ_RESTRICTED_SUBTYPES = new Set<ColdSubtype>([
  "concept_origin",
  "term_origin",
  "genre_trope",
  "trope_explanation",
  "community_discussion",
  "community_take"
]);
const INSIGHT_VAGUE_FILLER_PATTERN =
  /细节密度|成长试炼|童话外壳|异世界工作场|关键词堆砌|很有东西|很有意思但|值得一提的是/;
const INSIGHT_FOCUS_CONNECTOR_PATTERN =
  /因为|所以|于是|但|而是|也就是说|换句话说|这让|这件事|这个点|关键|真正|厉害的地方|好玩的地方|有趣的地方|能让|会让|正是/;
const INSIGHT_FORCED_CONTRAST_PATTERN =
  /不是[^。！？!?]{2,36}而是|不只是[^。！？!?]{2,36}而是|不在于[^。！？!?]{2,36}而在于/;
const INSIGHT_LAYERED_ALTERNATIVE_PATTERN =
  /一层|另一层|先看|再看|后来|原本|原义|出处|语境|迁移|使用|中文.*社区|粉丝社区|二次元.*语境|玩梗|解读|官方设定|严肃结论/;
const INSIGHT_DISCLAIMER_TAIL_PATTERN =
  /(?:不是严格[^。！？!?]{0,48}|不等于[^。！？!?]{0,48}|并不代表[^。！？!?]{0,48}|不能作为[^。！？!?]{0,48}|这里只是[^。！？!?]{0,48}|这里说的是[^。！？!?]{0,48}不是[^。！？!?]{0,48}|更像是?[^。！？!?]{0,48}而不是[^。！？!?]{0,48}|不应理解为[^。！？!?]{0,48})$/;
const INSIGHT_MECHANICAL_DISCLAIMER_PATTERN =
  /(?:不是严格[^。！？!?]{0,60}|不等于[^。！？!?]{0,60}|并不代表[^。！？!?]{0,60}|不能作为[^。！？!?]{0,60}|这里只是[^。！？!?]{0,60}|这里说的是[^。！？!?]{0,60}不是[^。！？!?]{0,60}|更像是?[^。！？!?]{0,60}而不是[^。！？!?]{0,60}|不应理解为[^。！？!?]{0,60})/;
const INSIGHT_CONTEXTUAL_BOUNDARY_PATTERN =
  /常见说法|一般会追溯到|后来|语境|中文.*社区|粉丝社区|观众|大家|二次元|玩梗|二创|解读|说法|拿来聊|拿来形容|越聊越顺手|传播|流行|顺手贴到/;
const CONCEPT_CONTEXT_SUBTYPES = new Set<ColdSubtype>([
  "concept_origin",
  "term_origin",
  "meme_origin",
  "genre_trope",
  "trope_explanation",
  "community_discussion",
  "community_take"
]);
const INSIGHT_TOPIC_CLUSTERS = [
  /奥斯卡|获奖|奖项|票房|海外|国际/,
  /宫崎骏|新海诚|监督|导演|制作公司|声优|配乐|久石让/,
  /澡堂|汤婆婆|河神|无脸男|名字被|神怪|民俗|规则/,
  /角色|主角|千寻|真嗣|柯南|新一|阿尼亚/,
  /成长|主题|寓言|身份|劳动|创伤|救赎|世界观/,
  /OP|ED|标题|名字|代号|台词|梗/
];

function fallbackColdSubtype(raw: HomeHookRawV2): ColdSubtype {
  if (raw.topic_type === "concept") return "concept_origin";
  if (raw.topic_type === "work") return "work_fact";
  const text = `${raw.topic_key} ${raw.hook} ${raw.angle ?? ""}`;
  if (/制作|PV|作画|总集篇|委员会|工期|档期|播出/.test(text)) {
    return "production_note";
  }
  return "community_take";
}

function extractCheckTokens(text: string): string[] {
  const tokens: string[] = [];
  const cjk = text.match(/[\u4e00-\u9fff]{2,6}/g) ?? [];
  tokens.push(...cjk);
  const latin = text.match(/[A-Za-z]{4,}/g) ?? [];
  tokens.push(...latin.map((s) => s.toLowerCase()));
  return [...new Set(tokens)].slice(0, 24);
}

function insightSupportedByEvidence(insight: string, evidence: ColdEvidence[]): boolean {
  const blob = evidence.map((e) => `${e.title}\n${e.snippet}`).join("\n");
  const tokens = extractCheckTokens(insight);
  if (tokens.length === 0) return true;
  const hits = tokens.filter((t) => blob.includes(t));
  return hits.length >= Math.min(2, Math.max(1, Math.ceil(tokens.length * 0.15)));
}

function extractCjkTerms(text: string): string[] {
  return [...new Set(text.match(/[\u4e00-\u9fff]{2,}/g) ?? [])];
}

function insightLoopsWithPrimaries(
  insight: string,
  candidates: ColdRecommendationCandidate[]
): boolean {
  const primaries = getPrimaryCandidates(candidates);
  if (primaries.length === 0) return true;

  let anchorHits = 0;
  for (const p of primaries) {
    if (insight.includes(p.verifiedTitle)) {
      anchorHits += 1;
      continue;
    }
    const titleTerms = extractCjkTerms(p.verifiedTitle);
    if (titleTerms.some((t) => t.length >= 2 && insight.includes(t))) {
      anchorHits += 1;
      continue;
    }
    const seedTerms = extractCjkTerms(p.relation_seed).filter((t) => t.length >= 3);
    if (seedTerms.some((t) => insight.includes(t))) anchorHits += 1;
  }
  return anchorHits >= 1;
}

function quizInvalidReason(raw: HomeHookRawV2): string | null {
  if (!raw.quiz) return null;
  const statement = raw.quiz.statement?.trim();
  const explanation = raw.quiz.explanation?.trim();
  if (!statement || typeof raw.quiz.answer !== "boolean" || !explanation) {
    return "quiz 字段不完整";
  }
  if (/[？?]\s*$/.test(statement)) return "quiz.statement 不应是问句";
  if (QUIZ_DISCUSSION_PATTERN.test(statement)) return "quiz.statement 含讨论式措辞";
  if (QUIZ_SUBJECTIVE_PATTERN.test(statement)) return "quiz.statement 含主观判断词";
  if (QUIZ_INTERNAL_META_PATTERN.test(`${statement} ${explanation}`)) {
    return "quiz 含内部提示语";
  }
  if (!QUIZ_OBJECTIVE_FACT_PATTERN.test(statement)) {
    return "quiz.statement 缺少可核验事实锚点";
  }
  const subtype = raw.cold_subtype ?? fallbackColdSubtype(raw);
  if (QUIZ_RESTRICTED_SUBTYPES.has(subtype) && !/(语源|出处|出自|来自|名字|标题|代号|官方|资料|设定|首播|上映|发行|改编自)/.test(statement)) {
    return `${subtype} 默认不生成 quiz`;
  }
  const explanationLen = cjkLen(explanation);
  if (explanationLen < 12 || explanationLen > 80) {
    return `quiz.explanation 长度不合规 (${explanationLen} 字，期望 12～80)`;
  }
  if (QUIZ_SUBJECTIVE_PATTERN.test(explanation)) return "quiz.explanation 含主观判断词";
  return null;
}

function lastInsightSentence(insight: string): string {
  const sentences = insight
    .trim()
    .split(/[。！？!?]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.at(-1) ?? insight.trim();
}

function validateInsightDisclaimerTone(insight: string): string[] {
  const reasons: string[] = [];
  const last = lastInsightSentence(insight);

  if (INSIGHT_DISCLAIMER_TAIL_PATTERN.test(last)) {
    reasons.push("insight 结尾是生硬免责声明，应回到趣味点、观看兴趣或作品关联");
  }

  if (INSIGHT_MECHANICAL_DISCLAIMER_PATTERN.test(insight)) {
    reasons.push("insight 含机械免责声明表达，应改成融入语境的温和说法");
  }

  return reasons;
}

function validateInsightSingleFocus(raw: HomeHookRawV2): string[] {
  const reasons: string[] = [];
  const insight = raw.insight.trim();
  if (INSIGHT_VAGUE_FILLER_PATTERN.test(insight)) {
    reasons.push("insight 含空泛套话或无明确含义的比喻");
  }

  const firstSentence = insight.split(/[。！？!?]\s*/).find(Boolean) ?? "";
  if (cjkLen(firstSentence) < 16) {
    reasons.push("insight 开头未直接说明中心趣味点");
  }

  const clusterHits = INSIGHT_TOPIC_CLUSTERS.filter((re) => re.test(insight)).length;
  if (clusterHits >= 4 && !INSIGHT_FOCUS_CONNECTOR_PATTERN.test(insight)) {
    reasons.push("insight 涉及多个话题但缺少因果或递进关系");
  }

  const separatorCount = (insight.match(/、/g) ?? []).length;
  if (clusterHits >= 4 && separatorCount >= 5) {
    reasons.push("insight 疑似堆砌作品关键词");
  }

  if (INSIGHT_FORCED_CONTRAST_PATTERN.test(insight) && !INSIGHT_LAYERED_ALTERNATIVE_PATTERN.test(insight)) {
    reasons.push("insight 使用套路化「不是……而是……」且未给出分层/沿革关系");
  }
  reasons.push(...validateInsightDisclaimerTone(insight));

  const subtype = raw.cold_subtype ?? fallbackColdSubtype(raw);
  if (CONCEPT_CONTEXT_SUBTYPES.has(subtype)) {
    const hasOrigin = /原本|原义|出处|来自|追溯|字面意思|早期|最早|常见说法/.test(insight);
    const hasMigration = /后来|语境|迁移|中文.*社区|粉丝社区|二次元|动画制作|被用来|常被用来/.test(insight);
    const hasBoundary = INSIGHT_CONTEXTUAL_BOUNDARY_PATTERN.test(insight);
    if (!hasOrigin || !hasMigration) {
      reasons.push("概念/术语/梗类 insight 缺少出处原义或语境迁移");
    }
    if ((subtype === "meme_origin" || subtype === "community_discussion" || subtype === "community_take") && !hasBoundary) {
      reasons.push("梗/社区类 insight 缺少事实与解读边界");
    }
  }

  return reasons;
}

function validateMetaFields(raw: HomeHookRawV2): string[] {
  const reasons: string[] = [];

  if (!hookLooksSpecificEnough(raw.hook)) {
    reasons.push("hook 为空或过于泛泛");
  }

  const insightLen = cjkLen(raw.insight);
  if (insightLen < 80 || insightLen > 420) {
    reasons.push(`insight 长度不合规 (${insightLen} 字，期望 150～280)`);
  }

  const banned = insightHasBannedPhrases(raw.insight);
  if (banned) reasons.push(`insight 含禁用表达: ${banned}`);
  reasons.push(...validateInsightSingleFocus(raw));

  const subtype = raw.cold_subtype ?? fallbackColdSubtype(raw);
  raw.cold_subtype = subtype;
  if (!COLD_SUBTYPES.includes(subtype)) {
    reasons.push(`cold_subtype 非法: ${String(subtype)}`);
  }

  const blurb = raw.blurb?.trim();
  if (!blurb) {
    reasons.push("blurb 为空");
  } else {
    const blurbLen = cjkLen(blurb);
    if (blurbLen < 35 || blurbLen > 80) {
      reasons.push(`blurb 长度不合规 (${blurbLen} 字，期望 35～80)`);
    }
    const insightHead = raw.insight.replace(/\s+/g, "").slice(0, Math.max(12, blurb.length));
    if (insightHead.startsWith(blurb.replace(/\s+/g, "").slice(0, 24))) {
      reasons.push("blurb 不应直接截取 insight 开头");
    }
    if (SOURCE_NAME_PATTERN.test(blurb)) {
      reasons.push("blurb 不应包含来源名");
    }
  }

  if (raw.quiz) {
    const invalidQuiz = quizInvalidReason(raw);
    if (invalidQuiz) {
      raw.quiz = null;
    }
  }

  return reasons;
}

function validateRecommendationPicks(
  raw: HomeHookRawV2,
  candidates: ColdRecommendationCandidate[]
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!raw.recommendations?.length) {
    if (candidates.length >= 2) reasons.push("recommendations 为空但候选充足");
    return { ok: reasons.length === 0, reasons };
  }

  const byId = new Set(candidates.map((c) => c.candidate_id));
  for (const rec of raw.recommendations) {
    if (!rec.candidate_id || !byId.has(rec.candidate_id)) {
      reasons.push(`非法 candidate_id: ${rec.candidate_id}`);
      continue;
    }
    if (!rec.anilistId) reasons.push(`缺少 anilistId: ${rec.candidate_id}`);
    const len = cjkLen(rec.reason || "");
    if (len < 16 || len > 100) {
      reasons.push(`reason 长度不合规 (${len} 字): ${rec.candidate_id}`);
    }
  }

  const primaries = getPrimaryCandidates(candidates);
  if (primaries.length >= 2 && raw.recommendations.length < 2) {
    reasons.push(`recommendations 仅 ${raw.recommendations.length} 条，期望 2 条`);
  }

  const ok =
    reasons.length === 0 &&
    raw.recommendations.every((r) => r.anilistId) &&
    raw.recommendations.length <= 2;
  return { ok, reasons };
}

async function optionalLlmCheck(
  raw: HomeHookRawV2,
  evidence: ColdEvidence[]
): Promise<{ checked: boolean; reject: boolean; note?: string }> {
  if (!isGeminiVerifyEnabled()) {
    return { checked: false, reject: false, note: "gemini_disabled" };
  }
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return { checked: false, reject: false, note: "no_api_key" };
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
    const firstLine = insightFirstSentence(raw.insight);
    const prompt = `你是冷知识事实质检员。对照 evidence 判断是否有明显编造，不要因为风格没完全贴合模板就拒绝。

核心标准：
1. 具体年份、最早/首次、官方定义、具体人物事件是否有证据支撑。
2. 推荐作品是否在候选范围内已由服务端验证。
3. 只有明显编造或明显来源误读才 ok=false。

只输出 JSON: {"ok":true|false,"note":"一句中文"}
hook: ${raw.hook}
insight_first_sentence: ${firstLine}
full_insight: ${raw.insight.slice(0, 600)}
evidence: ${evidence.map((e) => e.snippet.slice(0, 350)).join("\n---\n")}`;
    const resp = await ai.models.generateContent({ model, contents: prompt });
    const text = resp.text?.trim() || "{}";
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as {
      ok?: boolean;
      note?: string;
    };
    return {
      checked: true,
      reject: parsed.ok === false,
      note: parsed.note
    };
  } catch (e) {
    const msg = (e as Error).message || "";
    if (/429|quota|rate/i.test(msg)) {
      return { checked: false, reject: false, note: "gemini_429_skipped" };
    }
    return { checked: false, reject: false, note: `gemini_error_skipped: ${msg.slice(0, 80)}` };
  }
}

export async function verifyColdHook(input: {
  raw: HomeHookRawV2;
  evidence: ColdEvidence[];
  candidates?: ColdRecommendationCandidate[];
  allowEmptySources?: boolean;
  allowSingleRecommendation?: boolean;
}): Promise<ColdVerificationResult> {
  const reasons: string[] = [];
  const { raw, evidence, allowEmptySources, candidates = [], allowSingleRecommendation } =
    input;

  const urls =
    raw.source_urls?.length > 0 ? raw.source_urls : evidenceUrls(evidence);
  if (!allowEmptySources && urls.length === 0) reasons.push("source_urls 为空");

  if (!raw.hook?.trim() || !raw.insight?.trim()) {
    reasons.push("hook 或 insight 为空");
  }

  reasons.push(...validateMetaFields(raw));

  if (!insightAvoidsSourceCitations(raw.insight)) {
    reasons.push("insight 含无意义来源引用句");
  }

  if (!evidenceSupportsStrongClaims(raw.insight, evidence)) {
    reasons.push("insight 含无证据支撑的「最早/起源」等定论表述");
  }

  if (raw.recommendations.length > 0 || candidates.length >= 2) {
    const recCheck = validateRecommendationPicks(raw, candidates);
    if (!recCheck.ok) {
      const filtered = allowSingleRecommendation
        ? recCheck.reasons.filter((r) => !r.startsWith("recommendations 仅"))
        : recCheck.reasons;
      reasons.push(...filtered);
    }
  }

  const rulesPassed = reasons.length === 0;

  let llm_checked = false;
  let llm_note: string | undefined;
  if (rulesPassed) {
    const llm = await optionalLlmCheck(raw, evidence);
    llm_checked = llm.checked;
    llm_note = llm.note;
    if (llm.reject) reasons.push(`LLM 校验: ${llm.note || "reject"}`);
  }

  let status: ColdVerificationResult["status"] = "verified";
  if (!rulesPassed || reasons.some((r) => r.startsWith("LLM 校验:"))) {
    status = "failed";
  } else if (!llm_checked) {
    status = "skipped";
  }

  return {
    ok: status === "verified" || status === "skipped",
    status,
    reasons,
    rules_passed: rulesPassed,
    llm_checked,
    llm_note
  };
}
