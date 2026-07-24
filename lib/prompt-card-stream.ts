import { LORE_CARD_META } from "@/lib/lore-card-meta";
import type { Evidence } from "@/lib/rag/types";
import type { LoreCardId, WorkMeta } from "@/lib/types";

const CARD_GUIDANCE: Record<LoreCardId, string> = {
  legacy: `LEGACY · 封神还是翻车
- 核心问题：这部作品在社区里的真实口碑与历史位置是什么？
- 优先写：口碑、历史定位、社区反响、争议或转折；不要写首播日/平台/集数/制作公司。`,
  meme: `MEME · 梗从哪来
- 核心问题：这部作品在社区里留下了什么、怎样被玩梗与再传播？
- 优先写：名台词、社区梗、传播语境、中文圈说法。`,
  behind: `BEHIND · 幕后现场
- 核心问题：制作背后有哪些可查的故事与现场感？
- 优先写：监督/脚本/声优的创作选择、现场轶事、取舍与彩蛋。`,
  lineage: `LINEAGE · 家族树
- 核心问题：这部作品从哪里来，又影响了哪里去？
- 三条要点分别写：上游精神前作、下游影响、同源班底另一部作品；每条必须是具体作品名。`
};

export function buildSingleCardStreamPrompt(
  meta: WorkMeta,
  evidenceItems: Evidence[],
  communityHint: string,
  cardId: LoreCardId
): string {
  const cardMeta = LORE_CARD_META[cardId];
  const evidenceBlock = evidenceItems
    .map(
      (e) =>
        `### ${e.id} [${e.source}]
title: ${e.title}
url: ${e.url || "N/A"}
---
${e.snippet}`
    )
    .join("\n\n");

  return `
你是资深二次元文化研究者。请**仅**为《${meta.title}》生成**一张**卡片（${cardMeta.en_label} · ${cardMeta.zh_name}），中文写作，语气像朋友安利。

[本卡定义]
${CARD_GUIDANCE[cardId]}

[结构化参考 · AniList]
- title: ${meta.title}
- nativeTitle: ${meta.nativeTitle || "N/A"}
- season/year: ${meta.season || "N/A"} ${meta.seasonYear ?? ""}
- anilistId: ${meta.anilistId ?? "N/A"}

[证据包]
${evidenceBlock || "（无）"}

[社区检索提示（非独立事实）]
${communityHint}

[禁止]
- 四卡正文不得写播出平台、集数、制作公司、播出时间。
- 不要捏造未见于证据的具体剧情转折或精确评分。
- 禁止使用「公开资料未提及」类套话。

[输出格式 · 必须严格遵守 · 不要输出 JSON]
只输出下列区块标签与内容，不要 markdown 代码块，不要额外解释：

HEADLINE:
（一句话标题）

INTRO:
（1 句 intro，具体有信息）

POINT 1:
（要点 1）

POINT 2:
（要点 2）

POINT 3:
（要点 3，证据不足可写「（略）」）

SOURCE:
（来源域名，示例 via AniList · Wikipedia）

SOURCE_URLS:
（每行一个完整 https URL，无则留空）
`.trim();
}

export function buildBottomHookStreamPrompt(meta: WorkMeta, workTitle: string): string {
  return `
为《${meta.title}》生成底部推荐 bottom_hook，JSON 仅此对象，不要 markdown：
{"work":"另一部中文译名作品","hook":"一句吸引人的关联说明"}
要求：work 必须与《${workTitle}》不同；作品名用中文译名。
`.trim();
}
