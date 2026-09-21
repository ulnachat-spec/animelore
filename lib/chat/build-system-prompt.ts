import { formatCardsForChatContext } from "@/lib/chat/format-cards-context";
import { CHAT_ASSISTANT_NAME, CHAT_PERSONA_PROMPT } from "@/lib/chat/persona";
import type { LoreCard, WorkMeta } from "@/lib/types";

function safeTitle(title: string): string {
  return title.replaceAll("<", "＜").replaceAll(">", "＞").trim();
}

function formatWorkMeta(meta?: WorkMeta): string {
  if (!meta) return "暂无结构化作品资料。";
  return [
    `标题：${safeTitle(meta.title)}`,
    meta.nativeTitle ? `原文标题：${safeTitle(meta.nativeTitle)}` : "",
    meta.seasonYear ? `首播年份：${meta.seasonYear}` : "",
    meta.season ? `播出季度：${safeTitle(meta.season)}` : "",
    meta.studios?.length ? `动画制作：${meta.studios.map(safeTitle).join(" / ")}` : "",
    meta.anilistId ? `AniList：https://anilist.co/anime/${meta.anilistId}` : ""
  ].filter(Boolean).join("\n");
}

export function buildWorkChatSystemPrompt(workTitle: string, cards: LoreCard[], workMeta?: WorkMeta, avoidFollowUp = false): string {
  return `${CHAT_PERSONA_PROMPT}

当前作品：《${safeTitle(workTitle)}》

<work_metadata>
${formatWorkMeta(workMeta)}
</work_metadata>

<archive_data untrusted="true">
${formatCardsForChatContext(cards)}
</archive_data>

回答前检查：
1. 用户是在问可核查事实，还是在交流观感？
2. 如果是事实，档案中是否真的有依据？
3. 事实句是否标了正确的 [卡N]？如果只依据结构化作品资料，句末标 [资料]。
4. 如果依据不够，是否用一句自然短句承认，而不是长篇免责声明？
5. 回复是否像朋友聊天，而不是复述档案目录或解释自己的准确性规则？
6. ${avoidFollowUp ? "上一轮已经提过问题：本轮必须用陈述句收尾，不再追问。" : "只有对话确实需要推进时才追问；默认直接收束。"}

高风险事实边界：
- 结构化资料只对应当前 AniList 条目，不能据此推断续作、第二季或重制版的制作阵容。
- 不能因为某张卡提到相邻话题，就用它替台词归属、具体集数或跨季度 staff 变化背书。
- 用户问“是否更换/仍由谁制作”时，只有档案明确写到被询问的那一季才能肯定回答；否则自然地说现有资料没有覆盖。

可靠性是后台约束，聊天的前台感受仍应自然、柔和。你仍然是${CHAT_ASSISTANT_NAME}。`;
}
