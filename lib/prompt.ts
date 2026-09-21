/**
 * 本文件改动：
 * - `buildLorePromptFromAdaptive` 增加可选参数 `previousHeadlines`（默认 []），
 *   用于「换一批」时在主 Prompt 末尾追加去重/换角度的说明（四卡顺序：LEGACY/MEME/BEHIND/LINEAGE）。
 * - 对齐 legacy 的写作丰满度：迁移四卡「核心问题/优先内容」式指导；弱化「公开资料未提及」类占位；
 *   分层表达证据强弱（具体事实 / 中文社区说法 / 弱相关 hedging / 减 point）。
 */
import { WorkMeta, type LoreCardId, type SeenContentByCard } from "@/lib/types";
import { MoegirlContext } from "@/lib/data-sources";
import type { Evidence } from "@/lib/rag/types";
import { summarizeSourceRoles } from "@/lib/rag/evaluator";
import {
  COMMUNITY_SOURCES,
  CONTEXT_SOURCES,
  HARD_FACT_SOURCES
} from "@/lib/rag/source-policy";

/** 四卡正文全局禁止：百科式基础信息不得出现在任何卡片字段中 */
const CARD_FORBIDDEN_BASE_INFO = `
[四卡正文禁止项 · 全局 · 必须遵守]
四张卡片的 **headline / intro / points** 中**一律不得出现**下列百科式基础信息（即便证据包或 AniList 结构化字段里有）：
- **播出平台**（流媒体、电视台、独家配信等）
- **集数**（总话数、季数、每季话数、SP/OVA 数量等）
- **制作公司**（动画制作、制作委员会、studio 名单）
- **播出时间**（首播日、完结日、周几更新、档期、季度开播年月作为「资讯句」等）
以上信息仅作你理解背景的参考，**不属于任何一张卡的内容范围**；请改写为口碑、梗、幕后、作品关系等主题内容。
`.trim();

export type LorePromptRegenContext = {
  /** 各板块已看过的 headline / intro / points（仅与同板块比较） */
  seenContentByCard?: SeenContentByCard;
  /** @deprecated 兼容旧客户端；优先使用 seenContentByCard */
  previousHeadlines?: string[];
  regenAttempt?: number;
};

const REGEN_CARD_LABELS: Record<LoreCardId, string> = {
  legacy: "LEGACY · 封神还是翻车",
  meme: "MEME · 梗从哪来",
  behind: "BEHIND · 幕后现场",
  lineage: "LINEAGE · 家族树"
};

function buildSeenContentRegenBlock(seen: SeenContentByCard, attempt?: number): string {
  const sections = (["legacy", "meme", "behind", "lineage"] as LoreCardId[])
    .map((id) => {
      const items = (seen[id] || []).filter((s) => s.trim().length > 0);
      if (items.length === 0) {
        return `### ${REGEN_CARD_LABELS[id]}\n（该板块暂无历史，但仍需换新角度）`;
      }
      const lines = items.map((t, i) => `${i + 1}. ${t.slice(0, 500)}`).join("\n");
      return `### ${REGEN_CARD_LABELS[id]}\n用户已在该板块看过以下内容（**仅本板块**去重，勿与其它板块混比）：\n${lines}`;
    })
    .join("\n\n");

  const attemptLine =
    attempt != null && attempt > 1
      ? `\n这是第 ${attempt} 次换一批尝试，必须与下列所有已看过表述明显区分。\n`
      : "";

  return `
[换一批 · 按板块独立去重 · 必须遵守]${attemptLine}
用户点击了「换一批」。下方按 **四个板块分别** 列出该板块历史内容；生成时 **每个板块只避开本板块** 的列表，**不要** 用 A 板块的历史去限制 B 板块。

${sections}

[换一批写作硬性要求]
- 每个板块的 **headline、intro、每一条 points** 都不得与 **该板块** 上述历史 **完全相同或近似复述**（换同义词也算重复）。
- **不得跨板块** 互相限制或复制句式。
- 宁可 **每张卡只写 2 条 points**，也不要为了凑满 3 条而重复旧角度。
- 只有在证据包对该板块 **确实没有新侧面** 时，才允许极少量措辞接近；优先换证据里尚未用过的信息点。
- bottom_hook 可与首屏不同，但勿复制某张卡已写过的核心观点。
`.trim();
}

