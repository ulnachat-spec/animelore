import { conceptRecEntriesForSeed } from "@/lib/cold-concept-rec-pool";
import { fetchAniListMediaBriefBatch } from "@/lib/data-sources";
import type { ColdEvidence, ColdTopicPlan } from "@/lib/cold-types";
import type { ColdRecommendationRaw } from "@/lib/types";

export type ColdRecommendationCandidate = {
  candidate_id: string;
  anilistId: number;
  verifiedTitle: string;
  countryOfOrigin: string;
  reason_seed: string;
  relation_seed: string;
  priority: number;
  /** 正文与推荐闭环：优先选入的 2 部 */
  is_primary?: boolean;
  allowNonJapanese?: boolean;
};

export type RecommendationShortfallReason =
  | "not_enough_verified_candidates"
  | "recommendation_filtered_by_country"
  | "recommendation_relation_too_weak"
  | "llm_insufficient_picks";

export type FinalizeRecommendationsResult = {
  recommendations: ColdRecommendationRaw[];
  target_count: number;
  actual_count: number;
  shortfall_reason?: RecommendationShortfallReason;
};

type WhitelistEntry = {
  anilistId: number;
  reason_seed: string;
  priority?: number;
};

const TOPIC_WHITELIST: Record<string, WhitelistEntry[]> = {
  "work:作画崩坏出圈": [
    { anilistId: 100722, reason_seed: "第三季那些崩脸截图传得很凶，骂声和热度一起上来了", priority: 1 },
    { anilistId: 101198, reason_seed: "崩坏感作为搞笑风格", priority: 2 },
    { anilistId: 21087, reason_seed: "工期与作画密度落差", priority: 3 }
  ],
  "work:柯南黑衣人": [
    { anilistId: 235, reason_seed: "黑衣组织成员有名字与分工", priority: 1 },
    { anilistId: 1419, reason_seed: "柯南宇宙相关短篇与反派符号", priority: 2 }
  ],
  "work:时间循环番": [
    { anilistId: 9253, reason_seed: "因果与信息差驱动循环", priority: 1 },
    { anilistId: 849, reason_seed: "漫无止境的八月", priority: 2 },
    { anilistId: 21355, reason_seed: "轮回代价", priority: 3 }
  ],
  "phenomenon:声优结婚": [
    { anilistId: 11654, reason_seed: "能看到声优工作和粉丝期待怎么缠在一起", priority: 1 },
    { anilistId: 21584, reason_seed: "偶像/声优企划与粉丝投射", priority: 2 },
    { anilistId: 5680, reason_seed: "宅梗很多，角色和声优的玩笑也容易被带出来", priority: 3 }
  ],
  "work:分季口碑反转": [
    { anilistId: 16498, reason_seed: "前后季间隔久，观众心态和风评都变了", priority: 1 },
    { anilistId: 9253, reason_seed: "前期慢热、后期评价抬升", priority: 2 },
    { anilistId: 21087, reason_seed: "两季作画与节奏对比常被提起", priority: 3 }
  ],
  "work:争议改编": [
    { anilistId: 101922, reason_seed: "改编后节奏和观感会变，粉丝很容易拿原作来对比", priority: 1 },
    { anilistId: 113415, reason_seed: "原作与动画表现差异话题", priority: 2 },
    { anilistId: 21459, reason_seed: "长篇改编的节奏取舍", priority: 3 }
  ],
  "work:制作事故": [
    { anilistId: 21087, reason_seed: "第二季作画质量争议", priority: 1 },
    { anilistId: 11757, reason_seed: "长篇一忙起来，作画密度很容易被观众盯上", priority: 2 },
    { anilistId: 20605, reason_seed: "单集作画崩坏名场面", priority: 3 }
  ],
  "work:长尾经典": [
    { anilistId: 1, reason_seed: "完结多年后仍被补番推荐", priority: 1 },
    { anilistId: 30, reason_seed: "播完很多年还总有人翻出来聊", priority: 2 },
    { anilistId: 5680, reason_seed: "播完后二创与安利持续", priority: 3 }
  ],
  "work:冷门佳作": [
    { anilistId: 9766, reason_seed: "播放不高但口碑稳定", priority: 1 },
    { anilistId: 30831, reason_seed: "小众题材补番安利", priority: 2 },
    { anilistId: 486, reason_seed: "单元剧补番口碑", priority: 3 }
  ],
  "phenomenon:轻改热潮": [
    { anilistId: 849, reason_seed: "轻改黄金期代表", priority: 1 },
    { anilistId: 101922, reason_seed: "异世界轻改热度", priority: 2 },
    { anilistId: 11757, reason_seed: "套路很热闹，友情和开挂都摆在明面上", priority: 3 }
  ],
  "phenomenon:原创动画风险": [
    { anilistId: 9756, reason_seed: "原创企划话题度", priority: 1 },
    { anilistId: 101349, reason_seed: "原创电影口碑样本", priority: 2 },
    { anilistId: 154587, reason_seed: "近年原创话题", priority: 3 }
  ],
  "phenomenon:声优偶像化": [
    { anilistId: 849, reason_seed: "角色和声优绑定太深，粉丝反应也会被放大", priority: 1 },
    { anilistId: 5680, reason_seed: "角色歌与声优活动", priority: 2 },
    { anilistId: 21698, reason_seed: "电影声优宣传模式", priority: 3 }
  ],
  "phenomenon:番剧评分膨胀": [
    { anilistId: 101922, reason_seed: "热度高的时候，分数和吵架经常一起涨", priority: 1 },
    { anilistId: 154587, reason_seed: "一火起来，评分和安利就会到处刷屏", priority: 2 },
    { anilistId: 162033, reason_seed: "口碑发酵节奏", priority: 3 }
  ],
  "phenomenon:动画工房化": [
    { anilistId: 12189, reason_seed: "一看那种细腻日常和小动作，就很容易想到京阿尼", priority: 1 },
    { anilistId: 2167, reason_seed: "公司画风辨识度", priority: 2 },
    { anilistId: 5680, reason_seed: "日常系作画风格", priority: 3 }
  ],
  "phenomenon:续作断档": [
    { anilistId: 9756, reason_seed: "续作消息一拖，大家就开始喊有生之年", priority: 1 },
    { anilistId: 12189, reason_seed: "第二季问了很多年，问到都快成梗了", priority: 2 },
    { anilistId: 16498, reason_seed: "分季间隔与企划消息", priority: 3 }
  ],
  "phenomenon:PV欺诈": [
    { anilistId: 162033, reason_seed: "PV 与正片气质对照", priority: 1 },
    { anilistId: 154587, reason_seed: "宣传与正片节奏", priority: 2 },
    { anilistId: 101349, reason_seed: "战斗作画宣传镜头", priority: 3 }
  ],
  "phenomenon:制作委员会": [
    { anilistId: 21698, reason_seed: "大电影背后牵涉宣传、发行和投资，不只是导演一个人说了算", priority: 1 },
    { anilistId: 30, reason_seed: "经典 TV 制作背景", priority: 2 },
    { anilistId: 16498, reason_seed: "这种大企划背后人和公司都很多，锅也没法只甩给一个人", priority: 3 }
  ]
};

