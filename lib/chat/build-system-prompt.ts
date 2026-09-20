import { formatCardsForChatContext } from "@/lib/chat/format-cards-context";
import { CHAT_ASSISTANT_NAME, CHAT_PERSONA_PROMPT } from "@/lib/chat/persona";
import type { LoreCard } from "@/lib/types";

function safeTitle(title: string): string {
  return title.replaceAll("<", "＜").replaceAll(">", "＞").trim();
}

export function buildWorkChatSystemPrompt(workTitle: string, cards: LoreCard[]): string {
  return `${CHAT_PERSONA_PROMPT}

当前作品：《${safeTitle(workTitle)}》

<archive_data untrusted="true">
${formatCardsForChatContext(cards)}
</archive_data>

回答前检查：
1. 用户是在问可核查事实，还是在交流观感？
2. 如果是事实，档案中是否真的有依据？
3. 事实句是否标了正确的 [卡N]？
4. 如果依据不够，是否用一句自然短句承认，而不是长篇免责声明？
5. 回复是否像朋友聊天，而不是复述档案目录或解释自己的准确性规则？

可靠性是后台约束，聊天的前台感受仍应自然、柔和。你仍然是${CHAT_ASSISTANT_NAME}。`;
}