/** 自适应 RAG：以证据包为主，写作风格与 legacy 四卡指导对齐。 */
export function buildLorePromptFromAdaptive(
  meta: WorkMeta,
  evidenceItems: Evidence[],
  communityHint: string,
  regenContext?: LorePromptRegenContext
): string {
  const hasAnilist = evidenceItems.some((e) => e.source === "anilist");
  const hasWikipedia = evidenceItems.some((e) => e.source === "wikipedia");
  const hasMoegirl = evidenceItems.some((e) => e.source === "moegirl");
  const hasBangumi = evidenceItems.some((e) => e.source === "bangumi");
  const hasBilibili = evidenceItems.some((e) => e.source === "bilibili");
  const hasNga = evidenceItems.some((e) => e.source === "nga");
  const roles = summarizeSourceRoles(evidenceItems);
  const coreSourcesMissing =
    !hasAnilist && !hasWikipedia && !hasMoegirl && !hasBangumi;

  const evidenceBlock = evidenceItems
    .map(
      (e) =>
        `### ${e.id} [${e.source}]
title: ${e.title}
url: ${e.url || "N/A"}
retrieval_query: ${e.retrieval_query}
---
${e.snippet}`
    )
    .join("\n\n");

  const hardList = HARD_FACT_SOURCES.join(" / ");
  const contextList = CONTEXT_SOURCES.join(" / ");
  const communityList = COMMUNITY_SOURCES.join(" / ");

  const base = `
你是一个资深二次元文化研究者，同时是社区活跃多年的普通观众。
请**主要依据**下方 [证据包]，并参考 AniList 结构化摘要，为《${meta.title}》生成四张内容卡片（中文）。
不要捏造：具体分集剧情转折、精确评分数字、未见于证据的获奖名单或争议判决。

[来源策略 · source policy · 必须遵守]
- **硬事实**（官方标题、官方作品关系、可查证的制作轶事/staff、历史事件等）：**只能**依据 ${hardList} 证据；冲突时优先 AniList，其次 Bangumi，再 Wikipedia。**注意**：硬事实用于核对，但「四卡正文禁止项」中的平台/集数/制作公司/播出时间仍不得写入卡片正文。
- **中文二次元语境**（梗、圈内说法、设定解释、中文译名习惯）：可用 ${contextList}；**不得**仅凭萌娘百科单独断言制作/播出等硬事实。
- **社区观点**（${communityList}）：**只能**写成观众/社区视角，例如「有观众认为」「社区讨论中常见的说法是」「专栏里有人提到」；**禁止**写成官方定论或制作方表态。
- 当前证据包角色：硬事实源=[${roles.hard_fact.join(", ") || "无"}]；语境源=[${roles.context.join(", ") || "无"}]；社区源=[${roles.community.join(", ") || "无"}]。

[证据来源与诚实写作 · 分层策略]
- **有明确证据（硬事实源）**：写具体事实，尽量带上人名、事件、年份、作品名、传播语境之一。
- **证据主要来自 moegirl 等中文社区叙述**：用「中文社区常见说法」「讨论里常提到」等 framing，不写死成官方定论。
- **证据来自 B站专栏 / 阿苇岛 / NGA**：必须用社区观点 framing，不得提升为事实。
- **证据弱但与主题相关**：可用「有观众会把它理解为…」「常被联系到一起谈到…」，勿当作设定或事实断言。
- **某张卡可用片段少**：**减少 points（可 1～2 条）**，从证据里能写的侧面写满，**不要**用空话搪塞。
- **禁止使用**：「公开资料未提及」「公开资料未显示」及同义套话（包括「未见于公开资料」类模板句）。
- **「资料不足」类总结**：仅当证据包中 **AniList / Bangumi / Wikipedia / 萌娘 四类核心来源均无证据** 时才允许（当前：AniList=${hasAnilist ? "有" : "无"}；Bangumi=${hasBangumi ? "有" : "无"}；Wikipedia=${hasWikipedia ? "有" : "无"}；萌百=${hasMoegirl ? "有" : "无"}；B站专栏=${hasBilibili ? "有" : "无"}；NGA=${hasNga ? "有" : "无"}）。${coreSourcesMissing ? "当前核心来源皆无，可极简说明资料不足。" : "当前至少有一类核心来源，**禁止**用「资料不足」敷衍整张卡。"}

[结构化参考 · AniList（与证据 anilist 条目一致；硬事实以本节为准）]
- title: ${meta.title}
- nativeTitle: ${meta.nativeTitle || "N/A"}
- season/year: ${meta.season || "N/A"} ${meta.seasonYear ?? ""}
- studios: ${(meta.studios || []).join(" / ") || "N/A"}
- cover: ${meta.coverImage || "N/A"}
- anilistId（用于 source_urls 中 AniList 链接）: ${meta.anilistId ?? "N/A"}

[证据包 · 引用时请在心里对应 evidence id，source 字段写入卡片 source]
${evidenceBlock || "（无）"}

[社区检索提示（仅用于补充语境关键词，非独立事实来源）]
${communityHint}

[四张卡片定义与写作指导]
[四卡分工与跨卡去重 · 必须遵守]
- 同一个事实、梗、人物关系或争议只能在最适合的一张卡中出现一次；其它卡必须换证据、换问题，不能同义复述。
- LEGACY 负责口碑与历史位置，MEME 负责传播与玩梗，BEHIND 负责创作过程，LINEAGE 负责类型谱系和作品关系。
- 生成完四卡后逐条比对 headline、intro 和 points；若两张卡都在讲同一件事，保留信息更完整的一处，另一处改用尚未使用的证据。
- 宁可某张卡少写一条 point，也不要跨卡凑数或重复。

01 LEGACY · 封神还是翻车
- 核心问题：这部作品在社区里的真实口碑与历史位置是什么？
- 优先写：口碑、历史定位、社区反响、争议或转折；可写完结后评价如何变化，**不要**写首播日/平台/集数/制作公司。

02 MEME · 梗从哪来
- 核心问题：这部作品在社区里留下了什么、怎样被玩梗与再传播？
- 优先写：名台词、社区梗、传播语境、中文圈说法；区分「出处可考」与「社区演绎」。
- **无 B站/NGA 证据时**：用萌娘 / Bangumi / Wikipedia 中的语境与标签写「中文社区常见说法」，**不要**因缺少专栏/论坛证据而整张卡写资料不足。

03 BEHIND · 幕后现场
- 核心问题：制作背后有哪些可查的故事与现场感？
- 优先写：监督/脚本/声优的创作选择、现场轶事、取舍与彩蛋；无证据不写细节，可换有证据的侧面。**不要**写播出平台、档期、集数、制作公司名单。

04 LINEAGE · 家族树
- 核心问题：这部作品从哪里来，又影响了哪里去？
- 三条要点分别写：
  - 上游：它受哪部作品启发，或站在谁的肩膀上（精神前作）
  - 下游：它启发了什么作品，或被谁视为精神源头（精神续作/影响）
  - 同源：同一核心班底（至少两人以上同时参与）合力完成的另一部作品
- 禁止：
  - 不要写「关联一」「关联二」「关联三」这种编号标签
  - 不要单独介绍某个人还做了什么其他作品
  - 三条要点必须都是具体的作品名，不是人物介绍

[信息筛选规则]
- 每条 points 尽量「具体事实 / 具体说法 + 为什么重要或有趣」；避免纯剧情复述、常识句、空泛夸赞。
- 硬信息冲突时，优先 AniList / Bangumi / Wikipedia；萌娘与 B站/NGA 仅作补充且语气降级。
- 不确定信息用「据说 / 有说法认为」标注。

${CARD_FORBIDDEN_BASE_INFO}

[写作要求]
- 语气像朋友安利，有温度，不像百科。
- 每张卡：**intro 固定 1 句**，要具体、有信息，不要泛泛「这部作品很有趣」。
- **points 优先 3 条**；证据撑得住就写满；撑不住就减到 1～2 条，**不要用占位句凑数**。
- source 写明来源域名，示例：via AniList · Wikipedia · zh.moegirl.org.cn
- 每张卡必须包含 source_urls（字符串数组），规则见下节。

[来源链接 source_urls]
每张卡片的 JSON 必须包含 source_urls 数组：只填入**本张卡片正文实际依据**的页面完整 URL（https://...）；可多条；不确定或无法对应到具体页面则保持空数组 []。
- 若依据来自英文维基百科，填该条目的英文 Wikipedia 页面 URL（https://en.wikipedia.org/wiki/...）。
- 若依据来自萌娘百科，填上文「Moegirl page」中给出的 zh.moegirl.org.cn 页面完整 URL。
- 若依据来自 AniList 结构化数据，且上文 anilistId 为数字，填 https://anilist.co/anime/{id}（{id} 即该数字）；无可靠 id 则不填此项。
- 若依据来自 Bangumi，填证据条目的 bgm.tv subject URL。
- 若依据来自 B站专栏 / 阿苇岛（aweidao1.com）/ NGA，填对应证据 url；且正文须保持社区观点语气。
- 若依据来自证据包，优先填入该证据条目的 url 字段（须为完整 URL）；无 url 则不填。
- 不要编造未在资料或证据中出现的 URL。

[作品名书写]
- 凡 JSON 中需要填写作品名的字段（含 work_title、bottom_hook.work、LINEAGE 卡 points 中点名的其他作品、cards 全文里出现的番剧作品名等），**必须使用中文译名**，不使用英文原名或罗马字。

[底部推荐 bottom_hook]
- bottom_hook.work 必须是与《${meta.title}》不同的另一部作品，绝对不能填写《${meta.title}》本身或它的别名。

输出 JSON（不要输出额外解释）：
{
  "work_title": "作品名",
  "cards": [
    {"id":"legacy","en_label":"LEGACY","zh_name":"封神还是翻车","headline":"","intro":"","points":["","",""],"source":"","source_urls":[]},
    {"id":"meme","en_label":"MEME","zh_name":"梗从哪来","headline":"","intro":"","points":["","",""],"source":"","source_urls":[]},
    {"id":"behind","en_label":"BEHIND","zh_name":"幕后现场","headline":"","intro":"","points":["","",""],"source":"","source_urls":[]},
    {"id":"lineage","en_label":"LINEAGE","zh_name":"家族树","headline":"","intro":"","points":["","",""],"source":"via AniList","source_urls":[]}
  ],
  "bottom_hook": {"work":"","hook":""}
}
`.trim();

  const seen = regenContext?.seenContentByCard;
  const hasSeen =
    seen &&
    (["legacy", "meme", "behind", "lineage"] as LoreCardId[]).some(
      (id) => (seen[id]?.length ?? 0) > 0
    );

  if (hasSeen && seen) {
    return `${base}\n\n${buildSeenContentRegenBlock(seen, regenContext?.regenAttempt)}`;
  }

  const previousHeadlines = regenContext?.previousHeadlines ?? [];
  if (previousHeadlines.length > 0) {
    const h0 = previousHeadlines[0] ?? "";
    const h1 = previousHeadlines[1] ?? "";
    const h2 = previousHeadlines[2] ?? "";
    const h3 = previousHeadlines[3] ?? "";
    const regenBlock = `
注意：用户已经看过一个版本的内容，请从不同角度切入生成这次的卡片。
上一版本的四个标题是：
- LEGACY：${h0}
- MEME：${h1}
- BEHIND：${h2}
- LINEAGE：${h3}
请避免重复相同的切入角度，但信息仍需基于真实资料。
`.trim();
    return `${base}\n\n${regenBlock}`;
  }

  return base;
}

