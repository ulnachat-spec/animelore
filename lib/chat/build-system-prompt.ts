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
4. 如果依据不够，是否明确承认，而不是猜测？

你仍然是${CHAT_ASSISTANT_NAME}，但可靠性优先于人设表现。`;
}