const DEFAULT_WHITELIST: WhitelistEntry[] = [
  { anilistId: 9253, reason_seed: "很多人都拿它举例，讨论基础比较稳", priority: 1 },
  { anilistId: 10165, reason_seed: "常被拿来举例的日本 TV 动画", priority: 2 },
  { anilistId: 12189, reason_seed: "补番话题多的作品", priority: 3 }
];

const TARGET_REC_COUNT = 2;

function extractAnilistIdFromEvidence(evidence: ColdEvidence[]): number | null {
  for (const e of evidence) {
    const m = e.url.match(/anilist\.co\/anime\/(\d+)/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

export function cjkLen(s: string): number {
  return [...s.trim()].length;
}

function extractCjkTerms(text: string): string[] {
  return [...new Set(text.match(/[\u4e00-\u9fff]{2,}/g) ?? [])];
}

function whitelistEntriesForPlan(plan: ColdTopicPlan): WhitelistEntry[] {
  if (plan.topic_type === "concept") {
    const conceptEntries = conceptRecEntriesForSeed(plan.seed_keyword);
    if (conceptEntries.length > 0) {
      return conceptEntries.map((e) => ({
        anilistId: e.anilistId,
        reason_seed: e.relation_seed,
        priority: e.priority
      }));
    }
  }
  return TOPIC_WHITELIST[plan.topic_key] ?? DEFAULT_WHITELIST;
}

export async function buildColdRecommendationCandidates(
  plan: ColdTopicPlan,
  evidence: ColdEvidence[]
): Promise<ColdRecommendationCandidate[]> {
  const entries = whitelistEntriesForPlan(plan);
  const anchorId = extractAnilistIdFromEvidence(evidence);
  const idMap = new Map<number, { reason_seed: string; priority: number }>();

  for (const e of entries) {
    const prev = idMap.get(e.anilistId);
    const pri = e.priority ?? 99;
    if (!prev || pri < prev.priority) {
      idMap.set(e.anilistId, { reason_seed: e.reason_seed, priority: pri });
    }
  }
  if (anchorId && !idMap.has(anchorId)) {
    idMap.set(anchorId, {
      reason_seed: `与「${plan.seed_keyword}」相关的可查条目`,
      priority: 50
    });
  }

  const briefs = await fetchAniListMediaBriefBatch([...idMap.keys()]);
  const out: ColdRecommendationCandidate[] = [];

  for (const [anilistId, meta] of idMap) {
    const brief = briefs.get(anilistId);
    if (!brief) continue;
    if (brief.countryOfOrigin !== "JP") continue;
    out.push({
      candidate_id: `cand_${anilistId}`,
      anilistId: brief.anilistId,
      verifiedTitle: brief.title,
      countryOfOrigin: brief.countryOfOrigin,
      reason_seed: meta.reason_seed,
      relation_seed: meta.reason_seed,
      priority: meta.priority
    });
  }

  out.sort((a, b) => a.priority - b.priority);
  for (let i = 0; i < Math.min(TARGET_REC_COUNT, out.length); i++) {
    out[i].is_primary = true;
  }

  return out.slice(0, 8);
}

export function getPrimaryCandidates(
  candidates: ColdRecommendationCandidate[]
): ColdRecommendationCandidate[] {
  const primaries = candidates.filter((c) => c.is_primary);
  if (primaries.length >= TARGET_REC_COUNT) return primaries.slice(0, TARGET_REC_COUNT);
  return candidates.slice(0, TARGET_REC_COUNT);
}

export function formatCandidatesForPrompt(candidates: ColdRecommendationCandidate[]): string {
  if (candidates.length === 0) {
    return "（无可用候选，recommendations 请输出空数组 []）";
  }
  const primaries = getPrimaryCandidates(candidates);
  const primaryIds = new Set(primaries.map((p) => p.candidate_id));
  const lines = candidates.map((c) => {
    const tag = primaryIds.has(c.candidate_id) ? "【优先推荐】" : "【备选】";
    return `${tag}\n- candidate_id: ${c.candidate_id}\n  title: ${c.verifiedTitle}\n  写作提示: ${c.relation_seed}`;
  });
  if (primaries.length >= TARGET_REC_COUNT) {
    lines.unshift(
      `当候选≥2 时，recommendations 必须恰好包含以下 ${TARGET_REC_COUNT} 个 candidate_id（顺序可换）：\n${primaries.map((p) => p.candidate_id).join("、")}`
    );
  }
  return lines.join("\n\n");
}

export function formatInsightAnchors(candidates: ColdRecommendationCandidate[]): string {
  const primaries = getPrimaryCandidates(candidates);
  if (primaries.length === 0) return "（没有固定例子）";
  return primaries
    .map(
      (c, i) =>
        `${i + 1}. 《${c.verifiedTitle}》（candidate_id: ${c.candidate_id}）\n   可以怎么聊：${c.relation_seed}`
    )
    .join("\n");
}

export type LlmRecommendationPick = {
  candidate_id: string;
  reason: string;
};

function reasonLinksToTopic(
  reason: string,
  plan: ColdTopicPlan,
  candidate: ColdRecommendationCandidate
): boolean {
  const terms = [
    ...extractCjkTerms(plan.seed_keyword),
    ...extractCjkTerms(candidate.relation_seed),
    ...extractCjkTerms(plan.topic_key.split(":")[1] || ""),
    ...extractCjkTerms(candidate.verifiedTitle.replace(/[《》]/g, ""))
  ];
  const unique = [...new Set(terms)].filter((t) => t.length >= 2);
  if (unique.length === 0) return true;
  const hit = unique.filter((t) => reason.includes(t));
  return hit.length >= 1;
}

function trimToCjkRange(text: string, min: number, max: number): string {
  let s = text.trim();
  if (cjkLen(s) > max) {
    const chars = [...s];
    s = chars.slice(0, max).join("");
    while (cjkLen(s) > max) s = s.slice(0, -1);
  }
  const pad = "看这部就知道了。";
  while (cjkLen(s) < min && cjkLen(pad) > 0) {
    const need = min - cjkLen(s);
    s += pad.slice(0, Math.min(need, pad.length));
  }
  return s;
}

export function buildTemplateRecommendationReason(
  candidate: ColdRecommendationCandidate,
  plan: ColdTopicPlan
): string {
  const title = candidate.verifiedTitle;
  const templates = [
    `看这部能直观看到：${candidate.relation_seed}`,
    `这部里的${candidate.relation_seed}，就是很好懂的例子。`,
    `如果想感受这个梗为什么会流行，《${title}》很适合当入口。`
  ];
  const base = templates[candidate.priority % templates.length];
  return trimToCjkRange(base, 20, 90);
}

/**
 * 将 LLM 的 candidate_id 选择解析为可 enrich 的推荐；非法项丢弃。
 */
export function resolveLlmRecommendationPicks(
  picks: LlmRecommendationPick[],
  candidates: ColdRecommendationCandidate[],
  plan: ColdTopicPlan
): ColdRecommendationRaw[] {
  const byId = new Map(candidates.map((c) => [c.candidate_id, c]));
  const out: ColdRecommendationRaw[] = [];
  const used = new Set<string>();

  for (const pick of picks) {
    if (out.length >= TARGET_REC_COUNT) break;
    const cand = byId.get(pick.candidate_id);
    if (!cand || used.has(cand.candidate_id)) continue;
    const reason = pick.reason?.trim() ?? "";
    const len = cjkLen(reason);
    if (len < 16 || len > 100) continue;
    if (!reasonLinksToTopic(reason, plan, cand)) continue;
    used.add(cand.candidate_id);
    out.push({
      candidate_id: cand.candidate_id,
      anilistId: cand.anilistId,
      anime_title: cand.verifiedTitle,
      reason
    });
  }
  return out;
}

/**
 * 默认补齐 2 条推荐；不足时记录 shortfall_reason 供 debug。
 */
export function finalizeColdRecommendations(
  llmPicks: LlmRecommendationPick[],
  candidates: ColdRecommendationCandidate[],
  plan: ColdTopicPlan
): FinalizeRecommendationsResult {
  const target = TARGET_REC_COUNT;
  let shortfall: RecommendationShortfallReason | undefined;

  if (candidates.length < target) {
    return {
      recommendations: resolveLlmRecommendationPicks(llmPicks, candidates, plan),
      target_count: target,
      actual_count: 0,
      shortfall_reason: "not_enough_verified_candidates"
    };
  }

  let resolved = resolveLlmRecommendationPicks(llmPicks, candidates, plan);
  const byId = new Map(candidates.map((c) => [c.candidate_id, c]));
  const used = new Set(resolved.map((r) => r.candidate_id));

  const fillOrder = [
    ...getPrimaryCandidates(candidates),
    ...candidates.filter((c) => !c.is_primary)
  ];

  for (const cand of fillOrder) {
    if (resolved.length >= target) break;
    if (used.has(cand.candidate_id)) continue;
    const reason = buildTemplateRecommendationReason(cand, plan);
    if (!reasonLinksToTopic(reason, plan, cand)) continue;
    used.add(cand.candidate_id);
    resolved.push({
      candidate_id: cand.candidate_id,
      anilistId: cand.anilistId,
      anime_title: cand.verifiedTitle,
      reason
    });
    if (!shortfall) shortfall = "llm_insufficient_picks";
  }

  if (resolved.length < target) {
    const reason: RecommendationShortfallReason =
      candidates.length < target
        ? "not_enough_verified_candidates"
        : "recommendation_relation_too_weak";
    return {
      recommendations: resolved,
      target_count: target,
      actual_count: resolved.length,
      shortfall_reason: shortfall ?? reason
    };
  }

  resolved = resolved.slice(0, target);

  if (resolved.length === 1) {
    return {
      recommendations: resolved,
      target_count: target,
      actual_count: 1,
      shortfall_reason: shortfall ?? "recommendation_relation_too_weak"
    };
  }

  return {
    recommendations: resolved,
    target_count: target,
    actual_count: resolved.length,
    shortfall_reason: undefined
  };
}