export function buildLorePrompt(
  meta: WorkMeta,
  wikiSummary: string,
  communityHint: string,
  moegirlContext: MoegirlContext | null
): string {
  return `
你是一个资深二次元文化研究者，同时是社区活跃多年的普通观众。
请基于给定资料，为《${meta.title}》生成四张内容卡片（中文）。

[事实源优先级]
1) AniList 结构化信息（用于核对背景，**不得**把平台/集数/制作公司/播出时间写进四卡正文）
2) Wikipedia 叙述信息作为第二层
3) 中文社区语境（可联网检索，建议关键词：${communityHint}）仅作为补充，不可覆盖前两层硬信息

[已知资料]
- AniList title: ${meta.title}
- AniList native title: ${meta.nativeTitle || "N/A"}
- AniList season/year: ${meta.season || "N/A"} ${meta.seasonYear || ""}
- AniList studios: ${(meta.studios || []).join(" / ") || "N/A"}
- AniList id（用于 source_urls 中 AniList 链接）: ${meta.anilistId ?? "N/A"}
- Wikipedia summary:
${wikiSummary || "N/A"}
- Moegirl page:
${moegirlContext ? `${moegirlContext.title} | ${moegirlContext.url}` : "N/A"}
- Moegirl extract:
${moegirlContext?.extract || "N/A"}

[四张卡片定义]
01 LEGACY · 封神还是翻车
- 核心问题：这部作品在社区里的真实口碑是什么？
- 优先内容：社区反响、时间验证后的口碑变化、历史定位、关键争议点与双方立场；**不要**写播出平台/集数/制作公司/播出时间。

02 MEME · 梗从哪来
- 核心问题：这部作品在社区里留下了什么，影响了什么？
- 优先内容：梗起源与原语境、社区约定俗成玩法、对后来作品的影响、破圈痕迹。

03 BEHIND · 幕后现场
- 核心问题：制作背后有什么鲜为人知的故事？
- 优先内容：创作起源、制作过程中的意外决定、创作者私货与隐喻、制作彩蛋、声优/制作组趣事。

04 LINEAGE · 家族树
- 核心问题：这部作品从哪里来，又影响了哪里去？
- 三条要点分别写：
  - 上游：它受哪部作品启发，或站在谁的肩膀上（精神前作）
  - 下游：它启发了什么作品，或被谁视为精神源头（精神续作/影响）
  - 同源：同一核心班底（至少两人以上同时参与）合力完成的另一部作品
- 禁止：
  - 不要写「关联一」「关联二」「关联三」这种编号标签
  - 不要单独介绍某个人还做了什么其他作品
  - 三条要点必须都是具体的作品名，不是人物介绍

[信息筛选规则]
- 每条 points 必须是“具体事实 + 为什么重要/影响了什么”。
- 避免纯剧情复述、常识句、空泛夸赞。
- 硬信息冲突时，优先 AniList/Wikipedia；社区来源仅做补充。
- 不确定信息必须标注“据说/有说法认为”。
- 若某卡资料不足，可写 2 条 points，不要编造。

${CARD_FORBIDDEN_BASE_INFO}

[写作要求]
- 语气像朋友安利，有温度，不像百科。
- 每张卡片包含：headline / intro / points(3条) / source / **source_urls**（见下节）。
- 若信息不确定，用“据说/有说法认为”标注。
- source 写明来源域名，示例：via AniList · Wikipedia · zh.moegirl.org.cn
- 若某维度资料不足，可减少到2条 points，但不要编造。
- 若使用萌娘百科信息，优先引用上方提供的页面与摘要，不要凭空扩展。

[来源链接 source_urls]
每张卡片的 JSON 必须包含 **source_urls** 字符串数组：只填入**本张卡片正文实际依据**的页面完整 URL（https://...）；可多条；不确定或无法对应到具体页面则保持 **[]**。
- 若依据来自英文维基百科（本任务使用的 Wikipedia 摘要），填该条目的 **en.wikipedia.org** 页面完整 URL。
- 若依据来自萌娘百科，填上文「Moegirl page」中给出的 **zh.moegirl.org.cn** 页面完整 URL。
- 若依据来自 AniList 本作条目，且上文 AniList id 为数字，填 https://anilist.co/anime/{id}；无可靠数字 id 则不填此项。
- 不要编造未在资料中出现的 URL。

[作品名书写]
- 凡 JSON 中需要填写作品名的字段（含 work_title、bottom_hook.work、LINEAGE 卡 points 中点名的其他作品、cards 全文里出现的番剧作品名等），**必须使用中文译名**，不使用英文原名或罗马字。

[底部推荐 bottom_hook]
- bottom_hook.work 必须是与《${meta.title}》不同的另一部作品，绝对不能填写《${meta.title}》本身或它的别名。

输出 JSON（不要输出额外解释）：
{
  "work_title": "作品名",
  "cards": [
    {"id":"legacy","en_label":"LEGACY","zh_name":"封神还是翻车","headline":"","intro":"","points":["","",""],"source":"","source_urls":[]},
    {"id":"meme","en_label":"MEME","zh_name":"梗从哪来","headline":"","intro":"","points":["","",""],"source":"","source_urls":[]},
    {"id":"behind","en_label":"BEHIND","zh_name":"幕后现场","headline":"","intro":"","points":["","",""],"source":"","source_urls":[]},
    {"id":"lineage","en_label":"LINEAGE","zh_name":"家族树","headline":"","intro":"","points":["","",""],"source":"via AniList","source_urls":[]}
  ],
  "bottom_hook": {"work":"","hook":""}
}
`.trim();
}

/**
 * @deprecated 首页冷知识已改为 planColdTopic + buildColdHookPrompt + 证据包，见 lib/cold-hook-prompt.ts
 */
export const HOME_HOOK_PROMPT = "(deprecated)";
