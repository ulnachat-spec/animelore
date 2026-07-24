import type {
  ColdContrastAngle,
  ColdEvidence,
  ConceptWritingAngle
} from "@/lib/cold-types";

/** 正文禁用：只保留明显百科/教程腔，不拦 few-shot 认可的口语句式 */
export const COLD_INSIGHT_BANNED_PHRASES = [
  "指的是",
  "则是",
  "指某",
  "本来多指",
  "常被用来",
  "用于形容",
  "真正懂的人",
  "懂的都懂",
  "这才是核心",
  "不过核心还是那点",
  "不妨把它当成",
  "两种要分开看",
  "这不是严格",
  "不等于",
  "也要说清楚",
  "比较常见的说法是",
  "可以先把它理解成",
  "若想理解",
  "建议你回看",
  "由此可见",
  "综上所述"
] as const;

/** 推荐 reason 禁用：说明文入口腔 */
export const COLD_REC_REASON_BANNED = [
  "适合通过",
  "适合作为理解",
  "很适合作为理解",
  "是理解.*的入口"
] as const;

export const COLD_INSIGHT_SOURCE_BAN =
  /据\s*(Bangumi|萌娘|维基|wikipedia|AniList|anilist)|\b(Bangumi|萌娘百科)\b.*显示|某网站标记|条目显示|标签显示/i;

/** 无证据时不应出现的「定论式」语源表述 */
export const COLD_STRONG_CLAIM_PATTERN =
  /最早见于|首次出现|起源于|官方定义|首创|发明了|定义了「|被发明/i;

/** hook 过于泛泛的标题结构 */
export const COLD_HOOK_BANNED_QUESTION =
  /是什么[？?]?$|^你了解|关于.*的.*件事/;

export function insightHasBannedPhrases(insight: string): string | null {
  for (const p of COLD_INSIGHT_BANNED_PHRASES) {
    if (insight.includes(p)) return p;
  }
  return null;
}

export function recReasonHasBannedPhrases(reason: string): string | null {
  for (const p of COLD_REC_REASON_BANNED) {
    if (p.includes(".*")) {
      if (new RegExp(p).test(reason)) return p;
    } else if (reason.includes(p)) return p;
  }
  return null;
}

export function insightAvoidsSourceCitations(insight: string): boolean {
  return !COLD_INSIGHT_SOURCE_BAN.test(insight);
}

export function evidenceSupportsStrongClaims(
  insight: string,
  evidence: ColdEvidence[]
): boolean {
  if (!COLD_STRONG_CLAIM_PATTERN.test(insight)) return true;
  const blob = evidence
    .filter((e) => e.role === "hard_fact")
    .map((e) => `${e.title}\n${e.snippet}`)
    .join("\n");
  if (!blob.trim()) return false;
  const matches = insight.match(COLD_STRONG_CLAIM_PATTERN) ?? [];
  for (const m of matches) {
    const key = m.replace(/[「」]/g, "").slice(0, 4);
    if (key.length >= 2 && !blob.includes(key)) return false;
  }
  return true;
}

/** 提取 insight 第一句（到首个句末标点） */
export function insightFirstSentence(insight: string): string {
  const trimmed = insight.trim();
  const m = trimmed.match(/^[^。！？\n]+[。！？]?/);
  return (m?.[0] ?? trimmed.slice(0, 80)).trim();
}

/** 只过滤明显泛标题，不要求反差断言 */
export function hookLooksSpecificEnough(hook: string): boolean {
  const h = hook.trim();
  if (!h || COLD_HOOK_BANNED_QUESTION.test(h)) return false;
  return h.length >= 4;
}

/** @deprecated 使用 hookLooksSpecificEnough */
export function hookHasCuriosity(hook: string): boolean {
  return hookLooksSpecificEnough(hook);
}

export const CONCEPT_ANGLE_LABELS: Record<ConceptWritingAngle, string> = {
  etymology: "语源型：词从哪来、原意如何、后来怎么变形",
  archetype: "角色原型型：早期/典型角色是谁、为何被反复引用",
  misuse: "社区误用型：中文社区怎么用宽了、和原意差在哪",
  lineage: "谱系型：从早期作品到现代，概念如何演化",
  counterintuitive: "反直觉型：以为是 A，其实更接近 B"
};

export const CONTRAST_ANGLE_LABELS: Record<ColdContrastAngle, string> = {
  expectation: "常识反差：以为坏事/冷门，结果出圈或成名场面",
  identity: "身份反差：路人/工具人反而成符号",
  reputation: "评价反差：当年被骂，后来变梗或封神",
  production: "制作反差：限制反而形成风格",
  community: "社区反差：官方没强调，粉丝玩成传统"
};
